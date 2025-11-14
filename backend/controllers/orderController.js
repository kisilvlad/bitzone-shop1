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

  return {
    name: String(nameRaw),
    quantity,
    price,
    productId,
  };
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

  // 1) Збираємо всі можливі roappId товарів (і з плоских, і з вкладених полів)
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

  // 2) Підтягуємо товари з нашої БД за roappId
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

  // 3) Формуємо фінальний масив айтемів з нормалізованими name / image / price / qty
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

  // Якщо користувач залогінений і в нього вже збережений roAppId – використовуємо
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

  let successItems = 0;

  // Додаємо позиції в замовлення ROAPP
  for (const cartItem of cartItems) {
    const normalized = normalizeCartItem(cartItem);

    // Спробувати визначити entity_id (ід товару/сутності в ROAPP)
    let entityId = null;

    // З фронта ти отримуєш id, який є entity_id ROAPP (як видно з логів: 57046648 тощо)
    if (cartItem.id && !Number.isNaN(Number(cartItem.id))) {
      entityId = Number(cartItem.id);
    } else if (normalized.productId && !Number.isNaN(Number(normalized.productId))) {
      entityId = Number(normalized.productId);
    }

    if (!entityId) {
      console.error('[ROAPP] createOrder: не вдалося визначити entity_id для позиції', {
        cartItem,
        normalized,
      });
      continue; // пропускаємо цю позицію, але не валимо все замовлення
    }

    // ================== ПОЧАТОК ВИПРАВЛЕННЯ v2 ==================
    const payload = {
      title: normalized.name,
      quantity: normalized.quantity,
      assignee_id: MY_ASSIGNEE_ID,
      entity_id: entityId,
      price: normalized.price,
      cost: normalized.price,
      discount: {
        type: 'percentage', // ВИПРАВЛЕНО: 'percent' -> 'percentage' згідно логу
        value: 0,
        percent: 0,
        currency_id: null, // Ставимо null замість 0, це безпечніше
      },
      warranty: {
        period: 0, // ВИПРАВЛЕНО: 'type' -> 'period' (припущення)
        unit: 'month', // ВИПРАВЛЕНО: 'value' -> 'unit' (припущення)
      },
    };
    // =================== КІНЕЦЬ ВИПРАВЛЕННЯ v2 ===================

    try {
      await roappApi.post(`orders/${orderId}/items`, payload);
      successItems += 1;
    } catch (err) {
      const errorJson = (() => {
        try {
          return JSON.stringify(err?.response?.data || {}, null, 2);
        } catch {
          return null;
        }
      })();

      console.error('[ROAPP] add item to order error:', {
        orderId,
        payload,
        status: err?.response?.status,
        error: err?.response?.data || err.message,
        errorJson,
      });
    }
  }

  if (!successItems) {
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

  // 1. Визначаємо clientId для користувача (roAppId або шукаємо по телефону)
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

  // 2. Тягуємо замовлення з ROAPP
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

  // 3. Визначаємо client_id для замовлення
  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id ??
    null;

  // 4. Перевірка доступу
  if (!isAdmin && clientId && rawClientId && String(clientId) !== String(rawClientId)) {
    res.status(403);
    throw new Error('У вас немає доступу до цього замовлення.');
  }

  // 5. Тягнемо позиції
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

  // 1. Тягнемо всі замовлення (наприклад останні 50)
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

  // 2. Фільтруємо по client_id
  const myOrdersRaw = allOrdersRaw.filter((order) => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId != null && String(rawClientId) === String(clientId);
  });

  // 3. Для кожного замовлення підтягуємо items
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