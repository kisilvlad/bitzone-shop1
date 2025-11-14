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
    item.productId ??
    item.product_id ??
    item.roappId ??
    item.roAppId ??
    null;

  const quantity = Number(quantityRaw) || 1;
  const price = Number(priceRaw) || 0;
  const name = String(nameRaw).trim() || 'Товар';

  return {
    name,
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
        phone: normalizedPhone,
      },
    ],
  };

  if (email) {
    payload.emails = [{ email }];
  }

  try {
    const createResponse = await roappApi.post('contacts/people', payload);
    return createResponse.data.id;
  } catch (err) {
    console.error(
      '[ROAPP] Помилка створення клієнта:',
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

    // Захист від кривих даних
    if (!item.name) continue;
    if (!item.quantity || item.quantity <= 0) continue;

    const price = Number.isFinite(item.price) ? item.price : 0;

    const payload = {
      title: item.name,
      name: item.name,
      quantity: item.quantity,
      price,
      total_sum: price * item.quantity,
    };

    if (item.productId) {
      payload.product_id = item.productId;
    }

    try {
      await roappApi.post(`orders/${orderId}/items`, payload);
      successItems += 1;
    } catch (err) {
      console.error(
        '[ROAPP] Помилка додавання товару до замовлення:',
        {
          orderId,
          payload,
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
    status: createdOrder.status
      ? createdOrder.status.title || 'В обробці'
      : 'В обробці',
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

  let personId = user.roAppId || null;

  try {
    const [orderResponse, itemsResponse] = await Promise.all([
      roappApi.get(`orders/${orderId}`),
      roappApi.get(`orders/${orderId}/items`),
    ]);

    const roOrder = orderResponse.data;
    const roItems = itemsResponse.data?.data || [];

    if (!isAdmin && personId && roOrder.client_id && roOrder.client_id !== personId) {
      res.status(403);
      throw new Error('У вас немає доступу до цього замовлення.');
    }

    let clientData = null;

    if (roOrder.client_id) {
      try {
        const clientResponse = await roappApi.get(
          `contacts/people/${roOrder.client_id}`
        );
        clientData = clientResponse.data;
      } catch (err) {
        console.error(
          '[getOrderById] Помилка отримання клієнта з ROAPP:',
          err?.response?.data || err.message
        );
      }
    }

    const items = roItems.map((item) => {
      const name =
        item.name ||
        item.title ||
        item.product_name ||
        'Товар';

      const quantity =
        item.quantity ??
        item.qty ??
        1;

      const price =
        item.price ??
        item.unit_price ??
        item.total ??
        0;

      const lineTotal =
        item.total_sum ??
        item.total ??
        price * quantity;

      const image =
        item.image ||
        item.product_image ||
        null;

      return {
        id: item.id,
        productId: item.product_id || null,
        name,
        quantity,
        price,
        lineTotal,
        image,
      };
    });

    const statusTitle =
      roOrder.status?.title ||
      roOrder.status_title ||
      'В обробці';

    const statusColor =
      roOrder.status?.color ||
      '#888888';

    const total =
      roOrder.total_sum ??
      roOrder.total ??
      roOrder.amount ??
      0;

    const responsePayload = {
      id: roOrder.id,
      createdAt:
        roOrder.created_at ||
        roOrder.createdAt ||
        roOrder.created_at_iso ||
        null,
      status: statusTitle,
      statusColor,
      total,
      items,
      client: clientData
        ? {
            id: clientData.id,
            firstName: clientData.first_name,
            lastName: clientData.last_name,
            phones: clientData.phones || [],
            emails: clientData.emails || [],
          }
        : null,
      raw: {
        order: roOrder,
      },
    };

    res.json(responsePayload);
  } catch (err) {
    console.error(
      '[getOrderById] Помилка отримання замовлення:',
      err?.response?.data || err.message
    );
    res.status(500);
    throw new Error('Не вдалося завантажити замовлення');
  }
});

/* =========================================================
   @desc    Позначити замовлення як оплачене (заглушка)
   @route   PUT /api/orders/:id/pay
   @access  Private
   ========================================================= */
const updateOrderToPaid = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: 'Цей ендпоінт поки не оновлює статус в ROAPP. Додай тут інтеграцію за потреби.',
  });
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

  let personId = user.roAppId || null;

  if (!personId) {
    const phone = user.phone || user.phoneNumber;
    if (!phone) {
      return res.json([]);
    }

    const normalizedPhone = normalizePhone(phone);

    try {
      const searchResponse = await roappApi.get('contacts/people', {
        params: { 'phones[]': normalizedPhone },
      });

      const people = searchResponse?.data?.data || [];
      if (people.length) {
        personId = people[0].id;
        try {
          user.roAppId = personId;
          if (typeof user.save === 'function') {
            await user.save();
          }
        } catch (err) {
          console.error('[getMyOrders] Не вдалося зберегти roAppId користувача:', err.message);
        }
      }
    } catch (err) {
      console.error(
        '[getMyOrders] Помилка пошуку клієнта по телефону:',
        err?.response?.data || err.message
      );
      return res.json([]);
    }
  }

  if (!personId) {
    return res.json([]);
  }

  try {
    const { data } = await roappApi.get('orders', {
      params: {
        client_id: personId,
        per_page: 50,
        sort: '-created_at',
      },
    });

    const rows = data?.data || [];

    const orders = rows.map((order) => {
      const statusObj = order.status || {};
      const statusTitle =
        statusObj.title ||
        order.status_title ||
        'В обробці';

      const isPaid =
        order.is_paid ??
        order.paid ??
        false;

      const isDelivered =
        order.is_delivered ??
        order.delivered ??
        false;

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
  } catch (err) {
    console.error(
      '[getMyOrders] Помилка отримання замовлень з ROAPP:',
      err?.response?.data || err.message
    );
    res.status(500);
    throw new Error('Не вдалося отримати список замовлень');
  }
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
