// backend/routes/userRoutes.js
// !!! ФІКС: Перейменовано /profile на /me !!!

const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    getUserReviews,
} = require('../controllers/userController');
// (authMiddleware - це твій 'protect')
const { authMiddleware, admin } = require('../middleware/authMiddleware');

// !!! ФІКС !!!
// Account.jsx шукає '/me', а не '/profile'
router.route('/me')
    .get(authMiddleware, getUserProfile)
    .put(authMiddleware, updateUserProfile);

// Цей роут вже правильний
router.get('/me/reviews', authMiddleware, getUserReviews);

// (Тут залиш свої роути для адмінки, якщо вони є)
// router.route('/').get(authMiddleware, admin, getUsers);
// ...

module.exports = router;