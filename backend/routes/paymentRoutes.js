// backend/routes/paymentRoutes.js
// Маршрути для Monobank оплат

const express = require('express');
const router = express.Router();

const {
  createMonobankInvoice,
  monobankWebhook,
} = require('../controllers/paymentController');

const {
  authMiddleware,
} = require('../middleware/authMiddleware');

// Створення інвойсу (юзер має бути авторизований)
router.post('/monobank/invoice', authMiddleware, createMonobankInvoice);

// Webhook від Monobank (має бути публічним, БЕЗ авторизації)
router.post('/monobank/webhook', monobankWebhook);

module.exports = router;
