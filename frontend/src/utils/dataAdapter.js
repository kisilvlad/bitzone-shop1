// frontend/src/utils/dataAdapter.js

/**
 * Ця функція приймає один товар з API ROAPP і перетворює його
 * у формат, зрозумілий для компонентів нашого сайту (наприклад, ProductCard).
 * @param {object} apiProduct - Об'єкт товару, отриманий з API.
 * @returns {object} - Адаптований об'єкт товару.
 */
export const adaptProduct = (apiProduct) => {
  // Вибираємо першу ціну з об'єкта `prices`, яка більша за нуль.
  // Це просте рішення; пізніше можна буде вибирати конкретний тип ціни.
  const price = Object.values(apiProduct.prices).find(p => p > 0) || 0;

  // Визначаємо стан товару ('новий' чи 'вживаний') за ключовими словами в назві.
  const condition = apiProduct.title.toLowerCase().includes('вживана') ? 'used' : 'new';
  
  // Визначаємо кількість на складі. Якщо є серійні номери, рахуємо їх. Якщо ні - ставимо 1 (припускаємо, що товар є).
  const stock = apiProduct.is_serial && apiProduct.sernum_codes ? apiProduct.sernum_codes.length : (apiProduct.is_serial ? 0 : 1);

  return {
    _id: apiProduct.id, // Перетворюємо `id` в `_id`
    name: apiProduct.title, // `title` в `name`
    price: price,
    category: apiProduct.category ? apiProduct.category.title : 'Різне',
    description: apiProduct.description,
    // Беремо перше зображення. Якщо зображень немає, ставимо тимчасову картинку-заглушку.
    images: apiProduct.images.length > 0 ? [apiProduct.images[0].image] : ['/assets/bitzone-logo1.png'],
    stock: stock,
    condition: condition,
    // Можемо додати інші поля з API, якщо вони знадобляться
    isRetro: condition === 'used', // Приклад: вважаємо всі вживані товари ретро-класикою
    genre: 'Гра' // Приклад статичного поля
  };
};

/**
 * Ця функція приймає масив товарів з API і адаптує кожен з них.
 * @param {Array<object>} apiProducts - Масив товарів з API.
 * @returns {Array<object>} - Масив адаптованих товарів.
 */
export const adaptProducts = (apiProducts) => {
  if (!Array.isArray(apiProducts)) return [];
  return apiProducts.map(adaptProduct);
};