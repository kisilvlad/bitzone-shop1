// backend/utils/roappApi.js
const axios = require('axios');

const API_KEY = process.env.ROAPP_API_KEY;

// Цей код зупинить сервер, якщо .env відсутній
if (!API_KEY || API_KEY === 'undefined') {
    throw new Error('Критична помилка: Змінна ROAPP_API_KEY не встановлена в .env файлі!');
}

const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${API_KEY}`
    }
});

module.exports = roappApi;