// backend/controllers/orderController.js
const Order = require('../models/Order');
const Product = require('../models/productModel'); // === ДОДАНО ДЛЯ ПЕРЕВІРКИ ЦІН ===
const asyncHandler = require('express-async-handler');

// @desc    Створити нове замовлення
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
    // === БЕРЕМО З FRONTEND ТІЛЬКИ ТЕ, ЩО ПОТРІБНО. ЦІНИ ІГНОРУЄМО ===
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('Немає товарів у замовленні');
    }

    // === ФІКС БЕЗПЕКИ: РОЗРАХУНОК ЦІНИ НА СЕРВЕРІ ===

    // 1. Отримати ID товарів (roappId) з кошика
    // (Я припускаю, що в `item.product` лежить `roappId`,
    // оскільки у вашій моделі Order.js `product` - це String)
    const itemIds = orderItems.map(item => item.product);

    // 2. Знайти ці товари в базі, щоб отримати їхні справжні ціни
    const productsFromDB = await Product.find({ roappId: { $in: itemIds } });

    // 3. Створити "карту" цін для зручного доступу (roappId -> price)
    const productMap = new Map();
    productsFromDB.forEach(p => productMap.set(p.roappId, p.price));

    // 4. Сформувати фінальний масив товарів з цінами з БД і розрахувати itemsPrice
    let itemsPrice = 0;
    const calculatedOrderItems = orderItems.map(item => {
        const dbPrice = productMap.get(item.product);

        if (!dbPrice) {
            res.status(404);
            throw new Error(`Товар з ID ${item.product} не знайдено в базі`);
        }
        
        // Додаємо до загальної суми товарів
        itemsPrice += dbPrice * Number(item.qty);

        // Повертаємо об'єкт товару, але з ціною з БД
        return {
            name: item.name,
            qty: Number(item.qty),
            image: item.image,
            price: dbPrice, // <-- ВИКОРИСТОВУЄМО ЦІНУ З БАЗИ ДАНИХ!
            product: item.product, // roappId
        };
    });

    // 5. Розрахувати інші ціни (можете змінити цю логіку)
    const taxPrice = 0; // Наприклад, 0% податок
    const shippingPrice = itemsPrice > 5000 ? 0 : 150; // Наприклад, безкоштовна доставка від 5000 грн
    
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // ===================================================

    const order = new Order({
        orderItems: calculatedOrderItems, // <-- Наші розраховані товари
        user: req.user.id, // req.user береться з authMiddleware
        shippingAddress,
        paymentMethod,
        itemsPrice,     // <-- Наша серверна ціна
        taxPrice,       // <-- Наша серверна ціна
        shippingPrice,  // <-- Наша серверна ціна
        totalPrice,     // <-- Наша серверна ціна
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
});

// @desc    Отримати замовлення за ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    // Додаємо .populate, щоб отримати ім'я та email користувача
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email'
    );

    if (order) {
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});

// @desc    Оновити замовлення до статусу "оплачено"
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        // Сюди можна додати деталі платежу, якщо вони приходять
        // order.paymentResult = { ... };

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});

// @desc    Отримати замовлення поточного користувача
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 }); // Сортуємо від нових до старих
    res.json(orders);
});

// @desc    Отримати всі замовлення (для Адміна)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
    res.json(orders);
});

// @desc    Оновити замовлення до статусу "доставлено"
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});


module.exports = {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    getMyOrders,
    getOrders,          // (Додано експорт, якщо ви забули)
    updateOrderToDelivered // (Додано експорт, якщо ви забули)
};