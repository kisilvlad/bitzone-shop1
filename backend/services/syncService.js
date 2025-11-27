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

// ===================== ДОПОМОЖНІ ФУНКЦІЇ =====================

/**
 * Отримати список ID складів з .env
 *
 * ROAPP_WAREHOUSE_IDS=123,456
 * або fallback:
 * ROAPP_WAREHOUSE_ID=123
 */
const getWarehouseIdsFromEnv = () => {
  const multiple = process.env.ROAPP_WAREHOUSE_IDS;
  if (multiple) {
    const arr = multiple
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (arr.length) {
      return arr;
    }
  }

  const single = process.env.ROAPP_WAREHOUSE_ID;
  if (single) {
    return [single.trim()];
  }

  console.warn(
    '⚠️ ROAPP_WAREHOUSE_IDS/ROAPP_WAREHOUSE_ID не задані — залишки зі складів не будуть синхронізовані.'
  );
  return [];
};

/**
 * Отримати карту залишків з RoApp по ВСІХ складах:
 *   key: product_id (Number)
 *   value: СУМА залишків по складах (Number)
 *
 * Використовує офіційний метод Get Stock:
 *   GET /warehouse/goods/{warehouse_id}
 *
 * ❗ На відміну від попередньої версії:
 *   - ми викликаємо його з параметром ids[] (batchами),
 *   - тільки для тих productIds, які реально існують в Roapp.
 *
 * Якщо нічого не вийшло / помилка — повертає null,
 * щоб ми не обнуляли stock в БД.
 */
const fetchRoappStockMap = async (productIds = []) => {
  const warehouseIds = getWarehouseIdsFromEnv();

  if (!warehouseIds.length) {
    return null;
  }

  if (!productIds.length) {
    console.warn(
      '[ROAPP] fetchRoappStockMap викликано без productIds — пропускаємо оновлення stock.'
    );
    return null;
  }

  const stockMap = {};
  const chunkSize = 50; // скільки id відправляємо за раз у ids[]

  for (const wid of warehouseIds) {
    console.log(`🔄 [ROAPP] Get Stock для складу warehouse_id=${wid}...`);

    for (let i = 0; i < productIds.length; i += chunkSize) {
      const chunk = productIds.slice(i, i + chunkSize);

      try {
        // За докою: GET /warehouse/goods/{warehouse_id}
        // з підтримкою ids[]
        const res = await roappApi.get(`/warehouse/goods/${wid}`, {
          params: {
            ids: chunk, // axios зробить ids[]=1&ids[]=2 ...
            exclude_zero_residue: false,
          },
        });

        const raw = res.data;

        // У різних акаунтів структура може бути:
        //   - масивом
        //   - або об'єктом з .data / .results
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.results)
          ? raw.results
          : [];

        console.log(
          `   ✅ [ROAPP] Склад ${wid}: отримано ${items.length} записів залишків для batch'а з ${chunk.length} ids.`
        );

        for (const item of items) {
          // Підбираємо можливі поля ID товару
          const productId =
            item.product_id ||
            item.productId ||
            (item.product && (item.product.id || item.product.pk)) ||
            item.id;

          if (!productId) continue;

          // Підбираємо можливі поля кількості
          const qtyRaw =
            item.balance ??
            item.qty ??
            item.quantity ??
            item.residue ??
            item.stock ??
            item.on_hand ??
            item.onHand ??
            0;

          const qty = Number(qtyRaw) || 0;
          const key = Number(productId);

          if (!stockMap[key]) stockMap[key] = 0;
          stockMap[key] += qty; // сумуємо по складах
        }
      } catch (error) {
        console.error(
          `❌ [ROAPP] Помилка Get Stock для складу warehouse_id=${wid}, batch ${i /
            chunkSize + 1}:`,
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
  }

  const keys = Object.keys(stockMap);
  if (!keys.length) {
    console.warn(
      '⚠️ [ROAPP] Get Stock через ids[] не повернув жодного запису по залишкам. ' +
        'Залишки в Mongo НЕ будуть змінені в цьому циклі.'
    );
    return null;
  }

  console.log(
    `✅ [ROAPP] Побудовано карту залишків по складах на ${keys.length} товарів.`
  );

  return stockMap;
};

// ===================== СИНХ ЮЗЕРІВ =====================

const syncUserToRoapp = async (user) => {
  console.log(`🔄 Синхронізація користувача до RoApp: ${user.email}`);

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
    console.log('✅ [SYNC] Категорії синхронізовано (RoappCategory + Category).');
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

  try {
    // 1) тягнемо всі продукти по сторінках
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

    console.log(`✅ [ROAPP] Отримано ${allProducts.length} товарів з RoApp.`);

    if (allProducts.length === 0) return;

    // 2) збираємо всі Roapp product IDs
    const productIds = allProducts.map((p) => p.id);

    // 3) тягнемо сумарні залишки по ВСІХ складах для цих id
    const stockMap = await fetchRoappStockMap(productIds); // { [productId]: totalQty } або null
    const hasStockData = !!(stockMap && Object.keys(stockMap).length > 0);

    if (!hasStockData) {
      console.warn(
        '⚠️ [ROAPP] stockMap порожній — поточний sync НЕ буде змінювати поля stock/isInStock.'
      );
    }

    // 4) bulk-операції для Mongo
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

        // Ціна — беремо першу позитивну із p.prices (як і раніше)
        const firstPrice =
          p.prices && typeof p.prices === 'object'
            ? Object.values(p.prices).find((price) => price > 0) || 0
            : 0;

        // Базові дані товару
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
          createdAtRoapp: p.created_at ? new Date(p.created_at) : undefined,
          lqip,
          specs: p.custom_fields ? Object.values(p.custom_fields).filter(Boolean) : [],
        };

        // 5) оновлення stock ТІЛЬКИ якщо є коректні дані з Get Stock
        if (hasStockData) {
          const totalStockQty = Number(stockMap[p.id] ?? 0); // якщо немає в Map — 0

          productData.stock = totalStockQty;
          productData.roappStockQty = totalStockQty;
          productData.isInStock = totalStockQty > 0;
        }

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

    // 6) Видаляємо з локальної бази товари, яких більше немає в RoApp
    const allRoappIds = allProducts.map((p) => p.id);
    if (allRoappIds.length > 0) {
      const deleteResult = await Product.deleteMany({
        roappId: { $nin: allRoappIds },
      });
      console.log(
        `   - Видалено локальних товарів, відсутніх у RoApp: ${
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

// Крон (кожні 15 хвилин)
cron.schedule('*/15 * * * *', () => {
  console.log('⏰ Запуск планової синхронізації (cron)...');
  runSync();
});

module.exports = {
  syncUserToRoapp,
  runSync,
};
