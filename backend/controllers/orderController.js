// backend/controllers/orderController.js

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

// ПІДЛАШТУЙ під свої значення з ROAPP, якщо треба
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

// --- Хелпер: нормалізація телефону під ROAPP (тільки цифри) ---
const normalizePhone = (phone) => {
  return String(phone || '').replace(/\D/g, '');
};

// --- Хелпер: універсальна нормалізація айтема з кошика ---
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

// --- Хелпер: знайти або створити клієнта в ROAPP за телефоном ---
const findOrCreateRoAppCustomer = async ({ phone, firstName, lastName, email }) => {
  if (!phone) {
    throw new Error('Немає телефону клієнта для створення контакту в ROAPP');
  }

  const normalizedPhone = normalizePhone(phone);

  // 1) шукаємо по телефону
  try {
    const searchResponse = await roappApi.get('contacts/people', {
      params: { 'phones[]': normalizedPhone },
    });

    const people = searchResponse?.data?.data || [];
    if (people.length > 0) {
      return people[0].id;
    }
  } catch (err) {
    console.error(
      '[ROAPP] Помилка пошуку клієнта за телефоном:',
      err?.response?.data || err.message
    );
  }

  // 2) створюємо, якщо не знайшли
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
    console.error(
      '[ROAPP] Не вдалося створити клієнта:',
      err?.response?.data || err.message
    );
    throw new Error('Не вдалося створити клієнта в CRM');
  }
};

// --- Хелпер: зібрати коментар до замовлення ---
const buildOrderComment = (customerData) => {
  const parts = [];

  if (customerData.delivery === 'self-pickup') {
    parts.push('Доставка: Самовивіз (Київ)');
  } else if (customerData.delivery) {
    parts.push(`Доставка: ${customerData.delivery}`);
  }

  if (customerData.city) parts.push(`Місто: ${customerData.city}`);
  if (customerData.address) parts.push(`Адреса: ${customerData.address}`);
  if (customerData.comment) parts.push(`Коментар клієнта: ${customerData.comment}`);
  if (customerData.payment) parts.push(`Оплата: ${customerData.payment}`);

  return parts.join(' | ');
};

/* =========================================================
   @desc    Створити нове замовлення
   @route   POST /api/orders
   @access  Public / Optional Auth
   ========================================================= */
const createOrder = asyncHandler(async (req, res) => {
  const { customerData, cartItems } = req.body;

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
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

  // 1) Визначаємо client_id в ROAPP
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

  // 2) Створюємо замовлення в ROAPP
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
    console.error(
      '[ROAPP] Помилка при створенні замовлення:',
      err?.response?.data || err.message
    );
    res.status(500);
    throw new Error('Не вдалося створити замовлення в CRM.');
  }

  const orderId = createdOrder.id;

  // 3) Додаємо позиції до замовлення
  let successItems = 0;

  for (const rawItem of cartItems) {
    const item = normalizeCartItem(rawItem);

    try {
      const payload = {
        title: item.name,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      };

      if (item.productId) {
        payload.product_id = item.productId;
      }

      await roappApi.post(`orders/${orderId}/items`, payload);
      successItems += 1;
    } catch (err) {
      console.error(
        '[ROAPP] Помилка додавання товару до замовлення:',
        {
          orderId,
          item,
          error: err?.response?.data || err.message,
        }
      );
      // Замовлення вже створене, просто не додаємо цю позицію
    }
  }

  if (successItems === 0) {
    console.warn(
      `[ROAPP] Жодна позиція не була додана до замовлення ${orderId}.`
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
    status: createdOrder.status ? (createdOrder.status.title || 'В обробці') : 'В обробці',
  });
});

/* =========================================================
   @desc    Отримати деталі конкретного замовлення
   @route   GET /api/orders/:id
   @access  Private
   ========================================================= */
const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Необхідна авторизація.');
  }

  const isAdmin = !!user.isAdmin;

  // 1) Підтягуємо / відновлюємо clientId для користувача
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
          if (typeof user.save === 'function') {
            await user.save();
          }
        } catch (err) {
          console.error('[getOrderById] Не вдалося зберегти roAppId користувача:', err.message);
        }
      }
    } catch (err) {
      console.error(
        '[getOrderById] Помилка пошуку клієнта по телефону:',
        err?.response?.data || err.message
      );
    }
  }

  // 2) Тягуємо замовлення з ROAPP
  let orderData;
  try {
    const { data } = await roappApi.get(`orders/${orderId}`);
    orderData = data;
  } catch (err) {
    console.error(
      '[ROAPP] Помилка getOrderById (orders/:id):',
      err?.response?.data || err.message
    );
    if (err?.response?.status === 404) {
      res.status(404);
      throw new Error('Замовлення не знайдено.');
    }
    res.status(500);
    throw new Error('Не вдалося отримати замовлення.');
  }

  // 3) Визначаємо client_id для замовлення
  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id ??
    null;

  // 4) Перевірка доступу (мʼякша, ніж раніше)
  if (!isAdmin && clientId && rawClientId && String(clientId) !== String(rawClientId)) {
    console.warn(
      `[getOrderById] Користувач ${user._id} з roAppId=${clientId} намагається отримати замовлення ${orderId} клієнта ${rawClientId}`
    );
    res.status(403);
    throw new Error('У вас немає доступу до цього замовлення.');
  }
  // Якщо clientId або rawClientId відсутні – не ріжемо, щоб не ламати історичні замовлення / гостьові.

  // 5) Тягуємо items
  let items = [];
  try {
    const { data } = await roappApi.get(`orders/${orderId}/items`);
    if (Array.isArray(data?.data)) {
      items = data.data;
    } else if (Array.isArray(data)) {
      items = data;
    }
  } catch (err) {
    console.error(
      '[ROAPP] Помилка отримання позицій замовлення:',
      err?.response?.data || err.message
    );
  }

  const mappedItems = items.map((it) => ({
    id: it.id,
    name: it.name || it.product_name || 'Товар',
    quantity: it.quantity || it.qty || 1,
    price: Number(it.price) || 0,
    image: it.image || it.product_image || '/assets/images/placeholder-product.png',
  }));

  const totalFromItems = mappedItems.reduce(
    (s, i) => s + i.price * i.quantity,
    0
  );

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
    items: mappedItems,
  };

  res.json(result);
});

/* =========================================================
   @desc    Позначити замовлення як оплачене (заглушка)
   @route   PUT /api/orders/:id/pay
   @access  Private
   ========================================================= */
const updateOrderToPaid = asyncHandler(async (req, res) => {
  res.json({ message: 'Статус оплати оброблено (поки що без інтеграції з ROAPP).' });
});

/* =========================================================
   @desc    "Повідомити мене" з картки товару
   @route   POST /api/orders/notify-me
   @access  Public
   ========================================================= */
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

/* =========================================================
   @desc    Отримати замовлення поточного користувача
   @route   GET /api/orders
   @access  Private
   ========================================================= */
const getMyOrders = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    res.status(401);
    throw new Error('Необхідна авторизація.');
  }

  let clientId = user.roAppId || null;

  // Фолбек: якщо roAppId не збережений, пробуємо знайти по телефону
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
          if (typeof user.save === 'function') {
            await user.save();
          }
        } catch (err) {
          console.error('[getMyOrders] Не вдалося зберегти roAppId в користувача:', err.message);
        }
      }
    } catch (err) {
      console.error(
        '[getMyOrders] Помилка пошуку клієнта по телефону:',
        err?.response?.data || err.message
      );
    }
  }

  if (!clientId) {
    console.warn('[getMyOrders] Не вдалося визначити clientId для користувача:', {
      userId: user._id,
      roAppId: user.roAppId,
      phone: user.phone,
    });
    return res.json([]);
  }

  // 1) тягнемо список замовлень
  let allOrdersRaw = [];
  try {
    const { data: raw } = await roappApi.get('orders', {
      params: {
        sort: '-created_at',
        pageSize: 100,
      },
    });

    if (Array.isArray(raw?.data)) {
      allOrdersRaw = raw.data;
    } else if (Array.isArray(raw)) {
      allOrdersRaw = raw;
    } else {
      console.warn('[getMyOrders] Неочікуваний формат відповіді /orders:', raw);
    }
  } catch (err) {
    console.error(
      '[getMyOrders] Помилка отримання замовлень з ROAPP:',
      err?.response?.data || err.message
    );
    res.status(500);
    throw new Error('Не вдалося завантажити історію замовлень.');
  }

  // 2) Фільтруємо по client_id
  const myOrdersRaw = allOrdersRaw.filter((order) => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId != null && String(rawClientId) === String(clientId);
  });

  // 3) Приводимо до формату, який очікує фронт
  const orders = myOrdersRaw.map((order) => {
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
        0,
      status: statusTitle,
      statusColor: statusObj.color || '#888888',
      isPaid,
      isDelivered,
    };
  });

  res.json(orders);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
