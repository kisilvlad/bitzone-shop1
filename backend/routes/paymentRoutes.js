// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

// Імпортуємо функції-контролери, саме ФУНКЦІЇ
// Переконайся, що в paymentController вони реально експортуються так само:
const {
  createMonobankInvoice,
  handleMonobankWebhook,
} = require('../controllers/paymentController');

// Створення інвойсу Monobank
// Фронт стукає сюди: POST /api/payments/monobank/invoice
router.post('/monobank/invoice', createMonobankInvoice);

// Вебхук від Monobank (для оновлення статусу платежу, якщо ти його підвʼяжеш)
router.post('/monobank/webhook', handleMonobankWebhook);

module.exports = router;
