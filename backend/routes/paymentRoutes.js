// backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();

const {
  createMonobankInvoice,
  monobankWebhook,
  getMonobankPaymentStatus,
} = require('../controllers/paymentController');

// Якщо треба, можеш додати auth middleware, наприклад:
// const { protect } = require('../middleware/authMiddleware');

// Створення інвойсу Monobank (коли юзер на формі вибирає "Оплата online")
router.post('/monobank/invoice', createMonobankInvoice);

// Webhook від Monobank (Monobank дергає цей endpoint самостійно)
router.post('/monobank/webhook', monobankWebhook);

// Перевірка статусу оплати після повернення з Monobank
router.get('/monobank/status', getMonobankPaymentStatus);

module.exports = router;
