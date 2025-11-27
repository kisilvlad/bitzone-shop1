// backend/services/syncService.js

const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const User = require('../models/User');
const { syncRoappCategories } = require('./roappCategoryService');

// ===================== ROAPP API КЛІЄНТ =====================

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

// ===================== ДОПОМОЖНІ =====================

/**
 * Повертає масив ID складів, з яких потрібно брати залишки.
 *   ROAPP_WAREHOUSE_IDS=1,2,3
 *   або fallback на ROAPP_WAREHOUSE_ID
 */
const getWarehouseIdsFromEnv = () => {
  const multiple = process.env.ROAPP_WAREHOUSE_IDS;
  if (multiple) {
    return multiple
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const single = process.env.ROAPP_WAREHOUSE_ID;
  if (single) return [single];

  console.warn(
    '⚠️ Не вказано ROAPP_WAREHOUSE_IDS або ROAPP_WAREHOUSE_ID — залишки зі складів не будуть синхронізовані.'
  );
  return [];
};

/**
 * Отримати карту залишків по ВСІХ складах:
 *  key: product_id (Number)
 *  value: сумарна кількість (Number)
 *
 * Використовує офіційний ендпоінт:
 *   GET https://api.roapp.io/warehouse/goods/{warehouse_id}
 * (Get Stock у розділі Inventory) :contentReference[oaicite:1]{index=1}
 */
const fetchRoappStockMap = async () => {
  const warehouseIds = getWarehouseIdsFromEnv();

  if (!warehouseIds.length) {
    return {};
  }

  const stockMap = {};

  for (const wid of warehouseIds) {
    console.log(`🔄 [ROAPP] Завантажую залишки зі складу warehouse_id=${wid}...`);

    try {
      const res = await roappApi.get(`/warehouse/goods/${wid}`);

      // У документації Get Stock сказано, що ендпоінт повертає
      // "list of products and their stock balances for a given warehouse".
      // Формат може бути:
      //  - масив
      //  - або об'єкт із полем data / results
      const raw = res.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.results)
        ? raw.results
        : [];

      console.log(
        `   ✅ [ROAPP] Склад ${wid}: отримано ${items.length} позицій залишків.`
      );

      for (const item of items) {
        // Product ID: підстраховуємося по різних ключах
        const productId =
          item.product_id ||
          item.productId ||
          (item.product && (item.product.id || item.product.pk)) ||
          item.id;

        if (!productId) continue;

        // Кількість на складі: також підстраховуємося
        const qtyRaw =
          item.balance ??
          item.qty ??
          item.quantity ??
          item.stock ??
          item.on_hand ??
          item.onHand ??
          0;

        const qty = Number(qtyRaw) || 0;
        const key = Number(productId);

        if (!stockMap[key]) stockMap[key] = 0;
        stockMap[key] += qty; // 🔥 сумуємо по складах
      }
    } catch (error) {
      console.error(
        `❌ [ROAPP] Не вдалося отримати залишки зі складу warehouse_id=${wid}:`,
        error.message
      );
      if (error.response?.data) {
        console.error(
          '[ROAPP] Відповідь API:',
          JSON.stringify(error.response.data, null, 2)
        );
      }
    }
  }

  console.log(
    `✅ [ROAPP] Сумарна карта залишків по складах: ${Object.keys(stockMap).length} товарів.`
  );

  return stockMap;
};

// ===================== СИНХ ЮЗЕРІВ =====================

const syncUserToRoapp = async (user) => {
  console.log(`🔄 Починаємо синхронізацію нового користувача до RoApp: ${user.email}`);

  try {
    const payload = {
      name: user.name || 'Клієнт BitZone',
      phone: user.phone || '',
      email: user.email,
    };

    const response = await roappApi.post('clients/', payload);

    if (response.data && response.data.id) {
      const roappClientId = response.data.id;
      user.roappClientId = roappClientId;
      await user.save();
      console.log(`✅ Користувача синхронізовано до RoApp. roappClientId = ${roappClientId}`);
    } else {
      console.warn(
        '⚠️ Відповідь RoApp при створенні клієнта не містить ID. response.data =',
        response.data
      );
    }
  } catch (error) {
    console.error(`❌ Помилка синхронізації користувача ${user.email} з RoApp.`);
    if (error.response && error.response.data) {
      console.error('RoApp API Error:', error.response.data);
    } else {
      console.error('Unknown sync error:', error.message);
    }
  }
};

// ===================== СИНХ КАТЕГОРІЙ =====================

const syncCategories = async () => {
  console.log('🔄 [SYNC] Запуск syncCategories()...');
  try {
    await syncRoappCategories({ includeServiceCategories: false });
    console.log('✅ [SYNC] Категорії успішно синхронізовано (RoappCategory + Category).');
  } catch (err) {
    console.error('❌ [SYNC] Помилка під час синхронізації категорій:', err.message);
  }
};

// ===================== СИНХ ТОВАРІВ =====================

const syncProducts = async () => {
  console.log('🔄 [ROAPP] Початок повної синхронізації товарів...');

  let page = 1;
  let hasMore = true;
  const allProducts = [];

  // 1) Спочатку тягнемо сумарні залишки по всіх складах
  const stockMap = await fetchRoappStockMap(); // { [productId]: totalQty }

  try {
    // 2) Тягнемо всі продукти по сторінках
    while (hasMore) {
      const response = await roappApi.get('products/', { params: { page } });
      const productsFromPage = response.data?.data || [];

      if (productsFromPage.length > 0) {
        allProducts.push(...productsFromPage);
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ [ROAPP] Отримано ${allProducts.length} товарів з ROAPP.`);

    if (allProducts.length === 0) return;

    // 3) Формуємо bulk-операції
    const bulkOps = await Promise.all(
      allProducts.map(async (p) => {
        // Головне фото
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
            console.error(`Не вдалося згенерувати LQIP для товару ${p.id}: ${e.message}`);
          }
        }

        // Категорія з RoApp
        const roappCategoryId =
          p.category?.id ?? p.category?.pk ?? p.category?.roapp_id ?? null;

        // Ціна — беремо першу позитивну із p.prices
        const firstPrice =
          p.prices && typeof p.prices === 'object'
            ? Object.values(p.prices).find((price) => price > 0) || 0
            : 0;

        // 🔥 Сумарний залишок по всіх складах.
        // Якщо продукт не зустрічається в stockMap — вважаємо, що 0.
        const totalStockQty = Number(stockMap[p.id] ?? 0);

        const productData = {
          roappId: p.id,
          name: p.title,
          price: firstPrice,
          category: p.category ? p.category.title : 'Різне',
          roappCategoryId,
          description: p.description || '',
          image: imageUrl,
          images:
            Array.isArray(p.images) && p.images.length > 0
              ? p.images.map((img) => img.image)
              : [],
          stock: totalStockQty,      // 🔑 використовуємо це поле у сортуванні
          roappStockQty: totalStockQty,
          isInStock: totalStockQty > 0,
          createdAtRoapp: p.created_at ? new Date(p.created_at) : undefined,
          lqip,
          specs: p.custom_fields ? Object.values(p.custom_fields).filter(Boolean) : [],
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

    // 🔥 Видаляємо з локальної бази ті товари, яких більше немає в ROAPP
    const allRoappIds = allProducts.map((p) => p.id);
    if (allRoappIds.length > 0) {
      const deleteResult = await Product.deleteMany({
        roappId: { $nin: allRoappIds },
      });
      console.log(
        `   - Видалено локальних товарів, відсутніх у ROAPP: ${
          deleteResult.deletedCount || 0
        }`
      );
    }

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

// ===================== ЗАГАЛЬНИЙ СИНХ (категорії + товари) =====================

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
