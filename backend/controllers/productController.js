// backend/controllers/productController.js

const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Review = require('../models/reviewModel');
const RoappCategory = require('../models/RoappCategory');
const allBadWords = require('../config/profanity');

const TYPE_KEYS = {
  consoles: [
    'консол',
    'приставк',
    'console',
    'playstation 5',
    'ps5',
    'playstation 4',
    'ps4',
    'xbox series',
    'steam deck',
  ],
  games: [
    'гра',
    'ігри',
    'игра',
    'game',
    'диск',
    'disc',
    'blu-ray',
    'картридж',
    'cartridge',
    'для playstation',
    'для xbox',
    'for ps4',
    'for ps5',
    'for xbox',
  ],
  accs: [
    'аксесуар',
    'accessory',
    'геймпад',
    'контролер',
    'джойстик',
    'controller',
    'dualsense',
    'dualshock',
    'joy-con',
    'headset',
    'кабел',
    'заряд',
    'dock',
    'чохол',
    'glass',
    'клавіатур',
    'миш',
    'mouse',
    'adapter',
    'hub',
    'stand',
    'кріплен',
  ],
};

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

// ---------- Отримання товарів ----------
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
  const skip = (page - 1) * limit;
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

    // шукаємо всі категорії, для яких:
    //  - roappId === idNum (сама категорія)
    //  - або в path міститься idNum (дочірні)
    const cats = await RoappCategory.find({
      $or: [{ roappId: idNum }, { path: idNum }],
      type: 'product',
    }).select('roappId');

    let ids = cats.map((c) => c.roappId);
    if (!ids.includes(idNum)) ids.push(idNum);

    if (ids.length > 0) {
      // 🔥 фільтруємо по roappCategoryId (який ми зберегли в syncProducts)
      queryConditions.push({ roappCategoryId: { $in: ids } });
    } else {
      // fallback на стару логіку по назві (якщо раптом що)
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

  const query = queryConditions.length > 0 ? { $and: queryConditions } : {};

  // Сортування
  let sortQuery = {};
  if (search) {
    sortQuery = { score: { $meta: 'textScore' } };
  } else {
    switch (sort) {
      case 'price-asc':
        sortQuery = { price: 1 };
        break;
      case 'price-desc':
        sortQuery = { price: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { createdAtRoapp: -1 };
        break;
    }
  }

  const projection = search ? { score: { $meta: 'textScore' } } : {};

  const products = await Product.find(query, projection)
    .sort(sortQuery)
    .limit(limit)
    .skip(skip);

  const total = await Product.countDocuments(query);

  res.json({
    products: products.map((p) => ({ ...p.toObject(), _id: p.roappId })),
    total,
  });
});

// ---------- Один товар ----------
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne({ roappId: id });
  if (product) {
    res.json({ ...product.toObject(), id: product.roappId, _id: product.roappId });
  } else {
    res.status(404);
    throw new Error('Товар не знайдено');
  }
});

// ---------- Відгуки ----------
const getProductReviews = asyncHandler(async (req, res) => {
  const { id: roappId } = req.params;
  const reviews = await Review.find({ roappId }).sort({ createdAt: -1 });
  res.json(
    reviews.map((review) => ({
      id: review._id,
      author: review.authorName,
      rating: review.rating,
      text: review.text,
      createdAt: review.createdAt,
    }))
  );
});

const createProductReview = asyncHandler(async (req, res) => {
  const { id: roappId } = req.params;
  const { rating, text } = req.body;
  const { id: authorId, name: authorName } = req.user;

  const profanityPattern = new RegExp(allBadWords.join('|'), 'i');
  if (profanityPattern.test(text)) {
    res.status(400);
    throw new Error('Ваш відгук містить неприпустиму лексику.');
  }

  const product = await Product.findOne({ roappId });
  if (!product) {
    res.status(404);
    throw new Error('Товар, на який ви намагаєтесь залишити відгук, не знайдено.');
  }

  const review = new Review({
    roappId,
    authorId,
    authorName,
    rating,
    text,
    productName: product.name,
    productImage: product.image || '/assets/bitzone-logo1.png',
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
