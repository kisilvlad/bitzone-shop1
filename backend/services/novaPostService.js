// backend/services/novaPostService.js
// Сервіс для роботи з довідниками Нової пошти (міста + відділення)
// Використовує офіційний JSON API v2.0: https://api.novaposhta.ua/v2.0/json/

const axios = require("axios");

const NOVA_API_KEY = process.env.NOVAPOST_API_KEY;
const NOVA_API_URL = process.env.NOVAPOST_API_URL || "https://api.novaposhta.ua/v2.0/json/";

if (!NOVA_API_KEY) {
  console.warn("[NovaPost] ⚠️ Не задано NOVAPOST_API_KEY у .env — запити до Нової пошти не працюватимуть");
}

/**
 * Базовий виклик до API Нової пошти
 */
async function callNova(modelName, calledMethod, methodProperties = {}) {
  if (!NOVA_API_KEY) {
    throw new Error("NOVAPOST_API_KEY is not configured");
  }

  const payload = {
    apiKey: NOVA_API_KEY,
    modelName,
    calledMethod,
    methodProperties,
  };

  const { data } = await axios.post(NOVA_API_URL, payload, {
    timeout: 10000,
  });

  if (data.errors && data.errors.length) {
    console.error("[NovaPost] API errors:", data.errors);
    throw new Error(data.errors.join("; "));
  }

  if (!data.success) {
    console.error("[NovaPost] API response not successful:", data);
    throw new Error("Nova Poshta API: request not successful");
  }

  return data.data || [];
}

/**
 * Пошук міст Нової пошти
 * search — частина назви (Київ, Львів, Бровари ...)
 * Повертаємо спрощений список міст для фронтенду
 */
exports.getCities = async (search = "") => {
  const methodProperties = {};

  if (search && search.trim().length >= 2) {
    methodProperties.FindByString = search.trim();
  }

  const cities = await callNova("Address", "getCities", methodProperties);

  // Мапимо у компактний формат, щоб фронту було зручно
  return cities.map((c) => ({
    Ref: c.Ref, // головний ідентифікатор міста
    Description: c.Description, // назва міста укр
    AreaDescription: c.AreaDescription || c.SettlementAreaDescription || "",
    RegionDescription: c.SettlementRegionsDescription || "",
    CityID: c.CityID,
  }));
};

/**
 * Отримати відділення по Ref міста
 */
exports.getWarehouses = async (cityRef) => {
  if (!cityRef) {
    throw new Error("cityRef is required");
  }

  const warehouses = await callNova("Address", "getWarehouses", {
    CityRef: cityRef,
  });

  return warehouses.map((w) => ({
    Ref: w.Ref,
    Description: w.Description,       // "Відділення №1: вул. ..."
    ShortAddress: w.ShortAddress,     // "Київ, вул. ..."
    Number: w.Number,                 // номер відділення
    CityRef: w.CityRef,
    CityDescription: w.CityDescription,
  }));
};
