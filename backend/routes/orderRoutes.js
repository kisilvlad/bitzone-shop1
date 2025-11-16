// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
} = require('../controllers/orderController');

// Створити замовлення
router.post('/', protect, createOrder);

// СПИСОК МИХ ЗАМОВЛЕНЬ (ВАЖЛИВО: до /:id)
router.get('/my', protect, getMyOrders);

// Деталі конкретного замовлення
router.get('/:id', protect, getOrderById);

// Оплата (заглушка)
router.put('/:id/pay', protect, updateOrderToPaid);

// "Повідомити, коли зʼявиться"
router.post('/notify-me', notifyMe);

module.exports = router;
