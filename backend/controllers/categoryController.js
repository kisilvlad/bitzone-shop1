// backend/controllers/categoryController.js
const RoappCategory = require('../models/RoappCategory');
const { syncRoappCategories } = require('../services/roappCategoryService');

/**
 * Отримати дерево категорій (root → children → subchildren ...)
 */
async function getCategoryTree(req, res, next) {
  try {
    const type = req.query.type; // "product" | "service" | undefined (всі)

    const filter = {};
    if (type === 'product' || type === 'service') {
      filter.type = type;
    }

    const categories = await RoappCategory.find(filter)
      .lean()
      .sort({ name: 1 });

    const map = new Map();
    const roots = [];

    // готуємо вузли
    categories.forEach((cat) => {
      map.set(cat.roappId, {
        id: cat.roappId,
        name: cat.name,
        parentId: cat.parentId,
        type: cat.type,
        slug: cat.slug,
        path: cat.path || [],
        children: [],
      });
    });

    // будуємо дерево
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json(roots);
  } catch (err) {
    next(err);
  }
}

/**
 * Ручний запуск синхронізації категорій з ROAPP
 * (можна дернути один раз або повісити на cron)
 */
async function syncCategoriesHandler(req, res, next) {
  try {
    await syncRoappCategories({ includeServiceCategories: false });
    res.json({ message: 'Categories synced from ROAPP successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCategoryTree,
  syncCategoriesHandler,
};
