// backend/routes/userRoutes.js
// !!! ФІКС: Перейменовано /profile на /me !!!

const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    getUserReviews,
    // (тут твої функції адміна)
    // deleteUser,
    // getUserById,
    // updateUser
} = require('../controllers/userController');
const { protect, admin, authMiddleware } = require('../middleware/authMiddleware');

// !!! ФІКС !!!
// Account.jsx шукає '/me', а не '/profile'
router.route('/me')
    .get(authMiddleware, getUserProfile)
    .put(authMiddleware, updateUserProfile);

// Цей роут вже правильний
router.get('/me/reviews', authMiddleware, getUserReviews);

// --- (Твої роути адміна, якщо вони є, залишаються) ---
// router.route('/:id')
//     .delete(protect, admin, deleteUser)
//     .get(protect, admin, getUserById)
//     .put(protect, admin, updateUser);

module.exports = router;