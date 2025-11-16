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
        // АДРЕСА КЛІЄНТА В ROAPP (картка клієнта)
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
      // 🔥 ДОДАНО: АДРЕСА ДОСТАВКИ В САМЕ ЗАМОВЛЕННЯ ROAPP
      description: `Доставка Нова Пошта: ${customerData.city}, ${customerData.address}`,
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

      console.log('[ROAPP] Позицію додано успішно:', data);
    } catch (error) {
      console.error('[ROAPP] Помилка при додаванні товару в замовлення:', {
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

// @desc    Get order by id (for current user)
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
          return null;
        }),
    ]);

    orderData = orderResp.data;

    if (itemsResp && itemsResp.data) {
      if (Array.isArray(itemsResp.data)) {
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
      'currentUser =',
      userId
    );
    res.status(403);
    throw new Error('Доступ до цього замовлення заборонений');
  }

  // 2) Мапимо items з різною структурою відповіді
  const mappedItems = itemsData.map((it) => {
    const quantity =
      it.quantity ??
      it.qty ??
      it.count ??
      1;

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

    const image =
      product.imageUrl ||
      product.image_url ||
      (product.images && product.images[0]) ||
      null;

    const title =
      product.name ||
      product.title ||
      product.full_name ||
      'Товар';

    return {
      id: it.id,
      productId: product.id,
      title,
      quantity,
      price,
      image,
    };
  });

  const total =
    orderData.total_sum ??
    orderData.total ??
    orderData.totalSum ??
    mappedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const statusTitle =
    orderData.status?.title ||
    orderData.status?.name ||
    orderData.status ||
    'Невідомий статус';

  const statusColor = orderData.status?.color || '#1973E1';

  const createdAt = orderData.created_at || orderData.createdAt;

  const responseOrder = {
    id: orderData.id,
    createdAt,
    statusTitle,
    statusColor,
    total,
    items: mappedItems,
  };

  res.json(responseOrder);
});

// @desc    Update order to paid (stub for now)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  res.json({ message: 'Оплата замовлення буде реалізована пізніше' });
});

// @desc    Notify me (stub)
// @route   POST /api/orders/notify-me
// @access  Public
const notifyMe = asyncHandler(async (req, res) => {
  res.json({ message: 'Функціонал сповіщення буде реалізовано пізніше' });
});

// @desc    Get all orders for current user
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.roAppId;
  const isAdmin = req.user.isAdmin;

  let ordersData = [];

  try {
    const { data } = await roappApi.get('orders', {
      params: isAdmin
        ? {}
        : {
            client_id: userId,
          },
    });

    if (Array.isArray(data.data)) {
      ordersData = data.data;
    } else if (Array.isArray(data)) {
      ordersData = data;
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

  const orders = ordersData.map((orderData) => {
    const total =
      orderData.total_sum ??
      orderData.total ??
      orderData.totalSum ??
      0;

    const statusTitle =
      orderData.status?.title ||
      orderData.status?.name ||
      orderData.status ||
      'Невідомий статус';

    const statusColor = orderData.status?.color || '#1973E1';

    const isPaid =
      orderData.is_paid ??
      orderData.paid ??
      false;

    const isDelivered =
      orderData.is_delivered ??
      orderData.delivered ??
      false;

    return {
      id: orderData.id,
      createdAt: orderData.created_at || orderData.createdAt,
      statusTitle,
      statusColor,
      total,
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
