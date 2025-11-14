// backend/services/novaPostService.js
const axios = require('axios');

const API_KEY = process.env.NOVA_POSHTA_API_KEY;
const API_URL = process.env.NOVA_POSHTA_API_URL || 'https://api.novaposhta.ua/v2.0/json/';

/**
 * Базовий виклик API Нова Пошта 2.0
 * modelName: "Address" | "AddressGeneral" | ...
 * calledMethod: "getCities" | "getWarehouses" | ...
 * methodProperties: обʼєкт з параметрами
 */
async function callNovaPoshta({ modelName, calledMethod, methodProperties = {} }) {
  if (!API_KEY) {
    throw new Error('NovaPoshta: не задано NOVA_POSHTA_API_KEY у .env');
  }

  const payload = {
    apiKey: API_KEY,
    modelName,
    calledMethod,
    methodProperties
  };

  try {
    const { data } = await axios.post(API_URL, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!data) {
      throw new Error('NovaPoshta: порожня відповідь від API');
    }

    if (data.errors && data.errors.length) {
      // Наприклад: ["API key is invalid"]
      throw new Error('NovaPoshta API error: ' + data.errors.join('; '));
    }

    if (data.success === false) {
      throw new Error('NovaPoshta: success=false, але помилки не вказані');
    }

    return data.data || [];
  } catch (e) {
    console.error('NovaPoshta: помилка запиту', { modelName, calledMethod, methodProperties });
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Body:', e.response.data);
    } else {
      console.error(e.message);
    }
    throw e;
  }
}

/**
 * Пошук міст по рядку (Київ, Львів і т.д.)
 * Використовує Address/getCities з параметром FindByString
 */
async function getCities(search = '') {
  const query = String(search || '').trim();
  if (!query) return [];

  const data = await callNovaPoshta({
    modelName: 'Address',
    calledMethod: 'getCities',
    methodProperties: {
      FindByString: query,
      Page: 1,
      Limit: 50
    }
  });

  // Мапимо у формат, зручний для фронта
  return data.map((c) => ({
    Ref: c.Ref, // GUID міста
    Description: c.Description, // назва міста
    AreaDescription: c.AreaDescription || '',   // область
    RegionDescription: c.RegionDescription || '' // район
  }));
}

/**
 * Список відділень для конкретного міста
 * Використовує AddressGeneral/getWarehouses з CityRef
 */
async function getWarehouses(cityRef) {
  const ref = String(cityRef || '').trim();
  if (!ref) return [];

  const data = await callNovaPoshta({
    modelName: 'AddressGeneral',
    calledMethod: 'getWarehouses',
    methodProperties: {
      CityRef: ref,
      Page: 1,
      Limit: 300
    }
  });

  return data.map((w) => ({
    Ref: w.Ref,
    Description: w.Description,
    ShortAddress: w.ShortAddress || w.ShortAddressRu || w.Description,
    CityRef: w.CityRef,
    CityDescription: w.CityDescription || '',
    Number: w.Number || ''
  }));
}

module.exports = {
  getCities,
  getWarehouses
};
