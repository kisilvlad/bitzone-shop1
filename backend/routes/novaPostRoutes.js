// backend/routes/novaPostRoutes.js
const express = require('express');
const router = express.Router();
const novaPostService = require('../services/novaPostService');

// GET /api/novapost/cities?search=Київ
router.get('/cities', async (req, res) => {
  try {
    const search = req.query.search || '';
    const cities = await novaPostService.getCities(search);
    res.json(cities);
  } catch (e) {
    console.error('NovaPoshta /cities error:', e.message);
    res.status(500).json({ error: e.message || 'Помилка отримання міст Нова Пошта' });
  }
});

// GET /api/novapost/warehouses/:cityRef
router.get('/warehouses/:cityRef', async (req, res) => {
  try {
    const { cityRef } = req.params;
    const warehouses = await novaPostService.getWarehouses(cityRef);
    res.json(warehouses);
  } catch (e) {
    console.error('NovaPoshta /warehouses error:', e.message);
    res.status(500).json({ error: e.message || 'Помилка отримання відділень Нова Пошта' });
  }
});

module.exports = router;
