// backend/services/syncService.js

const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const User = require('../models/User');
const { syncRoappCategories } = require('./roappCategoryService'); // 🔥 використовуємо новий сервіс категорій

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

/* ===================== СИНХ КОРИСТУВАЧІВ (як було) ===================== */

const syncUserToRoapp = async (user) => {
  console.log(`🔄 Починаємо синхронізацію нового користувача ${user.email} з Roapp...`);
  try {
    const personData = {
      name: user.name,
      emails: [user.email],
    };

    const response = await roappApi.post('people/', personData);
    const roappUser = response.data.data;

    if (!roappUser || !roappUser.id) {
      throw new Error('Roapp API не повернуло ID користувача.');
    }

    console.log(
      `✅ Користувач ${user.email} успішно синхронізований з Roapp ID: ${roappUser.id}`
    );

    await User.findByIdAndUpdate(user._id, { roappId: roappUser.id });
    console.log(
      `✅ ID ${roappUser.id} збережено для користувача ${user.email} в локальній базі.`
    );
  } catch (error) {
    console.error(`❌ Помилка синхронізації користувача ${user.email} з Roapp.`);
    if (error.response && error.response.data) {
      console.error('Roapp API Error:', error.response.data);
    } else {
      console.error('Unknown sync error:', error.message);
    }
  }
};

/* ===================== СИНХРОНІЗАЦІЯ КАТЕГОРІЙ ===================== */
/**
 * Тут ми просто викликаємо наш новий сервіс syncRoappCategories,
 * який:
 *  - тягне /warehouse/categories/ + (опц.) /services/categories/
 *  - оновлює колекцію RoappCategory (з полем path)
 *  - паралельно створює прості Category для фронтенду (root-и)
 */
const syncCategories = async () => {
  console.log('🔄 [SYNC] Запуск syncCategories()...');
  try {
    await syncRoappCategories({ includeServiceCategories: false });
    console.log('✅ [SYNC] Категорії успішно синхронізовано (RoappCategory + Category).');
  } catch (err) {
    console.error('❌ [SYNC] Помилка під час синхронізації категорій:', err.message);
  }
};

/* ===================== СИНХРОНІЗАЦІЯ ТОВАРІВ ===================== */

const syncProducts = async () => {
  console.log('🔄 [ROAPP] Початок повної синхронізації товарів...');
  let page = 1;
  let hasMore = true;
  const allProducts = [];

  try {
    while (hasMore) {
      const response = await roappApi.get('products/', { params: { page } });
      const productsFromPage = response.data.data;
      if (productsFromPage && productsFromPage.length > 0) {
        allProducts.push(...productsFromPage);
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ [ROAPP] Отримано ${allProducts.length} товарів з ROAPP.`);
    if (allProducts.length === 0) return;

    const bulkOps = await Promise.all(
      allProducts.map(async (p) => {
        const imageUrl =
          Array.isArray(p.images) && p.images.length > 0 ? p.images[0].image : null;

        let lqip = null;
        if (imageUrl) {
          try {
            const imageResponse = await axios({
              url: imageUrl,
              responseType: 'arraybuffer',
            });
            const lqipBuffer = await sharp(imageResponse.data)
              .resize(20)
              .blur(2)
              .jpeg({ quality: 50 })
              .toBuffer();
            lqip = `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
          } catch (e) {
            console.error(`Не вдалося згенерувати LQIP для ${p.id}: ${e.message}`);
          }
        }

        // 🔥 Витягуємо roappCategoryId максимально універсально
        const roappCategoryId =
          p.category?.id ?? p.category?.pk ?? p.category?.roapp_id ?? null;

        const firstPrice =
          p.prices && typeof p.prices === 'object'
            ? Object.values(p.prices).find((price) => price > 0) || 0
            : 0;

        const productData = {
          roappId: p.id,
          name: p.title,
          price: firstPrice,
          category: p.category ? p.category.title : 'Різне',
          roappCategoryId, // 🔥 НОВЕ поле
          description: p.description || '',
          image: imageUrl,
          images:
            Array.isArray(p.images) && p.images.length > 0
              ? p.images.map((img) => img.image)
              : [],
          stock:
            p.is_serial && Array.isArray(p.sernum_codes)
              ? p.sernum_codes.length
              : p.is_serial
              ? 0
              : 1,
          createdAtRoapp: p.created_at ? new Date(p.created_at) : undefined,
          lqip,
          specs: p.custom_fields
            ? Object.values(p.custom_fields).filter(Boolean)
            : [],
        };

        return {
          updateOne: {
            filter: { roappId: p.id },
            update: { $set: productData },
            upsert: true,
          },
        };
      })
    );

    const result = await Product.bulkWrite(bulkOps);
    console.log('✅ [ROAPP] Синхронізацію товарів завершено!');
    console.log(`   - Створено нових: ${result.upsertedCount || 0}`);
    console.log(`   - Оновлено існуючих: ${result.modifiedCount || 0}`);
  } catch (error) {
    console.error(
      '❌ Помилка під час повної синхронізації товарів:',
      error.message,
      error.stack
    );
  }
};

const runSync = async () => {
  await syncCategories();
  await syncProducts();
};

// Запуск при старті сервера
runSync();

// Крон (кожні 15 хв)
cron.schedule('*/15 * * * *', () => {
  console.log('⏰ Запуск планової синхронізації...');
  runSync();
});

module.exports = {
  syncUserToRoapp,
  runSync,
};
