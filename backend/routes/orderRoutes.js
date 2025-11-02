// backend/routes/orderRoutes.js

const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrderById,
    updateOrderToPaid,
    // --- 1. ДОДАЄМО notifyMe В ІМПОРТ ---
    notifyMe
} = require('../controllers/orderController');

const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

// --- ЗАХИЩЕНІ ТА ПУБЛІЧНІ МАРШРУТИ ---

// Створення замовлення: доступно для всіх (гостей та авторизованих)
router.post('/', optionalAuthMiddleware, createOrder);

// Отримання замовлення за ID: тільки для авторизованого власника
router.get('/:id', authMiddleware, getOrderById);

// Оновлення статусу замовлення на "оплачено": тільки для авторизованих
router.put('/:id/pay', authMiddleware, updateOrderToPaid);

// --- 2. ДОДАЄМО НОВИЙ МАРШРУТ ДЛЯ ФУНКЦІЇ "ПОВІДОМИТИ МЕНЕ" ---
// Цей маршрут публічний, не потребує авторизації
router.post('/notify-me', notifyMe);


module.exports = router;