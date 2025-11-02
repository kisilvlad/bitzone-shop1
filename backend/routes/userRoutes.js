// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { 
    getUserProfile, 
    updateUserProfile,
    getMyOrders,
    getMyReviews
} = require('../controllers/userController');

// --- ВИПРАВЛЕННЯ ТУТ ---
// Ми імпортуємо функцію authMiddleware через деструктуризацію, як і в інших файлах
const { authMiddleware } = require('../middleware/authMiddleware');

// Застосовуємо authMiddleware до всіх маршрутів у цьому файлі
router.get('/me', authMiddleware, getUserProfile);
router.put('/me', authMiddleware, updateUserProfile);
router.get('/my-orders', authMiddleware, getMyOrders);
router.get('/me/reviews', authMiddleware, getMyReviews);

module.exports = router;