// backend/utils/roappApi.js
const axios = require('axios');

// 1. Перевіряємо, чи існує ключ API
const API_KEY = process.env.ROAPP_API_KEY;
if (!API_KEY || API_KEY === 'undefined') {
    // Це зупинить сервер при запуску і дасть чітку помилку
    throw new Error('Критична помилка: Змінна ROAPP_API_KEY не встановлена в .env файлі!');
}

// 2. Створюємо ОДИН екземпляр roappApi для всього додатку
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${API_KEY}`
    }
});

module.exports = roappApi;