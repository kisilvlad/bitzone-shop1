// Це повний вміст файлу backend/controllers/orderController.js
// СУМІСНА ВЕРСІЯ, яка містить createOrder, notifyMe та виправлення для getMyOrders

const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private/Optional
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items');
  } else {
    const order = new Order({
      orderItems,
      // Ваш роутер використовує optionalAuthMiddleware, 
      // тому req.user може не існувати.
      user: req.user ? req.user._id : null, 
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  }
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  // Цей маршрут захищений (authMiddleware), тому req.user 100% існує
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (order) {
    // Перевіряємо, чи це замовлення належить користувачу, АБО чи користувач - адмін
    if (order.user._id.equals(req.user._id) || (req.user && req.user.isAdmin)) {
      res.json(order);
    } else {
      res.status(401);
      throw new Error('Not authorized to view this order');
    }
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    // Тут також можна додати перевірку, чи це замовлення належить користувачу
    if (!order.user._id.equals(req.user._id) && !(req.user && req.user.isAdmin)) {
         res.status(401);
         throw new Error('Not authorized to pay for this order');
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Placeholder for notifyMe
// @route   POST /api/orders/notify-me
// @access  Public
const notifyMe = asyncHandler(async (req, res) => {
    // Це функція-заглушка, щоб сервер не падав
    // Вона потрібна вашому orderRoutes.js
    console.log('Запит "Повідомити мене" отримано:', req.body);
    res.status(200).json({ message: 'Запит на сповіщення прийнято' });
});


// @desc    Get logged in user orders
// @route   GET /api/orders (або /api/orders/myorders, залежно від роутера)
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  //
  // !!! ОСНОВНЕ ВИПРАВЛЕННЯ ДЛЯ "МОЇХ ЗАМОВЛЕНЬ" !!!
  //
  // Цей маршрут захищений (authMiddleware), тому req.user 100% існує
  const orders = await Order.find({ user: req.user._id });
  
  res.json(orders);
});

// Експортуємо ТОЧНО те, що очікує ваш orderRoutes.js
module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  notifyMe,
  getMyOrders
};