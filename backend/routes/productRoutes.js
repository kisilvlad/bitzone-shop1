// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCategories,
  getProducts,
  getProductById,
  getProductReviews,
  createProductReview,
} = require('../controllers/productController');

// --- ВИПРАВЛЕННЯ ТУТ ---
// Використовуємо деструктуризацію, щоб отримати саме функцію authMiddleware з об'єкта
const { authMiddleware } = require('../middleware/authMiddleware');

// --- ПУБЛІЧНІ МАРШРУТИ ---
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/reviews', getProductReviews);

// --- ЗАХИЩЕНИЙ МАРШРУТ ---
// Тепер authMiddleware буде коректно передано як функція
router.post('/:id/reviews', authMiddleware, createProductReview);

module.exports = router;
