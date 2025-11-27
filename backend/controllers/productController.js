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

  // ===== 2. Категорія + Тип + Платформи через RoappCategory =====
  let allowedCategoryIds = null; // Set | null
  const needCategoryFilters = categoryId || types || platforms;

  if (needCategoryFilters) {
    // 2.0. Тягнемо всі активні продуктні категорії з Roapp
    const roappCategories = await RoappCategory.find({
      type: 'product',
      isActive: true,
    }).lean();

    const allCategoryIds = new Set(roappCategories.map((c) => c.roappId));

    const intersectSets = (current, next) => {
      if (!next || next.size === 0) return new Set();
      if (!current) return new Set(next);
      const result = new Set();
      current.forEach((id) => {
        if (next.has(id)) result.add(id);
      });
      return result;
    };

    // Початково дозволяємо всі категорії
    allowedCategoryIds = new Set(allCategoryIds);

    // 2.1. Фільтр по конкретній категорії (враховуємо все піддерево)
    if (categoryId) {
      const idNum = Number(categoryId);
      const subtreeIds = new Set();

      roappCategories.forEach((cat) => {
        const path = Array.isArray(cat.path) ? cat.path : [];
        if (cat.roappId === idNum || path.includes(idNum)) {
          subtreeIds.add(cat.roappId);
        }
      });

      if (subtreeIds.size > 0) {
        allowedCategoryIds = intersectSets(allowedCategoryIds, subtreeIds);
      } else {
        // fallback по назві, якщо щось пішло не так
        const category = await Category.findOne({ roappId: categoryId });
        if (category) {
          queryConditions.push({ category: new RegExp(`^${category.name}$`, 'i') });
        }
      }
    }

    // 2.2. Базові категорії для типів та платформ (по назвах)
    const baseTypeIds = {
      consoles: new Set(),
      games: new Set(),
      accs: new Set(),
    };
    const basePlatformIds = {
      sony: new Set(),
      xbox: new Set(),
      nintendo: new Set(),
      steamdeck: new Set(),
    };

    roappCategories.forEach((cat) => {
      const name = (cat.name || '').toLowerCase();

      // Типи
      Object.entries(TYPE_KEYS).forEach(([typeKey, keys]) => {
        if (keys.some((k) => name.includes(k))) {
          baseTypeIds[typeKey].add(cat.roappId);
        }
      });

      // Платформи
      Object.entries(PLATFORM_KEYS).forEach(([platKey, keys]) => {
        if (keys.some((k) => name.includes(k))) {
          basePlatformIds[platKey].add(cat.roappId);
        }
      });
    });

    // 2.3. Розширюємо базові типи/платформи на всі підкатегорії через path
    const typeBuckets = {
      consoles: new Set(),
      games: new Set(),
      accs: new Set(),
    };
    const platformBuckets = {
      sony: new Set(),
      xbox: new Set(),
      nintendo: new Set(),
      steamdeck: new Set(),
    };

    roappCategories.forEach((cat) => {
      const pathIds = [...(Array.isArray(cat.path) ? cat.path : []), cat.roappId];

      // Типи
      Object.keys(TYPE_KEYS).forEach((typeKey) => {
        const baseSet = baseTypeIds[typeKey];
        if (baseSet.size && pathIds.some((id) => baseSet.has(id))) {
          typeBuckets[typeKey].add(cat.roappId);
        }
      });

      // Платформи
      Object.keys(PLATFORM_KEYS).forEach((platKey) => {
        const baseSet = basePlatformIds[platKey];
        if (baseSet.size && pathIds.some((id) => baseSet.has(id))) {
          platformBuckets[platKey].add(cat.roappId);
        }
      });
    });

    // 2.4. Фільтр по Типу (consoles/games/accs)
    if (types) {
      const selectedTypes = types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const typeIdsUnion = new Set();
      selectedTypes.forEach((t) => {
        const bucket = typeBuckets[t];
        if (bucket) bucket.forEach((id) => typeIdsUnion.add(id));
      });

      if (typeIdsUnion.size === 0) {
        return res.json({ products: [], total: 0 });
      }

      allowedCategoryIds = intersectSets(allowedCategoryIds, typeIdsUnion);
    }

    // 2.5. Фільтр по Платформі (sony/xbox/nintendo/steamdeck)
    if (platforms) {
      const selectedPlatforms = platforms
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const platformIdsUnion = new Set();
      selectedPlatforms.forEach((p) => {
        const bucket = platformBuckets[p];
        if (bucket) bucket.forEach((id) => platformIdsUnion.add(id));
      });

      if (platformIdsUnion.size === 0) {
        return res.json({ products: [], total: 0 });
      }

      allowedCategoryIds = intersectSets(allowedCategoryIds, platformIdsUnion);
    }

    // 2.6. Фінальний фільтр по roappCategoryId
    if (allowedCategoryIds && allowedCategoryIds.size > 0) {
      queryConditions.push({ roappCategoryId: { $in: Array.from(allowedCategoryIds) } });
    } else if (allowedCategoryIds && allowedCategoryIds.size === 0) {
      return res.json({ products: [], total: 0 });
    }
  }

  // 3. Пошук
  if (search) {
    queryConditions.push({ $text: { $search: search } });
  }

  const match = queryConditions.length > 0 ? { $and: queryConditions } : {};

  // 🔢 Загальна кількість (для пагінації)
  const total = await Product.countDocuments(match);

  // ---------- Сортування ----------
  //  1) Спершу isOutOfStock (0 -> є, 1 -> немає)
  //  2) Якщо search — textScore, інакше price/name/createdAtRoapp
  const sortStage = {
    isOutOfStock: 1,
  };

  if (search) {
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
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
  ];

  const products = await Product.aggregate(pipeline);

  res.json({
    products: products.map((p) => ({
      ...p,
      _id: p.roappId, // як і раніше — фронт заточений під це
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
