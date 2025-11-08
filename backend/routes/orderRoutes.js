// backend/routes/orderRoutes.js
// !!! ФІКС: Додано маршрут GET / для getMyOrders !!!

const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrderById,
    updateOrderToPaid,
    notifyMe,
    getMyOrders // <-- !!! ІМПОРТУЄМО НОВУ ФУНКЦІЮ !!!
} = require('../controllers/orderController');

const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// --- ЗАХИЩЕНІ ТА ПУБЛІЧНІ МАРШРУТИ ---

// POST /api/orders (Створення замовлення)
router.post('/', optionalAuthMiddleware, createOrder);

// GET /api/orders (Отримання МОЇХ замовлень)
// !!! ФІКС: ЦЬОГО МАРШРУТУ НЕ ВИСТАЧАЛО !!!
// (Саме сюди стукає Account.jsx)
router.get('/', authMiddleware, getMyOrders);

// POST /api/orders/notify-me (Повідомити мене)
router.post('/notify-me', notifyMe);

// GET /api/orders/:id (Отримання замовлення за ID)
router.get('/:id', authMiddleware, getOrderById);

// PUT /api/orders/:id/pay (Оновлення статусу)
router.put('/:id/pay', authMiddleware, updateOrderToPaid);

module.exports = router;