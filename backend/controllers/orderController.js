// backend/controllers/orderController.js

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi');
const Product = require('../models/productModel');
const User = require('../models/User');

// Константи під твій акаунт ROAPP
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

/* ===================== helpers ===================== */

const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');

/**
 * Приводимо айтем з кошика до нормального вигляду
 * (цей формат використовуємо і при створенні замовлення, і при підрахунках total)
 */
const normalizeCartItem = (item) => {
  if (!item || typeof item !== 'object') {
    return {
      name: 'Товар',
      quantity: 1,
      price: 0,
      productId: null,
      image: null,
    };
  }

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

  // ID товару в ROAPP (для привʼязки позицій замовлення до продукту)
  const productId =
    item.roappProductId ??
    item.roAppProductId ??
    item.ro_app_product_id ??
    item.productRoappId ??
    item.roappId ??
    item.productId ??
    item.product_id ??
    null;

  const image =
    item.image ||
    item.product_image ||
    item.photo ||
    item.thumbnail ||
    (Array.isArray(item.images) &&
      (item.images[0]?.image || item.images[0])) ||
    null;

  const quantity = Number(quantityRaw) > 0 ? Number(quantityRaw) : 1;
  const price = Number(priceRaw) >= 0 ? Number(priceRaw) : 0;

  return {
    name: String(nameRaw),
    quantity,
    price,
    productId,
    image,
  };
};

/**
 * Знаходимо або створюємо клієнта в ROAPP за телефоном
 */
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

/**
 * Формуємо текстовий коментар до замовлення з даних форми checkout
 */
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

/**
 * Мапимо айтеми замовлення з ROAPP на формат фронтенда
 * + підтягування картинок / назв із локальної колекції Product
 */
const mapItemsWithProducts = async (itemsRaw) => {
  if (!Array.isArray(itemsRaw) || !itemsRaw.length) return [];

  const roappIdsSet = new Set();
  for (const it of itemsRaw) {
    const pid =
      it.product_id ??
      it.productId ??
      it.entity_id ??
      it.product_id_roapp ??
      null;
    if (pid != null) roappIdsSet.add(Number(pid));
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
      console.error('[mapItemsWithProducts] DB error:', err.message);
    }
  }

  return itemsRaw.map((it) => {
    const productRoappId =
      it.product_id ??
      it.productId ??
      it.entity_id ??
      it.product_id_roapp ??
      null;

    const productDoc =
      productRoappId != null
        ? productsByRoappId[String(Number(productRoappId))]
        : null;

    const qty = Number(it.quantity ?? it.qty ?? 1) || 1;
    const price =
      Number(
        it.price ??
          it.unit_price ??
          it.unitPrice ??
          it.total ??
          0
      ) || 0;

    const name =
      it.name ||
      it.title ||
      it.product_name ||
      it.productTitle ||
      (productDoc && productDoc.name) ||
      'Товар';

    let image = null;
    if (productDoc) {
      image =
        productDoc.mainImage ||
        productDoc.image ||
        productDoc.coverImage ||
        productDoc.thumbnail ||
        (Array.isArray(productDoc.images) &&
          (productDoc.images[0]?.image || productDoc.images[0])) ||
        null;
    }
    if (!image) {
      image =
        it.image ||
        it.photo ||
        it.thumbnail ||
        (Array.isArray(it.images) &&
          (it.images[0]?.image || it.images[0])) ||
        null;
    }

    return {
      productRoappId: productRoappId != null ? Number(productRoappId) : null,
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

    // Якщо користувач залогінений – зберігаємо clientId в User.roAppId
    if (req.user && clientId) {
      try {
        const userDoc = await User.findById(req.user._id);
        if (userDoc) {
          userDoc.roAppId = clientId;
          await userDoc.save();
        }
      } catch (err) {
        console.error('[createOrder] save user roAppId error:', err.message);
      }
    }
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

  for (const rawItem of cartItems) {
    const item = normalizeCartItem(rawItem);

    const payload = {
      title: item.name,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    };

    if (item.productId) {
      payload.product_id = item.productId;
    }

    try {
      await roappApi.post(`orders/${orderId}/items`, payload);
      successItems += 1;
    } catch (err) {
      console.error('[ROAPP] add item to order error:', {
        orderId,
        item,
        error: err?.response?.data || err.message,
      });
    }
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
    itemsCreated: successItems,
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
        // зберігаємо в користувача
        try {
          const userDoc = await User.findById(user._id);
          if (userDoc) {
            userDoc.roAppId = clientId;
            await userDoc.save();
          }
        } catch (err) {
          console.error('[getOrderById] save user roAppId error:', err.message);
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

  // 3. Перевіряємо, що замовлення належить поточному користувачу (якщо він не адмін)
  const rawClientId =
    orderData.client_id ??
    orderData.clientId ??
    (orderData.client && (orderData.client.id || orderData.client.person_id)) ??
    orderData.person_id ??
    orderData.customer_id ??
    null;

  if (!isAdmin) {
    if (!clientId || !rawClientId || String(clientId) !== String(rawClientId)) {
      res.status(403);
      throw new Error('Немає доступу до цього замовлення.');
    }
  }

  // 4. Підтягуємо айтеми замовлення
  let itemsRaw = [];
  try {
    const resp = await roappApi.get(`orders/${orderId}/items`);
    itemsRaw = Array.isArray(resp?.data?.data)
      ? resp.data.data
      : Array.isArray(resp?.data)
      ? resp.data
      : [];
  } catch (err) {
    console.error('[ROAPP] getOrderById items error:', err?.response?.data || err.message);
  }

  const items = await mapItemsWithProducts(itemsRaw);

  const totalFromItems = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );

  const statusObj = orderData.status || {};
  let statusTitle = 'В обробці';
  let statusColor = '#888888';

  if (typeof statusObj === 'string') {
    statusTitle = statusObj;
  } else if (statusObj && typeof statusObj === 'object') {
    statusTitle = statusObj.title || statusObj.name || statusTitle;
    statusColor = statusObj.color || statusColor;
  }

  const result = {
    id: orderData.id || orderId,
    createdAt:
      orderData.created_at ||
      orderData.date ||
      orderData.createdAt ||
      null,
    total:
      Number(
        orderData.total_sum ??
          orderData.total ??
          orderData.amount ??
          totalFromItems
      ) || totalFromItems,
    status: statusTitle,
    statusColor,
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

  // Тут за бажанням можна створювати Task / Inquiry в ROAPP.
  // Поки що просто відповідаємо 200, щоб фронт показав успішне повідомлення.

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
          const userDoc = await User.findById(user._id);
          if (userDoc) {
            userDoc.roAppId = clientId;
            await userDoc.save();
          }
        } catch (err) {
          console.error('[getMyOrders] save user roAppId error:', err.message);
        }
      }
    } catch (err) {
      console.error('[getMyOrders] search client by phone error:', err?.response?.data || err.message);
    }
  }

  if (!clientId) {
    // Немає привʼязки користувача до контактів ROAPP – повертаємо порожній список
    return res.json([]);
  }

  // 1. Тягуємо всі замовлення для цього client_id
  let allOrdersRaw = [];
  try {
    const resp = await roappApi.get('orders', {
      params: {
        client_id: clientId,
        branch_id: MY_BRANCH_ID,
      },
    });

    if (Array.isArray(resp?.data?.data)) {
      allOrdersRaw = resp.data.data;
    } else if (Array.isArray(resp?.data)) {
      allOrdersRaw = resp.data;
    } else {
      console.warn('[getMyOrders] unexpected orders format:', resp?.data);
    }
  } catch (err) {
    console.error('[getMyOrders] get orders error:', err?.response?.data || err.message);
    res.status(500);
    throw new Error('Не вдалося завантажити історію замовлень.');
  }

  // 2. Для кожного замовлення підтягуємо items
  const ordersWithItems = await Promise.all(
    allOrdersRaw.map(async (order) => {
      let itemsRaw = [];
      try {
        const itemsResp = await roappApi.get(`orders/${order.id}/items`);
        itemsRaw = Array.isArray(itemsResp?.data?.data)
          ? itemsResp.data.data
          : Array.isArray(itemsResp?.data)
          ? itemsResp.data
          : [];
      } catch (err) {
        console.error('[getMyOrders] get order items error:', err?.response?.data || err.message);
      }

      const items = await mapItemsWithProducts(itemsRaw);

      const totalFromItems = items.reduce(
        (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
        0
      );

      const statusObj = order.status || {};
      let statusTitle = 'В обробці';
      let statusColor = '#888888';

      if (typeof statusObj === 'string') {
        statusTitle = statusObj;
      } else if (statusObj && typeof statusObj === 'object') {
        statusTitle = statusObj.title || statusObj.name || statusTitle;
        statusColor = statusObj.color || statusColor;
      }

      return {
        id: order.id,
        createdAt:
          order.created_at ||
          order.date ||
          order.createdAt ||
          null,
        total:
          Number(
            order.total_sum ??
              order.total ??
              order.amount ??
              totalFromItems
          ) || totalFromItems,
        status: statusTitle,
        statusColor,
        items,
      };
    })
  );

  // 3. Сортуємо від нових до старих
  ordersWithItems.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  res.json(ordersWithItems);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders,
};
