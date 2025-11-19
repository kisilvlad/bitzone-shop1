// backend/services/syncService.js
// Повністю заміни весь вміст файлу на цей

const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');

const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const User = require('../models/User'); // потрібно для оновлення roappId

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

// ===================================================================
// СИНХРОНІЗАЦІЯ КОРИСТУВАЧІВ З ROAPP
// ===================================================================

/**
 * Синхронізує нового користувача з Roapp.
 * Викликається з "гачка" у моделі User.js під час реєстрації.
 */
const syncUserToRoapp = async (user) => {
  console.log(`🔄 Починаємо синхронізацію нового користувача ${user.email} з ROAPP...`);

  try {
    const personData = {
      name: user.name,
      // ВАЖЛИВО: ROAPP чекає масив emails, а не поле email
      emails: [user.email],
      // Якщо є phone, можна додати:
      // phones: user.phone ? [user.phone] : [],
    };

    // Створюємо Person в ROAPP
    const response = await roappApi.post('people/', personData);
    const roappUser = response.data?.data || response.data;

    if (!roappUser || !roappUser.id) {
      throw new Error('ROAPP API не повернуло ID користувача.');
    }

    console.log(`✅ Користувач ${user.email} синхронізований з ROAPP, id=${roappUser.id}`);

    // Зберігаємо roappId в нашій базі
    await User.findByIdAndUpdate(user._id, { roappId: roappUser.id });
    console.log(`✅ ROAPP ID ${roappUser.id} збережено для користувача ${user.email}`);

  } catch (error) {
    console.error(`❌ Помилка синхронізації користувача ${user.email} з ROAPP.`);

    if (error.response && error.response.data) {
      console.error('ROAPP API Error:', error.response.data);
    } else {
      console.error('Unknown sync error:', error.message);
    }

    // Не кидаємо error далі, щоб реєстрація на сайті не падала
  }
};

// ===================================================================
// СИНХРОНІЗАЦІЯ КАТЕГОРІЙ З ROAPP  (ОНОВЛЕНО)
// ===================================================================

const syncCategories = async () => {
  console.log('🔄 [ROAPP] Початок синхронізації категорій...');

  try {
    // ✅ Правильний endpoint згідно з документацією:
    // GET https://api.roapp.io/warehouse/categories/
    const response = await roappApi.get('/warehouse/categories/');

    const raw = response.data;

    // Підтримуємо декілька можливих форматів відповіді
    const categoriesFromApi = Array.isArray(raw)
      ? raw
      : raw?.results || raw?.data || [];

    if (!categoriesFromApi || categoriesFromApi.length === 0) {
      console.log('⚠️ [ROAPP] Не знайдено категорій для синхронізації.');
      return;
    }

    const bulkOps = [];

    for (const cat of categoriesFromApi) {
      // Підстраховуємося по назвах полів
      const roappId = cat.id ?? cat.pk ?? cat.roapp_id;
      const name = cat.name ?? cat.title ?? cat.label;

      if (!roappId || !name) {
        console.warn('[ROAPP] Категорія без id або name, скіпаю:', cat);
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { roappId },
          update: { $set: { roappId, name } },
          upsert: true,
        },
      });
    }

    if (!bulkOps.length) {
      console.log('⚠️ [ROAPP] Немає валідних категорій для оновлення.');
      return;
    }

    const result = await Category.bulkWrite(bulkOps);
    const created = result.upsertedCount || 0;
    const modified = result.modifiedCount || 0;

    console.log(
      `✅ [ROAPP] Синхронізацію категорій завершено! Створено/оновлено: ${created + modified}`
    );
  } catch (error) {
    console.error('❌ [ROAPP] Помилка під час синхронізації категорій:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('URL:', error.config && error.config.url);
      try {
        console.error(
          'Response:',
          JSON.stringify(error.response.data, null, 2)
        );
      } catch (_) {
        console.error('Response (raw):', error.response.data);
      }
    }
  }
};

// ===================================================================
// СИНХРОНІЗАЦІЯ ТОВАРІВ З ROAPP (твій існуючий код, збережений)
// ===================================================================

const syncProducts = async () => {
  console.log('🔄 Початок повної синхронізації товарів...');
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

    console.log(`✅ Отримано ${allProducts.length} товарів з ROAPP.`);
    if (allProducts.length === 0) return;

    const bulkOps = await Promise.all(
      allProducts.map(async (p) => {
        const imageUrl = p.images.length > 0 ? p.images[0].image : null;
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

        const productData = {
          roappId: p.id,
          name: p.title,
          price: Object.values(p.prices).find((price) => price > 0) || 0,
          category: p.category ? p.category.title : 'Різне',
          description: p.description || '',
          image: imageUrl,
          images: p.images.map((img) => img.image),
          stock: p.is_serial && p.sernum_codes
            ? p.sernum_codes.length
            : p.is_serial ? 0 : 1,
          createdAtRoapp: p.created_at,
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
    console.log('✅ Синхронізацію товарів завершено!');
    console.log(`   - Створено нових: ${result.upsertedCount}`);
    console.log(`   - Оновлено існуючих: ${result.modifiedCount}`);
  } catch (error) {
    console.error(
      '❌ Помилка під час повної синхронізації товарів:',
      error.message,
      error.stack
    );
  }
};

// ===================================================================
// ЗАПУСК СИНХРОНІЗАЦІЇ
// ===================================================================

const runSync = async () => {
  await syncCategories();
  await syncProducts();
};

// Запускаємо при старті сервера
runSync();

// Плановий запуск кожні 15 хвилин
cron.schedule('*/15 * * * *', () => {
  console.log('⏰ Запуск планової синхронізації...');
  runSync();
});

// ===================================================================
// ЕКСПОРТИ
// ===================================================================
module.exports = {
  syncUserToRoapp,
  runSync,
  syncCategories,
  syncProducts,
};
