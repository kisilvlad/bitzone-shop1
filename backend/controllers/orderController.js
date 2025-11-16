// backend/controllers/orderController.js
// Створення замовлення в ROAPP + витяг замовлень/деталей для кабінету

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/**
 * Мапінг items ROAPP → фронтовий формат
 */
const mapRoappItems = (rawItems = []) => {
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((it, index) => ({
    id: it.id || index,
    name: it.name || it.title || it.product_name || 'Товар',
    quantity: Number(it.quantity) || 1,
    price: Number(it.price) || 0,
    image:
      it.image ||
      it.image_url ||
      (it.product && (it.product.image || it.product.image_url)) ||
      '/assets/images/placeholder-product.png',
    entityId: it.entity_id || it.product_id || null,
  }));
};

const calcTotalFromItems = (items = []) =>
  items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);

/**
 * ================= CREATE ORDER =================
 */
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

      const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);

      customerId = createCustomerResponse.data.id;
      console.log('[ROAPP] Створено нового клієнта в ROAPP, id =', customerId);
    }
  }

  // 2. Створюємо замовлення (шапка)
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
        entity_id: item.id, // ID товару в ROAPP
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

      const { data } = await roappApi.post(`orders/${orderId}/items`, payload);

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

  res.status(201).json({ success: true, orderId });
});

/**
 * ================= ORDER BY ID (деталі) =================
 */
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const { id: orderId } = req.params;
  const userId = req.user.roAppId;
  const isAdmin = req.user.isAdmin;

  let orderData;
  let itemsData = [];

  try {
    const { data } = await roappApi.get(`orders/${orderId}`);
    orderData = data;
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

  // перевірка доступу
  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id;

  if (String(rawClientId) !== String(userId) && !isAdmin) {
    res.status(403);
    throw new Error('Доступ заборонено');
  }

  // тягнемо items
  try {
    const { data: itemsResp } = await roappApi.get(`orders/${orderId}/items`);
    if (Array.isArray(itemsResp?.data)) {
      itemsData = itemsResp.data;
    } else if (Array.isArray(itemsResp)) {
      itemsData = itemsResp;
    }
  } catch (error) {
    console.error('[ROAPP] Не вдалося отримати items замовлення:', {
      orderId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    // не валимо весь запит, просто залишимо items = []
  }

  const items = mapRoappItems(itemsData);
  const totalFromItems = calcTotalFromItems(items);

  const statusTitle =
    orderData.status?.title || orderData.status?.name || orderData.status || 'Нове';

  const isPaid =
    statusTitle === 'Оплачено' ||
    statusTitle === 'Виконано' ||
    statusTitle === 'Paid' ||
    statusTitle === 'Completed';

  const isDelivered =
    statusTitle === 'Виконано' ||
    statusTitle === 'Delivered' ||
    statusTitle === 'Complete';

  const mapped = {
    id: orderData.id,
    createdAt: orderData.created_at || orderData.createdAt,
    status: statusTitle,
    statusColor: orderData.status?.color || '#1973E1',
    isPaid,
    isDelivered,
    total:
      totalFromItems ||
      orderData.total_sum ||
      orderData.total ||
      orderData.totalSum ||
      0,
    items,
  };

  console.log('[OrderDetail] Повертаємо в кабінет:', mapped);

  res.json(mapped);
});

/**
 * ================= PAID (заглушка) =================
 */
// @desc    Update order to paid (поки просто заглушка)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
  res.json({ id, isPaid: true, paidAt: new Date() });
});

/**
 * ================= NOTIFY ME =================
 */
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

/**
 * ================= MY ORDERS (список для акаунта) =================
 */
// @desc    Get my orders (для особистого кабінету)
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.roAppId;

  if (typeof userId !== 'number') {
    console.error(
      `Критична помилка безпеки: getMyOrders викликано без числового roAppId. User Mongoose ID: ${req.user._id}.`
    );
    res.status(401);
    throw new Error('Не вдалося верифікувати ID користувача для CRM');
  }

  let raw = [];

  try {
    const { data: response } = await roappApi.get('orders', {
      params: {
        sort: '-created_at',
        // якщо ROAPP дозволяє — можна додати фільтр по клієнту:
        // 'client_id[]': userId,
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

  // Фільтр по конкретному клієнту
  const filtered = raw.filter((order) => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId && String(rawClientId) === String(userId);
  });

  // Підтягуємо items для кожного замовлення ПАРАЛЕЛЬНО
  const orders = await Promise.all(
    filtered.map(async (order) => {
      let itemsData = [];
      try {
        const { data: itemsResp } = await roappApi.get(`orders/${order.id}/items`);
        if (Array.isArray(itemsResp?.data)) {
          itemsData = itemsResp.data;
        } else if (Array.isArray(itemsResp)) {
          itemsData = itemsResp;
        }
      } catch (error) {
        console.error('[ROAPP] Не вдалося отримати items замовлення:', {
          orderId: order.id,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }

      const items = mapRoappItems(itemsData);
      const totalFromItems = calcTotalFromItems(items);

      const statusTitle =
        order.status?.title || order.status?.name || order.status || 'В обробці';

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
        createdAt: order.created_at || order.createdAt,
        total:
          totalFromItems ||
          order.total_sum ||
          order.total ||
          order.totalSum ||
          0,
        status: statusTitle,
        statusColor: order.status?.color || '#888888',
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
