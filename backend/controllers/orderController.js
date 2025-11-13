// backend/controllers/orderController.js

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');

// Ці ID ти можеш підлаштувати під свої налаштування ROAPP
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/* =========================================================
   helper: знайти або створити клієнта в ROAPP за телефоном
   Використовує ті ж самі ендпоінти, що й authController
   ========================================================= */
const findOrCreateRoAppCustomer = async ({ phone, firstName, lastName, email }) => {
  if (!phone) {
    throw new Error('Немає телефону клієнта для створення контакту в ROAPP');
  }

  const normalizedPhone = String(phone).replace(/\D/g, '');

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
    console.error('[ROAPP] Помилка пошуку клієнта за телефоном:', err?.response?.data || err.message);
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
    console.error('[ROAPP] Не вдалося створити клієнта:', err?.response?.data || err.message);
    throw new Error('Не вдалося створити клієнта в CRM');
  }
};

/* допоміжна збірка коментаря для замовлення */
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
   @access  Private або optional (див. routes)
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

  if (req.user && typeof req.user.roAppId === 'number') {
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
    console.error('[ROAPP] Помилка при створенні замовлення:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося створити замовлення в CRM.');
  }

  // 3) Додаємо позиції до замовлення
  const orderId = createdOrder.id;
  for (const item of cartItems) {
    try {
      await roappApi.post(`orders/${orderId}/items`, {
        // product_id можна підлаштувати під реальний ID з ROAPP, якщо у тебе є мапінг
        name: item.name,
        quantity: item.qty,
        price: item.price,
      });
    } catch (err) {
      console.error('[ROAPP] Помилка додавання товару до замовлення:', {
        orderId,
        item,
        error: err?.response?.data || err.message,
      });
      // Не рвемо весь запит — просто логуємо
    }
  }

  // Повертаємо коротку інфу фронту
  const totalFromCart = cartItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);

  res.status(201).json({
    id: orderId,
    createdAt: createdOrder.created_at || new Date().toISOString(),
    total: createdOrder.total_sum || totalFromCart,
    status: createdOrder.status ? createdOrder.status.title : 'В обробці',
  });
});

/* =========================================================
   @desc    Отримати деталі конкретного замовлення
   @route   GET /api/orders/:id
   @access  Private
   ========================================================= */
const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const userRoId = req.user && req.user.roAppId;

  if (typeof userRoId !== 'number') {
    res.status(401);
    throw new Error('Не вдалося ідентифікувати користувача.');
  }

  // 1) тягнемо загальну інфу по замовленню
  let orderData;
  try {
    const { data } = await roappApi.get(`orders/${orderId}`);
    orderData = data;
  } catch (err) {
    console.error('[ROAPP] Помилка getOrderById (orders/:id):', err?.response?.data || err.message);
    if (err?.response?.status === 404) {
      res.status(404);
      throw new Error('Замовлення не знайдено.');
    }
    res.status(500);
    throw new Error('Не вдалося отримати замовлення.');
  }

  // 2) перевіряємо, що це замовлення цього користувача
  if (String(orderData.client_id) !== String(userRoId)) {
    res.status(403);
    throw new Error('У вас немає доступу до цього замовлення.');
  }

  // 3) тягнемо позиції замовлення
  let items = [];
  try {
    const { data } = await roappApi.get(`orders/${orderId}/items`);
    items = Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error('[ROAPP] Помилка отримання позицій замовлення:', err?.response?.data || err.message);
  }

  const mappedItems = items.map((it) => ({
    id: it.id,
    name: it.name || it.product_name || 'Товар',
    quantity: it.quantity || it.qty || 1,
    price: Number(it.price) || 0,
    image: it.image || it.product_image || '/assets/images/placeholder-product.png',
  }));

  const result = {
    id: orderData.id,
    createdAt: orderData.created_at,
    total: orderData.total_sum || mappedItems.reduce((s, i) => s + i.price * i.quantity, 0),
    status: orderData.status ? orderData.status.title : 'В обробці',
    statusColor: orderData.status ? orderData.status.color : '#888888',
    items: mappedItems,
  };

  res.json(result);
});

/* =========================================================
   @desc    Позначити замовлення як оплачене
   @route   PUT /api/orders/:id/pay
   @access  Private
   (Зараз зроблено м’яким no-op, щоб нічого не ламати)
   ========================================================= */
const updateOrderToPaid = asyncHandler(async (req, res) => {
  // Якщо захочеш реально оновлювати статус у ROAPP:
  // тут треба дернути /orders/{id}/status з потрібним status_id
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

  // Тут за бажанням можеш:
  //  - записати в окрему колекцію MongoDB
  //  - надіслати в Telegram/Slack
  //  - зробити email-повідомлення

  res.status(200).json({ message: 'Ми отримали ваш запит, звʼяжемося з вами, коли товар зʼявиться.' });
});

/* =========================================================
   @desc    Отримати замовлення поточного користувача
   @route   GET /api/orders
   @access  Private
   ========================================================= */
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.roAppId;

  if (!userId || typeof userId !== 'number') {
    console.error('[getMyOrders] Некоректний roAppId для користувача:', {
      mongoId: req.user && req.user._id,
      roAppId: req.user && req.user.roAppId,
    });
    res.status(401);
    throw new Error('Не вдалося верифікувати ID користувача для CRM');
  }

  // 1) тягнемо список замовлень
  let allOrders = [];
  try {
    const { data: ordersResponse } = await roappApi.get('orders', {
      params: {
        client_id: userId,      // якщо backend ROAPP проігнорує – ми підстрахуємося фільтром нижче
        sort: '-created_at',
        pageSize: 100,
      },
    });

    allOrders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch (err) {
    console.error('[getMyOrders] Помилка отримання замовлень з ROAPP:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося завантажити історію замовлень.');
  }

  // 2) додаткова фільтрація на всякий випадок
  const myOrders = allOrders.filter((order) => String(order.client_id) === String(userId));

  // 3) приводимо до формату, який очікує фронт (Account.jsx)
  const orders = myOrders.map((order) => ({
    id: order.id,
    createdAt: order.created_at,
    total: order.total_sum,
    status: order.status ? order.status.title : 'В обробці',
    statusColor: order.status ? order.status.color : '#888888',
    isPaid: order.status
      ? order.status.title === 'Оплачено' || order.status.title === 'Виконано'
      : false,
    isDelivered: order.status ? order.status.title === 'Виконано' : false,
  }));

  res.json(orders);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
