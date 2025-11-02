// backend/routes/webhookRoutes.js
const express = require('express');
const router = express.Router();
// Переконайтеся, що назва файлу контролера правильна
const { handleRoappWebhook } = require('../controllers/webhookController');

// Переконайтеся, що handleRoappWebhook тут не undefined
if (!handleRoappWebhook) {
  throw new Error('Критична помилка: контролер webhookController не зміг завантажити функцію handleRoappWebhook.');
}

router.post('/roapp', handleRoappWebhook);

module.exports = router;