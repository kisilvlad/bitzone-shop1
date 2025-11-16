// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

const {
  createMonobankInvoice,
  handleMonobankWebhook,
} = require('../controllers/paymentController');

// Фронт: POST /api/payments/monobank/invoice
router.post('/monobank/invoice', createMonobankInvoice);

// Monobank вебхук: POST /api/payments/monobank/webhook
router.post('/monobank/webhook', handleMonobankWebhook);

module.exports = router;
