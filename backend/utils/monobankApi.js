// backend/utils/monobankApi.js
// Axios-інстанс для роботи з Monobank Acquiring API

const axios = require('axios');

const MONOBANK_TOKEN = process.env.MONOBANK_TOKEN;

if (!MONOBANK_TOKEN) {
  throw new Error(
    '❌ MONOBANK_TOKEN не заданий в .env. Додай MONOBANK_TOKEN перед стартом сервера.'
  );
}

const monobankApi = axios.create({
  baseURL: 'https://api.monobank.ua/api/merchant/',
  headers: {
    'X-Token': MONOBANK_TOKEN,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

module.exports = monobankApi;
