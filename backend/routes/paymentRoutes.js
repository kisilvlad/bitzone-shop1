// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createMonobankInvoice,
  getMonobankInvoiceStatus,
  monobankWebhook,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Створення інвойсу Monobank (клієнт ініціює оплату)
router.post('/monobank/invoice', protect, createMonobankInvoice);

// Перевірка статусу інвойсу (сторінка /payment-result)
router.get('/monobank/status', getMonobankInvoiceStatus);

// Webhook (Monobank → наш бекенд)
router.post('/monobank-webhook', monobankWebhook);

module.exports = router;
