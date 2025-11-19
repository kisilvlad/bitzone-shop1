// backend/services/roappCategoryService.js
const RoappCategory = require('../models/RoappCategory');
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
    const productCategories = Array.isArray(productRes.data)
      ? productRes.data
      : productRes.data?.results || [];

    // 2. (опціонально) сервісні категорії
    let serviceCategories = [];
    if (includeServiceCategories) {
      const serviceRes = await roappApi.get('/services/categories/');
      serviceCategories = Array.isArray(serviceRes.data)
        ? serviceRes.data
        : serviceRes.data?.results || [];
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
      // ⚠️ Тут ми не знаємо точну структуру відповіді,
      // тому дістаємо поля максимально "універсально"
      const roappId = raw.id ?? raw.pk ?? raw.roapp_id;
      const name = raw.name ?? raw.title ?? raw.label;
      const parentId =
        raw.parent_id ??
        raw.parentId ??
        raw.parent?.id ??
        raw.parent?.pk ??
        null;

      if (!roappId || !name) {
        console.warn('[ROAPP] Категорія без id або name, скіпаю:', raw);
        continue;
      }

      // простий slug
      const slug =
        (raw.slug ||
          String(name)
            .toLowerCase()
            .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
            .replace(/^-+|-+$/g, '')) +
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
    console.log(`✅ [ROAPP] Синхронізація категорій завершена. Оновлено/створено: ${bulkOps.length}`);

    // Другим проходом рахуємо path (шлях предків)
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
  } catch (err) {
    console.error('❌ [ROAPP] Помилка при синхронізації категорій:', err.message);
    if (err.response?.data) {
      console.error(
        '[ROAPP] Відповідь API:',
        JSON.stringify(err.response.data, null, 2)
      );
    }
    throw err;
  }
}

module.exports = {
  syncRoappCategories,
};
