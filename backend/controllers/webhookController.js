// backend/controllers/webhookController.js
const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const axios = require('axios');
const sharp = require('sharp');

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    'accept': 'application/json',
    'authorization': `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

/**
 * Оновлює або створює ОДИН товар у нашій локальній MongoDB.
 */
const syncSingleProduct = async (productId) => {
  try {
    console.log(`[Webhook] Синхронізація одного товару з roappId: ${productId}`);
    const { data: p } = await roappApi.get(`products/${productId}`);

    const imageUrl = p.images.length > 0 ? p.images[0].image : null;
    let lqip = null;

    if (imageUrl) {
      try {
        const imageResponse = await axios({ url: imageUrl, responseType: 'arraybuffer' });
        const lqipBuffer = await sharp(imageResponse.data)
          .resize(20).blur(2).jpeg({ quality: 50 }).toBuffer();
        lqip = `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
      } catch (e) {
        console.error(`[Webhook] Не вдалося згенерувати LQIP для ${p.id}: ${e.message}`);
      }
    }

    const productData = {
      roappId: p.id,
      name: p.title,
      price: Object.values(p.prices).find((price) => price > 0) || 0,
      category: p.category ? p.category.title : 'Різне',
      image: imageUrl,
      images: p.images.map((img) => img.image),
      stock: p.is_serial && p.sernum_codes ? p.sernum_codes.length : p.is_serial ? 0 : 1,
      createdAtRoapp: p.created_at,
      lqip,
    };

    await Product.updateOne({ roappId: p.id }, { $set: productData }, { upsert: true });
    console.log(`[Webhook] Успішно синхронізовано товар: ${p.title}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      await Product.deleteOne({ roappId: productId });
      console.log(`[Webhook] Видалено товар з roappId: ${productId} з локальної БД.`);
    } else {
      console.error(`[Webhook] Помилка синхронізації одного товару ${productId}:`, error.message);
    }
  }
};

/**
 * Синхронізує ОДНУ категорію.
 */
const syncSingleCategory = async (categoryId) => {
    try {
        console.log(`[Webhook] Синхронізація однієї категорії з roappId: ${categoryId}`);
        const { data: cat } = await roappApi.get(`product-categories/${categoryId}`);
        await Category.updateOne({ roappId: cat.id }, { $set: { roappId: cat.id, name: cat.title } }, { upsert: true });
        console.log(`[Webhook] Успішно синхронізовано категорію: ${cat.title}`);
    } catch (error) {
         if (error.response && error.response.status === 404) {
            await Category.deleteOne({ roappId: categoryId });
            console.log(`[Webhook] Видалено категорію з roappId: ${categoryId} з локальної БД.`);
        } else {
            console.error(`[Webhook] Помилка синхронізації однієї категорії ${categoryId}:`, error.message);
        }
    }
}

/**
 * @desc    Обробляє вхідні вебхуки від ROAPP
 * @route   POST /api/webhooks/roapp
 */
const handleRoappWebhook = asyncHandler(async (req, res) => {
  const { event, data } = req.body;
  console.log(`[Webhook] Отримано подію: ${event}`);

  if (data && data.entity_type) {
    const entityId = data.entity_id;
    if (!entityId) {
      return res.status(400).send('Немає entity_id у тілі вебхука');
    }

    if (data.entity_type === 'Product') {
      switch (event) {
        case 'entity.created':
        case 'entity.updated':
          await syncSingleProduct(entityId);
          break;
        case 'entity.deleted':
          await Product.deleteOne({ roappId: entityId });
          console.log(`[Webhook] Видалено товар з roappId: ${entityId} з локальної БД.`);
          break;
        default:
          console.log(`[Webhook] Ігнорована подія товару: ${event}`);
          break;
      }
    }

    if (data.entity_type === 'ProductCategory') {
        switch (event) {
            case 'entity.created':
            case 'entity.updated':
                await syncSingleCategory(entityId);
                break;
            case 'entity.deleted':
                await Category.deleteOne({ roappId: entityId });
                console.log(`[Webhook] Видалено категорію з roappId: ${entityId} з локальної БД.`);
                break;
            default:
                console.log(`[Webhook] Ігнорована подія категорії: ${event}`);
                break;
        }
    }
  }

  res.status(200).send('Webhook received');
});

// --- ВАЖЛИВИЙ ЕКСПОРТ ---
// Переконайтеся, що назва тут `handleRoappWebhook`
module.exports = {
  handleRoappWebhook,
};
