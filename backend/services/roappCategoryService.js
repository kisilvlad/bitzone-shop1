// backend/services/roappCategoryService.js
// Синхронізація категорій ROAPP у дві таблиці:
// 1) RoappCategory — повне дерево з parentId, path, type
// 2) Category      — плоский список (root product categories) для простих списків

const RoappCategory = require('../models/RoappCategory');
const Category = require('../models/categoryModel');
const roappApi = require('../utils/roappApi');

/**
 * Тягнемо всі категорії з ROAPP і зберігаємо/оновлюємо в Mongo.
 */
async function syncRoappCategories(options = {}) {
  const { includeServiceCategories = false } = options;

  console.log('🔄 [ROAPP] Початок синхронізації категорій...');

  try {
    // 1. Продуктові категорії
    const productRes = await roappApi.get('/warehouse/categories/');
    const productRaw = productRes.data;
    const productCategories = Array.isArray(productRaw)
      ? productRaw
      : productRaw?.results || productRaw?.data || [];

    // 2. (опціонально) сервісні категорії
    let serviceCategories = [];
    if (includeServiceCategories) {
      const serviceRes = await roappApi.get('/services/categories/');
      const serviceRaw = serviceRes.data;
      serviceCategories = Array.isArray(serviceRaw)
        ? serviceRaw
        : serviceRaw?.results || serviceRaw?.data || [];
    }

    const all = [
      ...productCategories.map((c) => ({ raw: c, type: 'product' })),
      ...serviceCategories.map((c) => ({ raw: c, type: 'service' })),
    ];

    console.log(
      `📦 [ROAPP] Отримано категорій: products=${productCategories.length}, services=${serviceCategories.length}`
    );

    const bulkOps = [];

    for (const { raw, type } of all) {
      const roappId = Number(raw.id);
      if (!Number.isFinite(roappId)) continue;

      const name = raw.title || raw.name || 'Без назви';
      const parentId = raw.parent_id ? Number(raw.parent_id) : null;

      const slug =
        (name || 'category')
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
          .replace(/^-+|-+$/g, '') +
        '-' +
        roappId;

      bulkOps.push({
        updateOne: {
          filter: { roappId },
          update: {
            $set: {
              roappId,
              name,
              parentId: parentId ?? null,
              type,
              isActive: raw.is_active ?? raw.isActive ?? true,
              slug,
            },
          },
          upsert: true,
        },
      });
    }

    if (!bulkOps.length) {
      console.warn('⚠️ [ROAPP] Немає категорій для оновлення');
      return;
    }

    await RoappCategory.bulkWrite(bulkOps);
    console.log(
      `✅ [ROAPP] Синхронізація категорій завершена. Оновлено/створено: ${bulkOps.length}`
    );

    // 🔥 Видаляємо з локальної бази ті категорії, яких більше немає в ROAPP
    const remoteCategoryIds = all
      .map(({ raw }) => Number(raw.id))
      .filter((id) => Number.isFinite(id));

    if (remoteCategoryIds.length > 0) {
      const deleteCategoriesResult = await RoappCategory.deleteMany({
        roappId: { $nin: remoteCategoryIds },
      });
      console.log(
        `   - Видалено локальних категорій, відсутніх у ROAPP: ${
          deleteCategoriesResult.deletedCount || 0
        }`
      );
    }

    // 2-й прохід: рахуємо path (шлях предків)
    const categories = await RoappCategory.find().lean();
    const byId = new Map(categories.map((c) => [c.roappId, c]));

    const pathUpdates = [];

    for (const cat of categories) {
      const path = [];
      let currentParentId = cat.parentId;
      const visited = new Set();

      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        const parent = byId.get(currentParentId);
        if (!parent) break;
        path.unshift(parent.roappId);
        currentParentId = parent.parentId;
      }

      pathUpdates.push({
        updateOne: {
          filter: { _id: cat._id },
          update: { $set: { path } },
        },
      });
    }

    if (pathUpdates.length) {
      await RoappCategory.bulkWrite(pathUpdates);
      console.log('✅ [ROAPP] Оновлено path для категорій');
    }

    // 3. Оновлюємо плоску таблицю Category (тільки root product categories)
    const rootProductCategories = categories.filter(
      (c) => !c.parentId && c.type === 'product' && (c.isActive ?? true)
    );

    if (rootProductCategories.length) {
      const catBulk = rootProductCategories.map((c) => ({
        updateOne: {
          filter: { roappId: c.roappId },
          update: {
            $set: {
              roappId: c.roappId,
              name: c.name,
            },
          },
          upsert: true,
        },
      }));
      await Category.bulkWrite(catBulk);
      console.log(
        `✅ [Mongo] Оновлено/створено простих категорій для фронтенду: ${catBulk.length}`
      );

      // 🔥 Чистимо плоску таблицю Category від категорій, яких більше немає в ROAPP
      const rootCategoryIds = rootProductCategories.map((c) => c.roappId);
      if (rootCategoryIds.length > 0) {
        const deleteFlatCategoriesResult = await Category.deleteMany({
          roappId: { $nin: rootCategoryIds },
        });
        console.log(
          `   - Видалено простих категорій для фронтенду, відсутніх у ROAPP: ${
            deleteFlatCategoriesResult.deletedCount || 0
          }`
        );
      }
    }
  } catch (err) {
    console.error('❌ [ROAPP] Помилка при синхронізації категорій:', err.message);
    if (err.response?.data) {
      console.error('[ROAPP] Відповідь API:', JSON.stringify(err.response.data, null, 2));
    }
    throw err;
  }
}

module.exports = {
  syncRoappCategories,
};
