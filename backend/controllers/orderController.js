// backend/controllers/orderController.js

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');
const Product = require('../models/productModel');

// Константи під твій акаунт ROAPP
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/* ===================== helpers ===================== */

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

const normalizeCartItem = (item) => {
  const quantityRaw = item.qty ?? item.quantity ?? item.count ?? 1;
  const priceRaw =
    item.price ??
    item.currentPrice ??
    item.newPrice ??
    item.total ??
    0;
  const nameRaw =
    item.name ??
    item.title ??
    item.productName ??
    item.product_name ??
    'Товар';

  const productId =
    item.roappProductId ??
    item.roAppProductId ??
    item.ro_app_product_id ??
    item.productId ??
    item.product_id ??
    null;

  const quantity = Number(quantityRaw) > 0 ? Number(quantityRaw) : 1;
  const price = Number(priceRaw) >= 0 ? Number(priceRaw) : 0;
  const name = String(nameRaw || 'Товар');

  return {
    productId,
    quantity,
    price,
    name,
  };
};

/**
 * Намагаємось знайти або створити клієнта в ROAPP за телефоном
 */
const findOrCreateRoAppCustomer = async ({ phone, firstName, lastName, comment }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  try {
    // 1. Пошук існуючого клієнта
    const resp = await roappApi.get('contacts/people', {
      params: { 'phones[]': normalizedPhone },
    });
    const people = Array.isArray(resp?.data?.data) ? resp.data.data : [];
    if (people.length) return people[0].id;
  } catch (err) {
    console.error('[ROAPP] findOrCreateRoAppCustomer search error:', err?.response?.data || err.message);
  }

  // 2. Створити, якщо не знайшли
  const payload = {
    first_name: firstName || 'Клієнт',
    last_name: lastName || '',
    phones: [
      {
        value: normalizedPhone,
        main: true,
      },
    ],
    comment: comment || '',
  };

  try {
    const createResp = await roappApi.post('contacts/people', payload);
    const newId = createResp?.data?.data?.id;
    return newId || null;
  } catch (err) {
    console.error('[ROAPP] findOrCreateRoAppCustomer create error:', err?.response?.data || err.message);
    return null;
  }
};

/**
 * Хелпер: нормалізація статусу замовлення
 */
const mapOrderStatus = (statusObj) => {
  if (!statusObj) return { title: 'Невідомий статус', color: '#888888', isPaid: false, isDelivered: false };

  const title = statusObj.title || statusObj.name || 'Статус';
  const color = statusObj.color || '#888888';

  const normalized = title.toLowerCase();
  const isPaid =
    normalized.includes('оплач') ||
    normalized.includes('paid') ||
    normalized.includes('сплач');
  const isDelivered =
    normalized.includes('достав') ||
    normalized.includes('видан') ||
    normalized.includes('delivered');

  return { title, color, isPaid, isDelivered };
};

/* ===================== mapItemsWithProducts (ОНОВЛЕНО) ===================== */
/**
 * itemsRaw – сирі items від ROAPP (orders/:id/items або з списку замовлень)
 * Повертаємо масив:
 * {
 *   id,
 *   productRoappId,
 *   name,
 *   image,
 *   quantity,
 *   price
 * }
 */
const mapItemsWithProducts = async (itemsRaw) => {
  if (!Array.isArray(itemsRaw) || !itemsRaw.length) return [];

  // 1. Збираємо всі можливі ROAPP ID товарів з сирих items
  const roappIdsSet = new Set();
  for (const it of itemsRaw) {
    const pid =
      it.roappProductId ??
      it.roAppProductId ??
      it.ro_app_product_id ??
      it.product_id_roapp ??
      it.productId ??
      it.product_id ??
      it.entity_id ??
      null;

    if (pid != null && !Number.isNaN(Number(pid))) {
      roappIdsSet.add(Number(pid));
    }
  }

  // 2. Тягнемо товари з бази по roappId
  let productsByRoappId = {};
  if (roappIdsSet.size > 0) {
    try {
      const products = await Product.find(
        { roappId: { $in: Array.from(roappIdsSet) } },
        'roappId name images mainImage image coverImage thumbnail'
      ).lean();

      productsByRoappId = (products || []).reduce((acc, p) => {
        if (p && p.roappId != null) {
          acc[String(p.roappId)] = p;
        }
        return acc;
      }, {});
    } catch (err) {
      console.error(
        '[ROAPP] mapItemsWithProducts Product.find error:',
        err?.response?.data || err.message || err
      );
    }
  }

  // 3. Нормалізуємо кожен item в єдину структуру
  return itemsRaw.map((it) => {
    const rawProductId =
      it.roappProductId ??
      it.roAppProductId ??
      it.ro_app_product_id ??
      it.product_id_roapp ??
      it.productId ??
      it.product_id ??
      it.entity_id ??
      null;

    const productRoappId =
      rawProductId != null && !Number.isNaN(Number(rawProductId))
        ? Number(rawProductId)
        : null;

    const productDoc =
      productRoappId != null
        ? productsByRoappId[String(productRoappId)] || null
        : null;

    const qtyRaw =
      it.quantity ??
      it.qty ??
      it.count ??
      it.amount ??
      1;

    const quantity = Number(qtyRaw) > 0 ? Number(qtyRaw) : 1;

    const priceRaw =
      it.price ??
      it.unit_price ??
      it.unitPrice ??
      it.total_price ??
      it.totalPrice ??
      it.sum ??
      it.amount ??
      0;

    const price = Number(priceRaw) || 0;

    const name =
      it.name ||
      it.title ||
      it.productName ||
      it.product_name ||
      it.productTitle ||
      it.good_name ||
      (productDoc && productDoc.name) ||
      'Товар';

    const image =
      (productDoc &&
        (productDoc.mainImage ||
          productDoc.image ||
          productDoc.coverImage ||
          (Array.isArray(productDoc.images) && productDoc.images[0]) ||
          productDoc.thumbnail)) ||
      it.image ||
      it.product_image ||
      it.photo ||
      it.image_url ||
      it.photo_url ||
      it.thumbnail ||
      it.icon ||
      null;

    return {
      id: it.id ?? it.item_id ?? null,
      productRoappId,
      name,
      image,
      quantity,
      price,
    };
  });
};

/* ===================== controllers ===================== */

// @desc    Створення замовлення
// @route   POST /api/orders
// @access  Private (або Public, якщо ти так зробив у routes)
const createOrder = asyncHandler(async (req, res) => {
  const {
    cartItems,
    delivery,
    payment,
    customer,
    comment: generalComment,
  } = req.body || {};

  if (!Array.isArray(cartItems) || !cartItems.length) {
    res.status(400);
    throw new Error('Кошик порожній, додайте товари до замовлення.');
  }

  if (!customer || !customer.phone) {
    res.status(400);
    throw new Error('Телефон клієнта є обовʼязковим для створення замовлення.');
  }

  // Нормалізація кошика
  const normalizedCartItems = cartItems.map(normalizeCartItem);

  // Пошук / створення клієнта в ROAPP
  const clientId =
    (req.user && req.user.roAppId) ||
    (await findOrCreateRoAppCustomer({
      phone: customer.phone,
      firstName: customer.firstName,
      lastName: customer.lastName,
      comment: customer.comment,
    }));

  if (!clientId) {
    res.status(500);
    throw new Error('Не вдалося визначити клієнта в ROAPP.');
  }

  // Формування payload для ROAPP
  const goods = normalizedCartItems.map((ci) => ({
    product_id: ci.productId,
    quantity: ci.quantity,
    price: ci.price,
    name: ci.name,
  }));

  const payload = {
    client_id: clientId,
    branch_id: MY_BRANCH_ID,
    type_id: MY_ORDER_TYPE_ID,
    assignee_id: MY_ASSIGNEE_ID,
    goods,
    comment: generalComment || '',
    delivery: delivery || null,
    payment: payment || null,
  };

  try {
    const resp = await roappApi.post('orders', payload);
    const orderData = resp?.data?.data;

    if (!orderData || !orderData.id) {
      res.status(500);
      throw new Error('ROAPP не повернув ID створеного замовлення.');
    }

    res.status(201).json({
      success: true,
      orderId: orderData.id,
      data: orderData,
    });
  } catch (err) {
    console.error('[ROAPP] createOrder error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Помилка при створенні замовлення в ROAPP.');
  }
});

// @desc    Отримати одне замовлення по ID
// @route   GET /api/orders/:id
// @access  Private (по JWT)
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Основна інформація про замовлення
    const orderResp = await roappApi.get(`orders/${id}`);
    const order = orderResp?.data?.data;
    if (!order) {
      res.status(404);
      throw new Error('Замовлення не знайдено в ROAPP.');
    }

    // 2. Items замовлення
    const itemsResp = await roappApi.get(`orders/${id}/items`);
    const itemsRaw = Array.isArray(itemsResp?.data?.data) ? itemsResp.data.data : [];

    // Мапінг товарів з підтяганням info з Product
    const items = await mapItemsWithProducts(itemsRaw);

    // Статус
    const statusObj = order.status || order.status_id || null;
    const { title: statusTitle, color: statusColor, isPaid, isDelivered } = mapOrderStatus(statusObj);

    const totalFromItems = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);
    const total =
      order.total ??
      order.total_price ??
      order.totalPrice ??
      order.amount ??
      totalFromItems;

    res.json({
      id: order.id,
      number: order.number || order.id,
      client_id: order.client_id,
      branch_id: order.branch_id,
      status: statusTitle,
      statusColor,
      isPaid,
      isDelivered,
      total,
      comment: order.comment || '',
      created_at: order.created_at || order.createdAt,
      items,
      raw: order,
    });
  } catch (err) {
    console.error('[ROAPP] getOrderById error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося завантажити замовлення з ROAPP.');
  }
});

// @desc    Позначити замовлення як оплачене (якщо в тебе ця логіка є)
// @route   PATCH /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const resp = await roappApi.patch(`orders/${id}`, {
      paid: true,
    });
    res.json({
      success: true,
      data: resp?.data?.data || null,
    });
  } catch (err) {
    console.error('[ROAPP] updateOrderToPaid error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося оновити статус оплати замовлення.');
  }
});

// @desc    Тестовий/сервісний endpoint для перевірки бекенда
// @route   GET /api/orders/notify-me
// @access  Public / Private — як в тебе налаштовано
const notifyMe = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    message: 'Order controller працює 🚀',
  });
});

// @desc    Список замовлень поточного користувача
// @route   GET /api/orders
// @access  Private (по JWT)
const getMyOrders = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || !user.phone) {
    res.status(401);
    throw new Error('Не вдалося визначити користувача або його телефон.');
  }

  const normalizedPhone = normalizePhone(user.phone);

  let clientId = user.roAppId || null;

  // Якщо в користувача ще немає roAppId – намагаємось знайти / створити
  if (!clientId) {
    clientId = await findOrCreateRoAppCustomer({
      phone: normalizedPhone,
      firstName: user.firstName || user.name,
      lastName: user.lastName || '',
      comment: '',
    });
  }

  if (!clientId) {
    res.json([]);
    return;
  }

  try {
    // 1. Тягнемо всі замовлення (можна додати пагінацію, фільтри тощо)
    const resp = await roappApi.get('orders', {
      params: {
        client_id: clientId,
        branch_id: MY_BRANCH_ID,
      },
    });

    const ordersRaw = Array.isArray(resp?.data?.data) ? resp.data.data : [];

    // 2. Для кожного замовлення — дотягуємо items
    const ordersWithItems = await Promise.all(
      ordersRaw.map(async (order) => {
        let itemsRaw = [];
        try {
          const itemsResp = await roappApi.get(`orders/${order.id}/items`);
          itemsRaw = Array.isArray(itemsResp?.data?.data) ? itemsResp.data.data : [];
        } catch (err) {
          console.error(
            `[ROAPP] getMyOrders items error for order ${order.id}:`,
            err?.response?.data || err.message
          );
        }

        const items = await mapItemsWithProducts(itemsRaw);

        const statusObj = order.status || order.status_id || null;
        const { title: statusTitle, isPaid, isDelivered } = mapOrderStatus(statusObj);

        const totalFromItems = items.reduce(
          (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
          0
        );

        const total =
          order.total ??
          order.total_price ??
          order.totalPrice ??
          order.totalSum ??
          order.amount ??
          order.sum ??
          totalFromItems;

        return {
          id: order.id,
          number: order.number || order.id,
          created_at: order.created_at || order.createdAt,
          total,
          totalFromItems,
          status: statusTitle,
          statusColor: statusObj?.color || '#888888',
          isPaid,
          isDelivered,
          items,
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    console.error('[ROAPP] getMyOrders error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося завантажити список ваших замовлень.');
  }
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
