// backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();

const {
  createMonobankInvoice,
  monobankWebhook,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/authMiddleware');

// Створення інвойсу (коли юзер на кроці оформлення)
router.post('/monobank/invoice', protect, createMonobankInvoice);

// Webhook від Monobank (сюди стукає банк, тут немає юзера)
router.post('/monobank/webhook', monobankWebhook);

module.exports = router;
