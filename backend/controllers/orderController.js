// backend/controllers/orderController.js
// Фікс: коректне створення замовлення + додавання товарів в ROAPP
// та безпечний getMyOrders і getOrderById тільки для поточного юзера

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { customerData, cartItems } = req.body;

  if (!cartItems || cartItems.length === 0) {
    res.status(400);
    throw new Error('Неможливо створити замовлення без товарів');
  }

  // 1. Визначаємо клієнта в ROAPP
  let customerId;

  if (req.user && typeof req.user.roAppId === 'number') {
    customerId = req.user.roAppId;
    console.log('[ROAPP] Використовую існуючого клієнта з roAppId =', customerId);
  } else {
    console.log('[ROAPP] Пошук клієнта за телефоном:', customerData.phone);

    const searchResponse = await roappApi.get('contacts/people', {
      params: { 'phones[]': customerData.phone },
    });

    if (
      searchResponse.data &&
      Array.isArray(searchResponse.data.data) &&
      searchResponse.data.data.length > 0
    ) {
      customerId = searchResponse.data.data[0].id;
      console.log('[ROAPP] Знайшли існуючого клієнта в ROAPP, id =', customerId);
    } else {
      const newCustomerPayload = {
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        phones: [
          {
            title: 'Основний',
            phone: customerData.phone,
            notify: false,
          },
        ],
        emails: customerData.email
          ? [
              {
                title: 'Основний',
                email: customerData.email,
                notify: false,
              },
            ]
          : [],
        address: `${customerData.city}, ${customerData.address}`,
      };

      console.log('[ROAPP] Створюємо нового клієнта. Payload:', newCustomerPayload);

      const createCustomerResponse = await roappApi.post(
        'contacts/people',
        newCustomerPayload
      );

      customerId = createCustomerResponse.data.id;
      console.log('[ROAPP] Створено нового клієнта в ROAPP, id =', customerId);
    }
  }

  // 2. Створюємо замовлення (без товарів, тільки шапку)
  let orderId;

  try {
    const { data } = await roappApi.post('orders', {
      client_id: customerId,
      branch_id: MY_BRANCH_ID,
      order_type_id: MY_ORDER_TYPE_ID,
      assignee_id: MY_ASSIGNEE_ID,
      due_date: new Date().toISOString(),
    });

    orderId = data.id;
    console.log(`[ROAPP] Замовлення створено. orderId = ${orderId}`);
  } catch (error) {
    console.error('[ROAPP] Помилка при створенні замовлення:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    res.status(500);
    throw new Error('Не вдалося створити замовлення в CRM (ROAPP)');
  }

  // 3. Додаємо товари в замовлення як items
  for (const item of cartItems) {
    try {
      const payload = {
        entity_id: item.id, // ID товару з ROAPP
        quantity: item.qty,
        price: item.price,
        assignee_id: MY_ASSIGNEE_ID,
        cost: 0,
        discount: {
          type: 'value',
          percentage: 0,
          amount: 0,
          sponsor: 'staff',
        },
        warranty: {
          period: '0',
          periodUnits: 'months',
        },
      };

      console.log('[ROAPP] Додаємо позицію в замовлення:', {
        orderId,
        payload,
      });

      const { data } = await roappApi.post(
        `orders/${orderId}/items`,
        payload
      );

      console.log('[ROAPP] Позицію успішно додано:', data);
    } catch (error) {
      console.error('[ROAPP] Помилка при додаванні товару до замовлення:', {
        orderId,
        itemId: item.id,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      res.status(500);
      throw new Error('Не вдалося додати товар до замовлення в CRM (ROAPP)');
    }
  }

  // 4. Якщо дійшли сюди — замовлення + товари в ROAPP створені
  res.status(201).json({ success: true, orderId });
});

// @desc    Get order by ID (для сторінки деталей замовлення)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const { id: orderId } = req.params;
  const userId = req.user.roAppId;
  const isAdmin = req.user.isAdmin;

  let orderData;
  let itemsData = [];

  try {
    // Тягнемо і сам ордер, і його items
    const [orderResp, itemsResp] = await Promise.all([
      roappApi.get(`orders/${orderId}`),
      roappApi
        .get(`orders/${orderId}/items`)
        .catch((err) => {
          console.warn('[ROAPP] Не вдалося отримати items замовлення:', {
            orderId,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
          return { data: null };
        }),
    ]);

    orderData = orderResp.data;

    if (itemsResp.data) {
      if (Array.isArray(itemsResp.data.data)) {
        itemsData = itemsResp.data.data;
      } else if (Array.isArray(itemsResp.data)) {
        itemsData = itemsResp.data;
      } else if (Array.isArray(itemsResp.data.items)) {
        itemsData = itemsResp.data.items;
      }
    }
  } catch (error) {
    console.error('[ROAPP] Помилка при отриманні замовлення по ID:', {
      orderId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    res.status(500);
    throw new Error('Не вдалося отримати замовлення з CRM (ROAPP)');
  }

  // 1) Безпека — перевіряємо, що це саме замовлення цього клієнта
  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id;

  if (!isAdmin && rawClientId && String(rawClientId) !== String(userId)) {
    console.error(
      '[ROAPP] Спроба доступу до чужого замовлення:',
      'orderId =',
      orderId,
      'client_id =',
      rawClientId,
      'user.roAppId =',
      userId
    );
    res.status(403);
    throw new Error('Доступ заборонено');
  }

  // 2) Нормалізуємо статус
  const statusTitle =
    orderData.status?.title ||
    orderData.status?.name ||
    orderData.status ||
    'В обробці';

  const statusColor = orderData.status?.color || '#1973E1';

  // 3) Якщо items не прийшли окремим ендпоінтом — пробуємо взяти з самого ордеру
  if (!itemsData.length) {
    itemsData =
      orderData.items ||
      orderData.order_items ||
      orderData.lines ||
      [];
  }

  // 4) Нормалізуємо items (name, image, price, quantity)
  const items = itemsData.map((it, index) => {
    const quantity =
      Number(it.quantity ?? it.qty ?? 1) || 1;

    const product =
      it.product ||
      it.entity ||
      it.asset ||
      it.bundle ||
      {};

    const price =
      Number(
        it.price ??
        it.unit_price ??
        it.sum ??
        (it.total_sum && quantity
          ? it.total_sum / quantity
          : 0)
      ) || 0;

    const name =
      it.title ||
      it.name ||
      it.product_name ||
      product.title ||
      product.name ||
      product.product_name ||
      'Товар';

    const image =
      it.image ||
      it.image_url ||
      it.picture ||
      product.image ||
      product.image_url ||
      product.picture ||
      product.photo ||
      null;

    return {
      id: it.id || index,
      roappItemId: it.id,
      entityId: it.entity_id || product.id,
      quantity,
      price,
      name,
      image,
    };
  });

  // 5) Рахуємо total
  const total =
    orderData.total_sum ??
    orderData.total ??
    orderData.totalSum ??
    items.reduce(
      (sum, it) => sum + (it.price || 0) * (it.quantity || 1),
      0
    );

  // 6) Віддаємо фронту удобний формат
  res.json({
    id: orderData.id,
    createdAt: orderData.created_at || orderData.createdAt,
    status: statusTitle,
    statusColor,
    total,
    items,
  });
});

// @desc    Update order to paid (поки просто заглушка)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
  res.json({ id, isPaid: true, paidAt: new Date() });
});

// @desc    Notify me when product is available
// @route   POST /api/orders/notify-me
// @access  Public
const notifyMe = asyncHandler(async (req, res) => {
  const { productId, productName, phone } = req.body;
  if (!productId || !productName || !phone) {
    res.status(400);
    throw new Error('Недостатньо даних для створення запиту');
  }
  res.status(200).json({ success: true, message: 'Запит прийнято!' });
  try {
    console.log('[NOTIFY-ME]', { productId, productName, phone });
  } catch (error) {
    console.error('Помилка при обробці notify-me:', error);
  }
});

// @desc    Get my orders (для особистого кабінету)
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.roAppId;

  // Перевірка безпеки
  if (typeof userId !== 'number') {
    console.error(
      `Критична помилка безпеки: getMyOrders викликано без числового roAppId. User Mongoose ID: ${req.user._id}.`
    );
    res.status(401);
    throw new Error('Не вдалося верифікувати ID користувача для CRM');
  }

  let raw = [];

  try {
    // Забираємо всі замовлення, далі відфільтруємо по клієнту
    const { data: response } = await roappApi.get('orders', {
      params: {
        sort: '-created_at',
      },
    });

    if (response && Array.isArray(response.data)) {
      raw = response.data;
    } else if (Array.isArray(response)) {
      raw = response;
    } else {
      raw = [];
    }
  } catch (error) {
    console.error('[ROAPP] Помилка при отриманні списку замовлень:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    res.status(500);
    throw new Error('Не вдалося отримати список замовлень з CRM (ROAPP)');
  }

  // 1) Фільтруємо тільки замовлення цього юзера
  const filtered = raw.filter((order) => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId && String(rawClientId) === String(userId);
  });

  // 2) Для кожного замовлення підтягуємо items і рахуємо total
  const orders = await Promise.all(
    filtered.map(async (order) => {
      let itemsData = [];

      try {
        const itemsResp = await roappApi
          .get(`orders/${order.id}/items`)
          .catch((err) => {
            console.warn('[ROAPP] Не вдалося отримати items замовлення в getMyOrders:', {
              orderId: order.id,
              status: err.response?.status,
              data: err.response?.data,
              message: err.message,
            });
            return { data: null };
          });

        if (itemsResp.data) {
          if (Array.isArray(itemsResp.data.data)) {
            itemsData = itemsResp.data.data;
          } else if (Array.isArray(itemsResp.data)) {
            itemsData = itemsResp.data;
          } else if (Array.isArray(itemsResp.data.items)) {
            itemsData = itemsResp.data.items;
          }
        }
      } catch (e) {
        console.warn('[ROAPP] Помилка при завантаженні items (getMyOrders):', {
          orderId: order.id,
          message: e.message,
        });
      }

      // Нормалізація items така сама, як у getOrderById
      const items = itemsData.map((it, index) => {
        const quantity = Number(it.quantity ?? it.qty ?? 1) || 1;

        const product =
          it.product ||
          it.entity ||
          it.asset ||
          it.bundle ||
          {};

        const price =
          Number(
            it.price ??
            it.unit_price ??
            it.sum ??
            (it.total_sum && quantity
              ? it.total_sum / quantity
              : 0)
          ) || 0;

        const name =
          it.title ||
          it.name ||
          it.product_name ||
          product.title ||
          product.name ||
          product.product_name ||
          'Товар';

        const image =
          it.image ||
          it.image_url ||
          it.picture ||
          product.image ||
          product.image_url ||
          product.picture ||
          product.photo ||
          null;

        return {
          id: it.id || index,
          roappItemId: it.id,
          entityId: it.entity_id || product.id,
          quantity,
          price,
          name,
          image,
        };
      });

      const statusTitle =
        order.status?.title || order.status?.name || order.status || 'В обробці';

      const statusColor = order.status?.color || '#888888';

      const isPaid =
        /оплач|paid|completed|викон/i.test(statusTitle || '');

      const isDelivered =
        /delivered|complete|викон/i.test(statusTitle || '');

      const total =
        order.total_sum ??
        order.total ??
        order.totalSum ??
        items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

      return {
        id: order.id,
        createdAt: order.created_at || order.createdAt,
        total,
        status: statusTitle,
        statusColor,
        isPaid,
        isDelivered,
        items,
      };
    })
  );

  res.json(orders);
});


module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
