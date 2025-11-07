// backend/routes/orderRoutes.js

const express = require('express');
const router = express.Router();

// !!! ФІКС 1: Імпортуємо ВСІ потрібні функції з контролера !!!
const {
    createOrder,
    getOrderById,
    updateOrderToPaid,
    notifyMe,
    getMyOrders,   // <-- ДОДАНО
    getAllOrders  // <-- ДОДАНО
} = require('../controllers/orderController');

// !!! ФІКС 2: Імпортуємо `admin` з твого middleware !!!
const { 
    authMiddleware, 
    optionalAuthMiddleware, 
    admin // <-- ДОДАНО (для адмін-маршрутів)
} = require('../middleware/authMiddleware');


// --- ОСНОВНИЙ РОУТ /api/orders ---

// POST /api/orders (Створити замовлення)
// (Як у тебе і було, `optionalAuthMiddleware` - це коректно)
router.post('/', optionalAuthMiddleware, createOrder);

// GET /api/orders (Отримати МОЇ замовлення)
// !!! ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ !!!
// Цей маршрут виправляє твою проблему. Він захищений
// і веде на нову функцію `getMyOrders`.
router.get('/', authMiddleware, getMyOrders);


// --- ІНШІ РОУТИ ---

// GET /api/orders/all (Отримати ВСІ замовлення для Адміна)
// (Новий роут для майбутньої адмінки)
router.get('/all', authMiddleware, admin, getAllOrders);

// POST /api/orders/notify-me (Повідомити про наявність)
// (Як у тебе і було)
router.post('/notify-me', notifyMe);


// --- РОУТИ З ID :id ---

// GET /api/orders/:id (Отримати замовлення за ID)
// (Як у тебе і було, захищено `authMiddleware`)
router.get('/:id', authMiddleware, getOrderById);

// PUT /api/orders/:id/pay (Оновити статус на "оплачено")
// (Як у тебе і було, захищено `authMiddleware`)
router.put('/:id/pay', authMiddleware, updateOrderToPaid);


module.exports = router;