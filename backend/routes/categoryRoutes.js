// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCategoryTree,
  syncCategoriesHandler,
} = require('../controllers/categoryController');

// GET /api/categories/tree?type=product
router.get('/tree', getCategoryTree);

// POST /api/categories/sync
// 🔒 В ідеалі сюди додати якусь просту авторизацію (admin / секретний токен)
// Щоб ніхто ззовні не дергав
router.post('/sync', syncCategoriesHandler);

module.exports = router;
