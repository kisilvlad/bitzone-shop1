// backend/controllers/orderController.js
// Створення замовлення в ROAPP + безпечна робота з моїми замовленнями

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/* ====================== helpers ====================== */

// Нормалізація статусу з ROAPP
function mapRoappStatus(orderLike) {
  const rawStatus = orderLike?.status;
  const title =
    rawStatus?.title ||
    rawStatus?.name ||
    rawStatus ||
    'В обробці';

  let color = rawStatus?.color || '#888888';
  const s = String(title).toLowerCase();

  if (/оплач|paid/.test(s)) {
    color = '#00CED1';
  } else if (/викон|delivered|complete/.test(s)) {
    color = '#1fbf64';
  } else if (/скас|cancel/.test(s)) {
    color = '#dc3545';
  } else if (/очіку|pending/.test(s)) {
    color = '#8A2BE2';
  } else if (/оброб|process/.test(s)) {
    color = '#FFD700';
  }

  return { title, color };
}

// Нормалізація itemʼа замовлення з ROAPP
function mapRoappItem(it, index) {
  const product = it.product || {};

  const name =
    it.title ||
    it.name ||
    it.product_name ||
    product.title ||
    product.name ||
    `Товар #${index + 1}`;

  const quantity = Number(it.quantity ?? it.qty ?? it.count ?? 1) || 1;

  const price =
    Number(
      it.price ??
        it.price_with_discount ??
        it.unit_price ??
        it.sale_price ??
        0
    ) || 0;

  const image =
    it.image_url ||
    it.image ||
    product.image_url ||
    product.image ||
    null;

  return {
    id: it.id ?? it.entity_id ?? index,
    name,
    quantity,
    price,
    image
  };
}

// Отримати клієнта ROAPP за телефоном або створити
async function resolveRoappCustomer(customerData, reqUser) {
  let customerId;

  if (reqUser && typeof reqUser.roAppId === 'number') {
    customerId = reqUser.roAppId;
    console.log('[ROAPP] Використовую існуючого клієнта з roAppId =', customerId);
    return customerId;
  }

  console.log('[ROAPP] Пошук клієнта за телефоном:', customerData.phone);

  const searchResponse = await roappApi.get('contacts/people', {
    params: { 'phones[]': customerData.phone }
  });

  if (
    searchResponse.data &&
    Array.isArray(searchResponse.data.data) &&
    searchResponse.data.data.length > 0
  ) {
    customerId = searchResponse.data.data[0].id;
    console.log('[ROAPP] Знайшли існуючого клієнта в ROAPP, id =', customerId);
    return customerId;
  }

  const newCustomerPayload = {
    first_name: customerData.firstName,
    last_name: customerData.lastName,
    phones: [
      {
        title: 'Основний',
        phone: customerData.phone,
        notify: false
      }
    ],
    emails: customerData.email
      ? [
          {
            title: 'Основний',
            email: customerData.email,
            notify: false
          }
        ]
      : [],
    address: `${customerData.city}, ${customerData.address}`
  };

  console.log('[ROAPP] Створюємо нового клієнта. Payload:', newCustomerPayload);

  const createCustomerResponse = await roappApi.post(
    'contacts/people',
    newCustomerPayload
  );

  customerId = createCustomerResponse.data.id;
  console.log('[ROAPP] Створено нового клієнта в ROAPP, id =', customerId);

  return customerId;
}

/* ====================== CREATE ORDER ====================== */

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
  const customerId = await resolveRoappCustomer(customerData, req.user);

  // 2. Створюємо замовлення (шапка)
  let orderId;

  try {
    const { data } = await roappApi.post('orders', {
      client_id: customerId,
      branch_id: MY_BRANCH_ID,
      order_type_id: MY_ORDER_TYPE_ID,
      assignee_id: MY_ASSIGNEE_ID,
      due_date: new Date().toISOString()
    });

    orderId = data.id;
    console.log(`[ROAPP] Замовлення створено. orderId = ${orderId}`);
  } catch (error) {
    console.error('[ROAPP] Помилка при створенні замовлення:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(500);
    throw new Error('Не вдалося створити замовлення в CRM (ROAPP)');
  }

  // 3. Додаємо товари в замовлення як items
  for (const item of cartItems) {
    try {
      const payload = {
        entity_id: item.id, // ID продукту в ROAPP
        quantity: item.qty,
        price: item.price,
        assignee_id: MY_ASSIGNEE_ID,
        cost: 0,
        discount: {
          type: 'value',
          percentage: 0,
          amount: 0,
          sponsor: 'staff'
        },
        warranty: {
          period: '0',
          periodUnits: 'months'
        }
      };

      console.log('[ROAPP] Додаємо позицію в замовлення:', {
        orderId,
        payload
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
        message: error.message
      });

      res.status(500);
      throw new Error('Не вдалося додати товар до замовлення в CRM (ROAPP)');
    }
  }

  // 4. Відповідь фронту
  res.status(201).json({ success: true, orderId });
});

/* ====================== GET ORDER BY ID + ITEMS ====================== */

// @desc    Get order by ID (з товарами)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const { id: orderId } = req.params;
  const userId = req.user.roAppId;
  const isAdmin = req.user.isAdmin;

  // 1) сам ордер
  const { data: orderData } = await roappApi.get(`orders/${orderId}`);

  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client &&
      (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id;

  if (rawClientId && String(rawClientId) !== String(userId) && !isAdmin) {
    res.status(403);
    throw new Error('Доступ заборонено');
  }

  // 2) товарні позиції
  let items = [];
  try {
    const { data: itemsResp } = await roappApi.get(
      `orders/${orderId}/items`
    );

    const rawItems = Array.isArray(itemsResp?.data)
      ? itemsResp.data
      : Array.isArray(itemsResp)
      ? itemsResp
      : [];

    items = rawItems.map(mapRoappItem);
  } catch (error) {
    console.error(
      '[ROAPP] Помилка при отриманні товарів замовлення:',
      {
        orderId,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      }
    );
    items = [];
  }

  // 3) сума
  const rawTotal =
    orderData.total_sum ??
    orderData.total ??
    orderData.totalSum ??
    orderData.total_price ??
    null;

  const computedTotal =
    rawTotal != null
      ? Number(rawTotal) || 0
      : items.reduce(
          (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
          0
        );

  const statusInfo = mapRoappStatus(orderData);

  res.json({
    id: orderData.id,
    createdAt: orderData.created_at || orderData.createdAt,
    status: statusInfo.title,
    statusColor: statusInfo.color,
    items,
    total: computedTotal
  });
});

/* ====================== STUB PAY ====================== */

// @desc    Update order to paid (поки просто заглушка)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
  res.json({ id, isPaid: true, paidAt: new Date() });
});

/* ====================== NOTIFY ME ====================== */

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

/* ====================== GET MY ORDERS (LIST) ====================== */

// @desc    Get my orders (для особистого кабінету)
// @route   GET /api/orders   (або /api/orders/my — залежить від routerʼа)
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
        sort: '-created_at'
      }
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
      message: error.message
    });
    res.status(500);
    throw new Error('Не вдалося отримати список замовлень з CRM (ROAPP)');
  }

  const filtered = raw.filter(order => {
    const rawClientId =
      order.client_id ??
      order.clientId ??
      (order.client && (order.client.id || order.client.person_id)) ??
      order.person_id ??
      order.customer_id;

    return rawClientId && String(rawClientId) === String(userId);
  });

  const orders = filtered.map(order => {
    const { title, color } = mapRoappStatus(order);

    const totalNumber =
      Number(
        order.total_sum ??
          order.total ??
          order.totalSum ??
          order.total_price ??
          0
      ) || 0;

    const statusTitle = title;

    const isPaid =
      /оплач|paid/i.test(statusTitle) ||
      /викон|complete/i.test(statusTitle);

    const isDelivered =
      /викон|delivered|complete/i.test(statusTitle);

    return {
      id: order.id,
      createdAt: order.created_at || order.createdAt,
      total: totalNumber,
      status: statusTitle,
      statusColor: color,
      isPaid,
      isDelivered
    };
  });

  res.json(orders);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders
};
