// backend/services/syncService.js
// 🔁 Повна синхронізація з ROAPP: користувачі, категорії, товари

const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');

const Product = require('../models/productModel');
const User = require('../models/User');

// Категорії тепер синхронізуємо через окремий сервіс, який працює з RoappCategory + Category
const { syncRoappCategories } = require('../services/roappCategoryService');

// Базовий клієнт для ROAPP
const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

/* ============================================================
   1. СИНХРОНІЗАЦІЯ НОВОГО КОРИСТУВАЧА В ROAPP (як було)
   Викликається з User.js (post('save')).
============================================================ */

const syncUserToRoapp = async (user) => {
  console.log(`🔄 [ROAPP] Починаємо синхронізацію нового користувача ${user.email}...`);
  try {
    const personData = {
      name: user.name,
      // ✅ ВАЖЛИВО: поле повинно бути "emails", а не "email"
      emails: [user.email],
      // Якщо є телефон:
      // phones: user.phone ? [user.phone] : []
    };

    const response = await roappApi.post('people/', personData);
    const roappUser = response.data?.data || response.data;

    if (!roappUser || !roappUser.id) {
      throw new Error('ROAPP не повернув поле id для користувача');
    }

    console.log(`✅ [ROAPP] Користувач ${user.email} створений в ROAPP з ID=${roappUser.id}`);

    await User.findByIdAndUpdate(user._id, { roappId: roappUser.id });
    console.log(`✅ [Mongo] Збережено roappId=${roappUser.id} для ${user.email}`);
  } catch (error) {
    console.error(`❌ [ROAPP] Помилка синхронізації користувача ${user.email}`);

    if (error.response?.data) {
      console.error('ROAPP API response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }

    // НЕ кидаємо помилку далі, щоб реєстрація на сайті не падала
  }
};

/* ============================================================
   2. СИНХРОНІЗАЦІЯ КАТЕГОРІЙ
   Використовуємо сервіс roappCategoryService (endpoint:
   GET https://api.roapp.io/warehouse/categories/)
============================================================ */

const syncCategories = async () => {
  console.log('🔄 [ROAPP] Початок синхронізації категорій...');
  try {
    // тягнемо тільки продуктові категорії (service можна включити пізніше)
    await syncRoappCategories({ includeServiceCategories: false });
    console.log('✅ [ROAPP] Синхронізацію категорій завершено успішно');
  } catch (err) {
    console.error('❌ [ROAPP] Помилка під час синхронізації категорій:', err.message);
    if (err.response?.data) {
      console.error('ROAPP response:', JSON.stringify(err.response.data, null, 2));
    }
  }
};

/* ============================================================
   3. СИНХРОНІЗАЦІЯ ТОВАРІВ
   GET https://api.roapp.io/products/
============================================================ */

const syncProducts = async () => {
  console.log('🔄 [ROAPP] Початок повної синхронізації товарів...');
  let page = 1;
  let hasMore = true;
  const allProducts = [];

  try {
    // --- 3.1. Тягнемо всі сторінки товарів з ROAPP ---
    while (hasMore) {
      const resp = await roappApi.get('products/', { params: { page } });
      const data = resp.data?.data || resp.data?.results || resp.data || [];
      const productsFromPage = Array.isArray(data) ? data : [];

      if (productsFromPage.length > 0) {
        allProducts.push(...productsFromPage);
        page += 1;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ [ROAPP] Отримано ${allProducts.length} товарів`);

    if (!allProducts.length) return;

    // --- 3.2. Формуємо bulk-операції для Mongo ---
    const bulkOps = [];

    for (const p of allProducts) {
      const images = Array.isArray(p.images) ? p.images : [];
      const imageUrl = images.length > 0 ? images[0].image : null;

      let lqip = null;
      if (imageUrl) {
        try {
          const imageResponse = await axios({
            url: imageUrl,
            responseType: 'arraybuffer',
            timeout: 15000,
          });

          const lqipBuffer = await sharp(imageResponse.data)
            .resize(20)
            .blur(2)
            .jpeg({ quality: 50 })
            .toBuffer();

          lqip = `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
        } catch (e) {
          console.error(`⚠️ [LQIP] Не вдалося згенерувати LQIP для ${p.id}: ${e.message}`);
        }
      }

      const pricesObj = p.prices || {};
      const firstPrice = Object.values(pricesObj).find((price) => typeof price === 'number' && price > 0) || 0;

      const productData = {
        roappId: p.id,
        name: p.title,
        price: firstPrice,
        category: p.category?.title || p.category?.name || 'Різне',
        description: p.description || '',
        image: imageUrl,
        images: images.map((img) => img.image).filter(Boolean),
        stock: p.is_serial
          ? (Array.isArray(p.sernum_codes) ? p.sernum_codes.length : 0)
          : 1,
        createdAtRoapp: p.created_at || p.createdAt || new Date(),
        lqip,
        specs: p.custom_fields
          ? Object.values(p.custom_fields).filter(Boolean)
          : [],
      };

      bulkOps.push({
        updateOne: {
          filter: { roappId: p.id },
          update: { $set: productData },
          upsert: true,
        },
      });
    }

    console.log(`🧾 [Mongo] Готуємо bulkWrite з ${bulkOps.length} операцій...`);

    // --- 3.3. Щоб не ловити "Socket 'secureConnect' timed out", ріжемо на батчі ---
    const chunkSize = 200; // можна збільшити/зменшити при потребі
    let totalInserted = 0;
    let totalModified = 0;

    for (let i = 0; i < bulkOps.length; i += chunkSize) {
      const slice = bulkOps.slice(i, i + chunkSize);
      try {
        const result = await Product.bulkWrite(slice, { ordered: false });
        totalInserted += result.upsertedCount || 0;
        totalModified += result.modifiedCount || 0;
        console.log(
          `   ➕ batch ${i / chunkSize + 1}: inserted=${result.upsertedCount || 0}, modified=${result.modifiedCount || 0}`
        );
      } catch (batchErr) {
        console.error('❌ [Mongo] Помилка в batch bulkWrite:', batchErr.message);
      }
    }

    console.log('✅ [Mongo] Синхронізацію товарів завершено!');
    console.log(`   - Створено нових: ${totalInserted}`);
    console.log(`   - Оновлено існуючих: ${totalModified}`);
  } catch (error) {
    console.error('❌ [ROAPP] Помилка під час повної синхронізації товарів:', error.message);
    if (error.response?.data) {
      console.error('ROAPP response:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

/* ============================================================
   4. ГОЛОВНА ФУНКЦІЯ СИНХРОНІЗАЦІЇ
============================================================ */

const runSync = async () => {
  await syncCategories();
  await syncProducts();
};

// 🔁 Запускаємо при старті сервера
runSync().catch((e) => {
  console.error('❌ [SYNC] Помилка при стартовій синхронізації:', e.message);
});

// ⏰ Крон: кожні 15 хвилин
cron.schedule('*/15 * * * *', () => {
  console.log('⏰ [CRON] Запуск планової синхронізації...');
  runSync().catch((e) => {
    console.error('❌ [CRON] Помилка у плановій синхронізації:', e.message);
  });
});

module.exports = {
  syncUserToRoapp,
  runSync,
};
