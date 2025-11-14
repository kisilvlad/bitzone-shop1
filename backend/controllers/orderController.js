// backend/controllers/orderController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const roappApi = require('../utils/roappApi');
const Product = require('../models/productModel');

// Константи під твій акаунт ROAPP
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/* ===================== helpers ===================== */

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

/**
 * Нормалізація айтема з кошика
 */
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

  // те, що ми сприймаємо як roapp entity/product id
  const productIdRaw =
    item.roappProductId ??
    item.roAppProductId ??
    item.ro_app_product_id ??
    item.roappId ??
    item.roAppId ??
    item.entity_id ??
    item.productId ??
    item.product_id ??
    item.id ?? // 👈 ОЦЕ ГОЛОВНЕ: id з кошика = entity_id ROAPP
    null;

  const productId =
    productIdRaw != null && !Number.isNaN(Number(productIdRaw))
      ? Number(productIdRaw)
      : null;

  const quantity = Number(quantityRaw) > 0 ? Number(quantityRaw) : 1;
  const price = Number(priceRaw) >= 0 ? Number(priceRaw) : 0;

  return {
    name: String(nameRaw),
    quantity,
    price,
    productId, // кандидат у entity_id для ROAPP
  };
};

/**
 * Спробувати знайти roappId (entity_id) для товару з cartItem
 */
const resolveRoappProductIdFromCartItem = async (rawItem) => {
  try {
    // 1) прямо з cartItem
    const directCandidates = [
      rawItem.roappProductId,
      rawItem.roAppProductId,
      rawItem.ro_app_product_id,
      rawItem.roappId,
      rawItem.roAppId,
      rawItem.entity_id,
      rawItem.productId,
      rawItem.product_id,
      rawItem.id, // 👈 id з кошика теж перевіряємо як entity_id
    ];

    for (const v of directCandidates) {
      if (v == null) continue;
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }

    // 2) з вкладеного product (якщо фронт кладе туди)
    const productObj = rawItem.product || rawItem.productData || null;
    if (productObj) {
      const nestedCandidates = [
        productObj.roappId,
        productObj.roAppId,
        productObj.ro_app_id,
        productObj.productId,
        productObj.product_id,
        productObj.entity_id,
        productObj.id,
      ];
      for (const v of nestedCandidates) {
        if (v == null) continue;
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }

    // 3) через Mongo: шукаємо Product по _id і беремо його roappId
    const mongoIdCandidates = [];
    if (rawItem._id) mongoIdCandidates.push(String(rawItem._id));
    if (rawItem.productId) mongoIdCandidates.push(String(rawItem.productId));
    if (productObj && productObj._id) mongoIdCandidates.push(String(productObj._id));

    const validObjectIds = mongoIdCandidates.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validObjectIds.length) return null;

    const products = await Product.find(
      { _id: { $in: validObjectIds } },
      'roappId'
    ).lean();

    const withRoapp = products.find((p) => p.roappId != null);
    if (withRoapp && withRoapp.roappId != null && !Number.isNaN(Number(withRoapp.roappId))) {
      return Number(withRoapp.roappId);
    }

    return null;
  } catch (err) {
    console.error('[ROAPP] resolveRoappProductIdFromCartItem Mongo lookup error:', err.message);
    return null;
  }
};

const findOrCreateRoAppCustomer = async ({ phone, firstName, lastName, email }) => {
  if (!phone) throw new Error('Немає телефону клієнта для створення контакту');

  const normalizedPhone = normalizePhone(phone);

  // 1. Спробувати знайти по телефону
  try {
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
        title: 'Основний',
        phone: normalizedPhone,
        notify: false,
      },
    ],
  };

  if (email) {
    payload.emails = [
      {
        title: 'Основний',
        email,
        notify: false,
      },
    ];
  }

  try {
    const createResp = await roappApi.post('contacts/people', payload);
    return createResp.data.id;
  } catch (err) {
    console.error('[ROAPP] findOrCreateRoAppCustomer create error:', err?.response?.data || err.message);
    throw new Error('Не вдалося створити клієнта в ROAPP');
  }
};

const buildOrderComment = (customer) => {
  const parts = [];

  if (customer.delivery === 'self-pickup') {
    parts.push('Доставка: Самовивіз (Київ)');
  } else if (customer.delivery) {
    parts.push(`Доставка: ${customer.delivery}`);
  }

  if (customer.city) parts.push(`Місто: ${customer.city}`);
  if (customer.address) parts.push(`Адреса: ${customer.address}`);
  if (customer.payment) parts.push(`Оплата: ${customer.payment}`);
  if (customer.comment) parts.push(`Коментар клієнта: ${customer.comment}`);

  return parts.join(' | ');
};

// map items from ROAPP + підтягнути товари з нашої БД по roappId
const mapItemsWithProducts = async (itemsRaw) => {
  if (!Array.isArray(itemsRaw) || !itemsRaw.length) return [];

  const roappIdsSet = new Set();
  for (const it of itemsRaw) {
    const productObj = it.product || it.catalog_item || it.catalogItem || it.entity || null;

    const pid =
      it.product_id ??
      it.productId ??
      it.entity_id ??
      it.product_id_roapp ??
      (productObj && (productObj.id || productObj.product_id || productObj.entity_id)) ??
      null;

    if (pid != null) {
      const num = Number(pid);
      if (!Number.isNaN(num)) roappIdsSet.add(num);
    }
  }

  let productsByRoappId = {};
  if (roappIdsSet.size) {
    try {
      const roappIds = Array.from(roappIdsSet.values());
      const products = await Product.find(
        { roappId: { $in: roappIds } },
        'roappId name images mainImage image coverImage thumbnail'
      ).lean();

      productsByRoappId = Object.fromEntries(
        products.map((p) => [String(p.roappId), p])
      );
    } catch (err) {
      console.error('[Orders] Не вдалося підтягнути товари з Mongo по roappId:', err.message);
    }
  }

  return itemsRaw.map((it) => {
    const productObj = it.product || it.catalog_item || it.catalogItem || it.entity || null;

    const productRoappIdRaw =
      it.product_id ??
      it.productId ??
      it.entity_id ??
      it.product_id_roapp ??
      (productObj && (productObj.id || productObj.product_id || productObj.entity_id)) ??
      null;

    const productRoappId =
      productRoappIdRaw != null && !Number.isNaN(Number(productRoappIdRaw))
        ? Number(productRoappIdRaw)
        : null;

    const productDoc =
      productRoappId != null ? productsByRoappId[String(productRoappId)] || null : null;

    const qty = Number(it.quantity ?? it.qty ?? it.count ?? 1) || 1;
    const price =
      Number(
        it.price ??
          it.unit_price ??
          it.unitPrice ??
          it.total_price ??
          it.totalPrice ??
          it.amount
      ) || 0;

    const name =
      it.name ||
      it.title ||
      it.product_name ||
      it.productTitle ||
      (productObj && (productObj.title || productObj.name || productObj.product_name)) ||
      (productDoc && productDoc.name) ||
      'Товар';

    const imageFromProductDoc =
      productDoc &&
      (productDoc.mainImage ||
        productDoc.image ||
        productDoc.coverImage ||
        (Array.isArray(productDoc.images) && productDoc.images[0]) ||
        productDoc.thumbnail);

    const imageFromProductObj =
      productObj &&
      (productObj.image ||
        (Array.isArray(productObj.images) &&
          (productObj.images[0]?.image || productObj.images[0])) ||
        productObj.thumbnail ||
        productObj.photo);

    const image =
      imageFromProductDoc ||
      it.image ||
      it.product_image ||
      it.photo ||
      it.thumbnail ||
      imageFromProductObj ||
      null;

    return {
      id: it.id ?? it.item_id ?? it._id,
      productRoappId,
      name,
      image,
      quantity: qty,
      price,
    };
  });
};


/* ===================== controllers ===================== */

// @desc Створити нове замовлення
// @route POST /api/orders
// @access Private (але підтримуємо і гостьове, якщо немає req.user)
const createOrder = asyncHandler(async (req, res) => {
  const { customerData, cartItems } = req.body;

  if (!Array.isArray(cartItems) || !cartItems.length) {
    res.status(400);
    throw new Error('Кошик порожній – немає що оформляти.');
  }
  if (!customerData) {
    res.status(400);
    throw new Error('Відсутні дані клієнта.');
  }

  const {
    firstName,
    lastName,
    phone,
    email,
    city,
    address,
    delivery,
    payment,
    comment,
  } = customerData;

  if (!phone) {
    res.status(400);
    throw new Error('Телефон клієнта є обовʼязковим.');
  }

  let clientId = null;

  if (req.user && req.user.roAppId) {
    clientId = req.user.roAppId;
  } else {
    clientId = await findOrCreateRoAppCustomer({
      phone,
      firstName,
      lastName,
      email,
    });
  }

  // 1. Створюємо замовлення без позицій
  let createdOrder;
  try {
    const { data } = await roappApi.post('orders', {
      client_id: clientId,
      branch_id: MY_BRANCH_ID,
      order_type_id: MY_ORDER_TYPE_ID,
      assignee_id: MY_ASSIGNEE_ID,
      due_date: new Date().toISOString(),
      comment: buildOrderComment({
        firstName,
        lastName,
        phone,
        email,
        city,
        address,
        delivery,
        payment,
        comment,
      }),
    });

    createdOrder = data;
  } catch (err) {
    console.error('[ROAPP] createOrder error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося створити замовлення в ROAPP.');
  }

  const orderId = createdOrder.id;

  // 2. Додаємо позиції
  let successItems = 0;

  for (const rawItem of cartItems) {
    const item = normalizeCartItem(rawItem);

    // entity_id (ID товару/послуги в ROAPP)
    let entityId = item.productId || null;
    if (!entityId) {
      entityId = await resolveRoappProductIdFromCartItem(rawItem);
    }

    if (!entityId) {
      console.error('[ROAPP] createOrder: не вдалося визначити entity_id для позиції', {
        cartItem: rawItem,
        normalized: item,
      });
      continue; // пропускаємо цю позицію, щоб не ламати все замовлення
    }

    const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const unitPrice = Number(item.price) >= 0 ? Number(item.price) : 0;

    // payload згідно з validation ROAPP
    const payload = {
      title: item.name,
      quantity,
      assignee_id: MY_ASSIGNEE_ID,
      entity_id: entityId,
      price: unitPrice,
      cost: unitPrice,
      discount: 0,
      warranty: 0,
    };

    try {
      await roappApi.post(`orders/${orderId}/items`, payload);
      successItems += 1;
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error('[ROAPP] add item to order error:', {
        orderId,
        payload,
        status,
        error: data || err.message,
        errorJson: data ? JSON.stringify(data, null, 2) : undefined,
      });
    }
  }

  if (successItems === 0) {
    console.error('[ROAPP] createOrder: жодна позиція не була успішно додана до замовлення', {
      orderId,
      cartItemsCount: cartItems.length,
    });

    res.status(500);
    throw new Error(
      'Не вдалося додати товари до замовлення в ROAPP. Замовлення не створено – повторіть спробу або звʼяжіться з нами.'
    );
  }

  const totalFromCart = cartItems.reduce((sum, i) => {
    const norm = normalizeCartItem(i);
    return sum + norm.price * norm.quantity;
  }, 0);

  res.status(201).json({
    id: orderId,
    createdAt: createdOrder.created_at || new Date().toISOString(),
    total: createdOrder.total_sum || totalFromCart,
    status: createdOrder.status ? createdOrder.status.title || 'В обробці' : 'В обробці',
  });
});

// @desc Отримати замовлення за ID
// @route GET /api/orders/:id
// @access Private
const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Необхідна авторизація.');
  }

  const isAdmin = !!user.isAdmin;

  let clientId = user.roAppId || null;

  if (!clientId && user.phone) {
    const normalizedPhone = normalizePhone(user.phone);
    try {
      const { data } = await roappApi.get('contacts/people', {
        params: { 'phones[]': normalizedPhone },
      });
      const people = Array.isArray(data?.data) ? data.data : [];
      if (people.length) {
        clientId = people[0].id;
        try {
          user.roAppId = clientId;
          if (typeof user.save === 'function') await user.save();
        } catch (err) {
          console.error('[getOrderById] user save roAppId error:', err.message);
        }
      }
    } catch (err) {
      console.error('[getOrderById] search client by phone error:', err?.response?.data || err.message);
    }
  }

  // 2. Замовлення
  let orderData;
  try {
    const { data } = await roappApi.get(`orders/${orderId}`);
    orderData = data;
  } catch (err) {
    console.error('[ROAPP] getOrderById orders/:id error:', err?.response?.data || err.message);
    if (err?.response?.status === 404) {
      res.status(404);
      throw new Error('Замовлення не знайдено.');
    }
    res.status(500);
    throw new Error('Не вдалося отримати замовлення.');
  }

  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id ??
    null;

  if (!isAdmin && clientId && rawClientId && String(clientId) !== String(rawClientId)) {
    res.status(403);
    throw new Error('У вас немає доступу до цього замовлення.');
  }

  // 3. Позиції
  let itemsRaw = [];
  try {
    const { data } = await roappApi.get(`orders/${orderId}/items`);
    if (Array.isArray(data?.data)) itemsRaw = data.data;
    else if (Array.isArray(data)) itemsRaw = data;
  } catch (err) {
    console.error('[ROAPP] getOrderById items error:', err?.response?.data || err.message);
  }

  const items = await mapItemsWithProducts(itemsRaw);
  const totalFromItems = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const statusObj = orderData.status || {};
  const statusTitle = statusObj.title || statusObj.name || 'В обробці';

  const result = {
    id: orderData.id,
    createdAt:
      orderData.created_at ||
      orderData.createdAt ||
      orderData.created_at_iso ||
      null,
    total:
      orderData.total_sum ??
      orderData.total ??
      orderData.totalSum ??
      orderData.amount ??
      orderData.sum ??
      totalFromItems,
    status: statusTitle,
    statusColor: statusObj.color || '#888888',
    items,
  };

  res.json(result);
});

// @desc Позначити як оплачене (заглушка)
// @route PUT /api/orders/:id/pay
// @access Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  res.json({ message: 'Статус оплати оброблено (поки без інтеграції з ROAPP).' });
});

// @desc "Повідомити мене" з картки товару
// @route POST /api/orders/notify-me
// @access Public
const notifyMe = asyncHandler(async (req, res) => {
  const { productId, productName, phone } = req.body;

  console.log('[notifyMe] Запит від користувача:', {
    productId,
    productName,
    phone,
  });

  res
    .status(200)
    .json({ message: 'Ми отримали ваш запит, звʼяжемося з вами, коли товар зʼявиться.' });
});

// @desc Отримати мої замовлення
// @route GET /api/orders
// @access Private
const getMyOrders = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Необхідна авторизація.');
  }

  let clientId = user.roAppId || null;

  if (!clientId && user.phone) {
    const normalizedPhone = normalizePhone(user.phone);
    try {
      const { data } = await roappApi.get('contacts/people', {
        params: { 'phones[]': normalizedPhone },
      });
      const people = Array.isArray(data?.data) ? data.data : [];
      if (people.length) {
        clientId = people[0].id;
        try {
          user.roAppId = clientId;
          if (typeof user.save === 'function') await user.save();
        } catch (err) {
          console.error('[getMyOrders] user save roAppId error:', err.message);
        }
      }
    } catch (err) {
      console.error('[getMyOrders] search client by phone error:', err?.response?.data || err.message);
    }
  }

  if (!clientId) {
    console.warn('[getMyOrders] Не вдалося визначити clientId:', {
      userId: user._id,
      roAppId: user.roAppId,
      phone: user.phone,
    });
    return res.json([]);
  }

  let allOrdersRaw = [];
  try {
    const { data: raw } = await roappApi.get('orders', {
      params: {
        sort: '-created_at',
        pageSize: 50,
      },
    });

    if (Array.isArray(raw?.data)) allOrdersRaw = raw.data;
    else if (Array.isArray(raw)) allOrdersRaw = raw;
    else console.warn('[getMyOrders] unexpected orders format:', raw);
  } catch (err) {
    console.error('[getMyOrders] get orders error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося завантажити історію замовлень.');
  }

  const myOrdersRaw = allOrdersRaw.filter((order) => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId != null && String(rawClientId) === String(clientId);
  });

  const ordersWithItems = await Promise.all(
    myOrdersRaw.map(async (order) => {
      let itemsRaw = [];
      try {
        const { data } = await roappApi.get(`orders/${order.id}/items`);
        if (Array.isArray(data?.data)) itemsRaw = data.data;
        else if (Array.isArray(data)) itemsRaw = data;
      } catch (err) {
        console.error('[getMyOrders] get items for order error:', {
          orderId: order.id,
          error: err?.response?.data || err.message,
        });
      }
      const items = await mapItemsWithProducts(itemsRaw);

      const totalFromItems = items.reduce((s, i) => s + i.price * i.quantity, 0);

      const statusObj = order.status || {};
      const statusTitle = statusObj.title || statusObj.name || 'В обробці';

      const isPaid =
        statusTitle === 'Оплачено' ||
        statusTitle === 'Виконано' ||
        statusTitle === 'Paid' ||
        statusTitle === 'Completed';

      const isDelivered =
        statusTitle === 'Виконано' ||
        statusTitle === 'Delivered' ||
        statusTitle === 'Complete';

      return {
        id: order.id,
        createdAt: order.created_at || order.createdAt || order.created_at_iso,
        total:
          order.total_sum ??
          order.total ??
          order.totalSum ??
          order.amount ??
          order.sum ??
          totalFromItems,
        status: statusTitle,
        statusColor: statusObj.color || '#888888',
        isPaid,
        isDelivered,
        items,
      };
    })
  );

  res.json(ordersWithItems);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
