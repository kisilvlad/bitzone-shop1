const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { classifyProduct } = require('../../frontend/src/utils/classifyProduct'); // Припускаю, що шлях правильний, як у вас було

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
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
    // Зменшуємо кількість товару на складі
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const variant = product.variants.find(
          (v) => v.color === item.color && v.size === item.size
        );
        if (variant && variant.countInStock >= item.qty) {
          variant.countInStock -= item.qty;
        } else {
          res.status(400);
          throw new Error(`Not enough stock for ${product.name}`);
        }
        await product.save();
      } else {
        res.status(404);
        throw new Error(`Product not found: ${item.product}`);
      }
    }

    const order = new Order({
      orderItems,
      user: req.user._id, // req.user з middleware 'protect'
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
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (order) {
    // !!! ФІКС !!!
    // Додаємо перевірку, чи належить це замовлення користувачу,
    // або чи є користувач адміном (ми беремо isAdmin з моделі User)
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;

    if (isOwner || isAdmin) {
      res.status(200).json(order);
    } else {
      res.status(401); // 401 Unauthorized
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
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      // Це приклад, дані мають надходити з платіжної системи
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.status(200).json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  // !!! ФІКС !!!
  // Раніше було Order.find({}), що повертало ВСІ замовлення.
  // Тепер ми шукаємо тільки ті, де поле 'user'
  // збігається з ID залогованого користувача (з req.user._id)
  const orders = await Order.find({ user: req.user._id });
  res.status(200).json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders/all
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({}).populate('user', 'id name');
  res.status(200).json(orders);
});

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getAllOrders,
};