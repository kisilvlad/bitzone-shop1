// backend/services/syncService.js
// !!! ФІКС: Змінено розклад cron та прибрано миттєвий запуск !!!

const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    'accept': 'application/json',
    'authorization': `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

const syncCategories = async () => {
  console.log('🔄 Початок синхронізації категорій...');
  try {
    const response = await roappApi.get('product-categories/');
    const categoriesFromApi = response.data.data;
    if (!categoriesFromApi || categoriesFromApi.length === 0) {
      console.log('Не знайдено категорій для синхронізації.');
      return;
    }
    const bulkOps = categoriesFromApi.map(cat => ({
      updateOne: {
        filter: { roappId: cat.id },
        update: { $set: { roappId: cat.id, name: cat.title } },
        upsert: true,
      },
    }));
    const result = await Category.bulkWrite(bulkOps);
    console.log(`✅ Синхронізацію категорій завершено! Створено/Оновлено: ${result.upsertedCount + result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Помилка під час синхронізації категорій:', error.message);
  }
};

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
            const imageResponse = await axios({ url: imageUrl, responseType: 'arraybuffer' });
            const lqipBuffer = await sharp(imageResponse.data).resize(20).blur(2).jpeg({ quality: 50 }).toBuffer();
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
          stock: p.is_serial && p.sernum_codes ? p.sernum_codes.length : p.is_serial ? 0 : 1,
          createdAtRoapp: p.created_at,
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
    console.log('✅ Синхронізацію товарів завершено!');
    console.log(`   - Створено нових: ${result.upsertedCount}`);
    console.log(`   - Оновлено існуючих: ${result.modifiedCount}`);
  } catch (error) {
    console.error('❌ Помилка під час повної синхронізації товарів:', error.message, error.stack);
  }
};

const runSync = async () => {
    await syncCategories();
    await syncProducts();
}

// runSync(); // <-- !!! ФІКС №1: Ми КОМЕНТУЄМО цей рядок, щоб сервер стартував миттєво.

// !!! ФІКС №2: Ми змінюємо розклад на "раз на добу о 3:00 ночі"
cron.schedule('0 3 * * *', () => {
  console.log('⏰ Запуск планової ДОБОВОЇ синхронізації...');
  runSync();
});