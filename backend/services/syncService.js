// Це повний вміст файлу backend/services/syncService.js
// Повністю замініть ваш старий код на цей

const mongoose = require('mongoose');
const axios = require('axios');
const sharp = require('sharp');
const cron = require('node-cron');
const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const User = require('../models/User'); // <--- ДОДАНО: Потрібно для оновлення roappId

const roappApi = axios.create({
  baseURL: 'https://api.roapp.io/',
  headers: {
    'accept': 'application/json',
    'authorization': `Bearer ${process.env.ROAPP_API_KEY}`,
  },
});

// ===================================================================
// НОВА ФУНКЦІЯ ДЛЯ РЕЄСТРАЦІЇ КОРИСТУВАЧІВ (Ваше виправлення тут)
// ===================================================================

/**
 * Синхронізує нового користувача з Roapp.
 * Викликається автоматично з "гачка" моделі User.js під час реєстрації.
 */
const syncUserToRoapp = async (user) => {
  console.log(`🔄 Починаємо синхронізацію нового користувача ${user.email} з Roapp...`);
  try {
    // Дані, які ми готуємо для відправки в Roapp
    const personData = {
      name: user.name,
      emails: [user.email] // <--- ОСЬ ЦЕ ВИПРАВЛЕННЯ (було 'email: user.email')
      
      // Якщо у вас є телефон і ви хочете його додати:
      // phones: user.phone ? [user.phone] : []
    };

    // Викликаємо API Roapp для створення "Людини"
    // (Переконайтеся, що у вашому roappApi.js є функція createPerson,
    // або що roappApi може робити POST-запити)
    // Якщо у вас немає roappApi.js, цей код припускає,
    // що виклик робиться на ендпойнт 'people/'
    const response = await roappApi.post('people/', personData);
    const roappUser = response.data.data; // Припускаємо, що roapp повертає дані так

    if (!roappUser || !roappUser.id) {
      throw new Error('Roapp API не повернуло ID користувача.');
    }
    
    console.log(`✅ Користувач ${user.email} успішно синхронізований з Roapp ID: ${roappUser.id}`);

    // Важливо: Оновлюємо нашого користувача в MongoDB, 
    // щоб зберегти ID з Roapp для майбутніх синхронізацій.
    await User.findByIdAndUpdate(user._id, { roappId: roappUser.id });
    console.log(`✅ ID ${roappUser.id} збережено для користувача ${user.email} в локальній базі.`);

  } catch (error) {
    console.error(`❌ Помилка синхронізації користувача ${user.email} з Roapp.`);
    
    // Логуємо точну помилку від Roapp (саме тут ви бачите '"email" is not allowed"')
    if (error.response && error.response.data) {
      console.error('Roapp API Error:', error.response.data);
    } else {
      console.error('Unknown sync error:', error.message);
    }
    
    // Важливо: Ми НЕ "кидаємо" помилку (throw error) далі.
    // Якщо цього не зробити, вся реєстрація користувача на сайті
    // завершиться помилкою через збій синхронізації з Roapp.
    // Зараз користувач зареєструється на сайті, але не в Roapp.
  }
};

// ===================================================================
// ВАШІ ІСНУЮЧІ ФУНКЦІЇ (Залишені без змін)
// ===================================================================

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

// Запускаємо при старті сервера
runSync();

// Запускаємо за розкладом
cron.schedule('*/15 * * * *', () => {
  console.log('⏰ Запуск планової синхронізації...');
  runSync();
});

// ===================================================================
// ДОДАНО: Експортуємо syncUserToRoapp, щоб User.js мав до неї доступ
// ===================================================================
module.exports = {
    syncUserToRoapp,
    runSync // Експортуємо і це, якщо потрібно
};