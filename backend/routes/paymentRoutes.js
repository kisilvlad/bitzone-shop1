// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createMonobankInvoice,
  getMonobankInvoiceStatus,
  monobankWebhook,
} = require('../controllers/paymentController');

// 🔹 Без protect, щоб не падало (можна буде додати пізніше, якщо треба)
router.post('/monobank/invoice', createMonobankInvoice);

// Перевірка статусу інвойсу (сторінка /payment-result)
router.get('/monobank/status', getMonobankInvoiceStatus);

// Webhook (Monobank → наш бекенд)
router.post('/monobank-webhook', monobankWebhook);

module.exports = router;
