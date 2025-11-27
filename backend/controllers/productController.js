// backend/controllers/productController.js

const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');
const RoappCategory = require('../models/RoappCategory');
const allBadWords = require('../config/profanity');

// Ключі для визначення типу товару (ігри/консолі/аксесуари)
const TYPE_KEYS = {
  consoles: [
    'консол',
    'приставк',
    'console',
    'playstation 5',
    'ps5',
    'playstation 4',
    'ps4',
    'playstation 3',
    'ps3',
    'xbox',
    'series x',
    'series s',
    'xbox one',
    'xbox 360',
    'nintendo switch',
    'switch oled',
    'steam deck',
    'steamdeck',
  ],
  games: [
    'гра',
    'игра',
    'game',
    'ps5 game',
    'ps4 game',
    'ps3 game',
    'xbox game',
    'switch game',
    'nintendo game',
    'digital code',
    'dlc',
    'key',
    'ключ',
  ],
  accs: [
    'аксесуар',
    'accessory',
    'controller',
    'контролер',
    'геймпад',
    'джойстик',
    'dualshock',
    'dualsense',
    'кабель',
    'кабел',
    'провід',
    ' зарядн',
    'станція',
    'stand',
    'headset',
    'гарнітур',
    'наушники',
  ],
};

// Ключі для визначення платформи (sony/xbox/nintendo/steamdeck)
const PLATFORM_KEYS = {
  sony: ['sony', 'playstation', 'ps5', 'ps4', 'ps3', 'psp', 'ps vita', 'dualsense', 'dualshock'],
  xbox: ['xbox', 'series x', 'series s', 'one', '360'],
  nintendo: ['nintendo', 'switch', 'joy-con', 'wii', 'gamecube', '3ds', 'ds', 'gameboy'],
  steamdeck: ['steam deck', 'steamdeck'],
};

const buildRegex = (keys) => new RegExp(keys.join('|'), 'i');

// ---------- Категорії для вкладки (простий список root) ----------
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({}).sort({ name: 1 });
  res.json(categories.map((cat) => ({ id: cat.roappId, name: cat.name })));
});

// ---------- Отримання товарів (каталог + фільтри) ----------
const getProducts = asyncHandler(async (req, res) => {
  const {
    category: categoryId,
    search,
    page = 1,
    sort,
    minPrice,
    maxPrice,
    types,
    platforms,
  } = req.query;

  const limit = 20;
  const pageNum = Number(page) || 1;
  const skip = (pageNum - 1) * limit;

  const queryConditions = [];

  // 1. Ціна
  const priceFilter = {};
  if (minPrice && !isNaN(parseFloat(minPrice))) priceFilter.$gte = parseFloat(minPrice);
  if (maxPrice && !isNaN(parseFloat(maxPrice))) priceFilter.$lte = parseFloat(maxPrice);
  if (Object.keys(priceFilter).length > 0) {
    queryConditions.push({ price: priceFilter });
  }

  // 2. Категорія (🔥 Враховуємо ВЕСЬ ПІДДЕРЕВО з RoappCategory)
  if (categoryId) {
    const idNum = Number(categoryId);

    const cats = await RoappCategory.find({
      $or: [{ roappId: idNum }, { path: idNum }],
      type: 'product',
    }).select('roappId');

    let ids = cats.map((c) => c.roappId);
    if (!ids.includes(idNum)) ids.push(idNum);

    if (ids.length > 0) {
      queryConditions.push({ roappCategoryId: { $in: ids } });
    } else {
      // fallback по назві, якщо щось піде не так
      const category = await Category.findOne({ roappId: categoryId });
      if (category) {
        queryConditions.push({ category: new RegExp(`^${category.name}$`, 'i') });
      }
    }
  }

  // 3. Пошук
  if (search) {
    queryConditions.push({ $text: { $search: search } });
  }

  // 4. Платформи
  if (platforms) {
    const selectedPlatforms = platforms.split(',');
    const platformIncludeKeywords = selectedPlatforms.flatMap(
      (p) => PLATFORM_KEYS[p] || []
    );
    const platformIncludeRegex = buildRegex(platformIncludeKeywords);
    queryConditions.push({
      $or: [{ name: platformIncludeRegex }, { category: platformIncludeRegex }],
    });

    const allPlatformKeys = Object.keys(PLATFORM_KEYS);
    const platformsToExclude = allPlatformKeys.filter(
      (p) => !selectedPlatforms.includes(p)
    );
    if (platformsToExclude.length > 0) {
      const platformExcludeKeywords = platformsToExclude.flatMap(
        (p) => PLATFORM_KEYS[p] || []
      );
      const platformExcludeRegex = buildRegex(platformExcludeKeywords);
      queryConditions.push({ name: { $not: platformExcludeRegex } });
    }
  }

  // 5. Тип (ігри / консолі / аксесуари)
  if (types) {
    const selectedTypes = types.split(',');
    const typeRegex = buildRegex(selectedTypes.flatMap((type) => TYPE_KEYS[type] || []));

    queryConditions.push({
      $or: [{ name: typeRegex }, { category: typeRegex }],
    });

    if (selectedTypes.includes('consoles') && !selectedTypes.includes('games')) {
      queryConditions.push({ name: { $not: buildRegex(TYPE_KEYS.games) } });
    }
    if (selectedTypes.includes('consoles') && !selectedTypes.includes('accs')) {
      queryConditions.push({ name: { $not: buildRegex(TYPE_KEYS.accs) } });
    }
    if (selectedTypes.includes('games') && !selectedTypes.includes('consoles')) {
      queryConditions.push({
        name: { $not: buildRegex(['консол', 'приставк', 'console']) },
      });
    }
  }

  const match = queryConditions.length > 0 ? { $and: queryConditions } : {};

  // 🔢 Загальна кількість (для пагінації)
  const total = await Product.countDocuments(match);

  // ---------- Сортування ----------
  // Головна ідея:
  //  1) Спершу сортуємо по isOutOfStock (0 -> є в наявності, 1 -> немає)
  //  2) Потім по score (якщо search)
  //  3) Або по price/name/createdAtRoapp – залежно від sort
  const sortStage = {
    isOutOfStock: 1, // головний ключ: завжди спочатку в наявності
  };

  if (search) {
    // При пошуку – перше сортування за textScore, але тільки всередині груп in-stock/out-of-stock
    sortStage.score = { $meta: 'textScore' };
  } else {
    switch (sort) {
      case 'price-asc':
        sortStage.price = 1;
        break;
      case 'price-desc':
        sortStage.price = -1;
        break;
      case 'name-asc':
        sortStage.name = 1;
        break;
      case 'name-desc':
        sortStage.name = -1;
        break;
      case 'oldest':
        sortStage.createdAtRoapp = 1;
        break;
      case 'newest':
      default:
        sortStage.createdAtRoapp = -1;
        break;
    }
  }

  // додатковий tie-breaker, щоб порядок був стабільний
  sortStage._id = 1;

  // ---------- Агрегація з isOutOfStock ----------
  const pipeline = [
    { $match: match },
    {
      $addFields: {
        // 1 = немає в наявності, 0 = є
        isOutOfStock: {
          $cond: [
            { $lte: [{ $ifNull: ['$stock', 0] }, 0] }, // stock <= 0 або null
            1,
            0,
          ],
        },
      },
    },
  ];

  // При пошуку Mongo сам знає про textScore по $text у $match,
  // але ми можемо сортувати по score з $meta у $sort (без окремого поля).
  pipeline.push({ $sort: sortStage });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  const products = await Product.aggregate(pipeline);

  res.json({
    products: products.map((p) => ({
      ...p,
      _id: p.roappId,
    })),
    total,
  });
});

// ---------- Один товар ----------
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const numId = Number(id);

  const product = await Product.findOne({ roappId: numId });
  if (product) {
    res.json({ ...product.toObject(), id: product.roappId, _id: product.roappId });
  } else {
    res.status(404);
    throw new Error('Товар не знайдено');
  }
});

// ---------- Відгуки до товару ----------
const getProductReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const numId = Number(id);

  const reviews = await Review.find({ roappId: numId }).sort({ createdAt: -1 });
  res.json(reviews);
});

// ---------- Створення відгуку ----------
const createProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const numId = Number(id);
  const user = req.user;

  const { rating, comment, pros, cons } = req.body;

  if (!user) {
    res.status(401);
    throw new Error('Необхідна авторизація');
  }

  const ratingNum = Number(rating) || 5;

  // Мінімальна перевірка тексту + анти-мат
  const combinedText = `${comment || ''} ${pros || ''} ${cons || ''}`.toLowerCase();
  const hasBadWord = allBadWords.some((word) => combinedText.includes(word));

  if (hasBadWord) {
    res.status(400);
    throw new Error('Відгук містить неприпустиму лексику. Будь ласка, відредагуйте текст.');
  }

  const product = await Product.findOne({ roappId: numId });
  if (!product) {
    res.status(404);
    throw new Error('Товар не знайдено');
  }

  const review = new Review({
    roappId: numId,
    authorId: user.roappClientId || user._id,
    authorName: user.name || 'Користувач',
    rating: ratingNum,
    comment: (comment || '').trim(),
    pros: (pros || '').trim(),
    cons: (cons || '').trim(),
    productName: product.name,
    productImage: product.image || (Array.isArray(product.images) ? product.images[0] : ''),
  });

  await review.save();
  res
    .status(201)
    .json({ success: true, message: 'Дякуємо! Ваш відгук було опубліковано.' });
});

module.exports = {
  getCategories,
  getProducts,
  getProductById,
  getProductReviews,
  createProductReview,
};
