const express = require('express');
const router = express.Router();
const {
  addOrderItems, // <-- Імпортуємо addOrderItems
  getOrderById,
  updateOrderToPaid,
  getMyOrders,
  getOrders,
  updateOrderToDelivered,
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// POST /api/orders (Створення замовлення)
// GET /api/orders (Отримання всіх замовлень - Адмін)
router.route('/').post(protect, addOrderItems).get(protect, admin, getOrders);

// GET /api/orders/myorders (Отримання МОЇХ замовлень)
router.route('/myorders').get(protect, getMyOrders);

// GET /api/orders/:id (Отримання замовлення за ID)
router.route('/:id').get(protect, getOrderById);

// PUT /api/orders/:id/pay (Оновлення статусу оплати)
router.route('/:id/pay').put(protect, updateOrderToPaid);

// PUT /api/orders/:id/deliver (Оновлення статусу доставки - Адмін)
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);

module.exports = router;