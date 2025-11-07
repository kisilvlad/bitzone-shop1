// backend/controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User'); // === ПОТРІБЕН ДЛЯ ROAPP ID ===
const Product = require('../models/productModel'); // === ПОТРІБЕН ДЛЯ ЦІН ТА ROAPP ID ===
const asyncHandler = require('express-async-handler');
const axios = require('axios');

// === БЕЗПЕЧНА ФУНКЦІЯ СТВОРЕННЯ ЗАМОВЛЕННЯ В ROAPP ===
const createRoappOrder = async (createdOrder, user) => {
    const url = 'https://api.roapp.com/v1/orders';
    const apiKey = process.env.ROAPP_API_KEY;

    // 1. Перевіряємо, чи є у користувача roappId (з моделі User)
    if (!user.roappId) {
        console.error(`Користувач ${user.email} не має roappId. Замовлення в RoApp не створено.`);
        return null; // Просто виходимо, не "ламаючи" сайт
    }

    // 2. Потрібно знайти roappId (який у нас в productModel) для кожного товару
    const productRoappIds = createdOrder.orderItems.map(item => item.product); // Це roappId
    const productsFromDB = await Product.find({ roappId: { $in: productRoappIds } });
    
    const productMap = new Map();
    // Карта: "ID_товару_в_RoApp" -> "Цілий_об'єкт_товару_з_RoApp"
    productsFromDB.forEach(p => productMap.set(p.roappId, p)); 

    // 3. Формуємо товари для RoApp
    const roappItems = createdOrder.orderItems.map(item => {
        const product = productMap.get(item.product);
        return {
            product_id: product ? product.roappId : null, // ID товару в RoApp
            quantity: item.qty,
            price: item.price, // Ціна, яку ми вже БЕЗПЕЧНО розрахували
        };
    });

    // 4. Тіло запиту на RoApp, згідно документації
    const body = {
        order_status_id: 61166, // "Нове (BitZone)" (З твого старого коду)
        person_id: user.roappId, // ID клієнта в RoApp
        order_items: roappItems,
        branch_id: 212229, // (З твого старого коду)
        assignee_id: 306951, // (З твого старого коду)
    };

    // === ОБГОРНУТО В TRY...CATCH ===
    try {
        const response = await axios.post(url, body, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            }
        });
        console.log('Замовлення в RoApp успішно створено:', response.data.id);
        return response.data;
    } catch (error) {
        // Не "вбиваємо" сервер, якщо RoApp "впав"
        console.error('ПОМИЛКА при створенні Замовлення в RoApp:', error.response ? error.response.data : error.message);
        return null;
    }
    // =============================
};

// @desc    Створити нове замовлення
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
    // === ФІКС БЕЗПЕКИ: ІГНОРУЄМО ЦІНИ З КЛІЄНТА ===
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('Немає товарів у замовленні');
    }

    // 1. Отримуємо ID товарів (roappId) з кошика
    const itemRoappIds = orderItems.map(item => item.product);

    // 2. Знаходимо ці товари в НАШІЙ базі (productModel)
    const productsFromDB = await Product.find({ roappId: { $in: itemRoappIds } });
    const productMap = new Map();
    productsFromDB.forEach(p => productMap.set(p.roappId, p.price)); // Карта: roappId -> price

    // 3. Розраховуємо ціни на СЕРВЕРІ
    let itemsPrice = 0;
    const calculatedOrderItems = orderItems.map(item => {
        const dbPrice = productMap.get(item.product);
        if (!dbPrice) {
            res.status(404);
            throw new Error(`Товар ${item.name} не знайдено`);
        }
        itemsPrice += dbPrice * Number(item.qty);
        return {
            name: item.name,
            qty: Number(item.qty),
            image: item.image,
            price: dbPrice, // <-- Встановлюємо ціну з бази
            product: item.product, // roappId
        };
    });

    // 4. Розраховуємо загальну вартість
    const taxPrice = 0; // (твоя логіка)
    const shippingPrice = itemsPrice > 5000 ? 0 : 150; // (твоя логіка)
    const totalPrice = itemsPrice + taxPrice + shippingPrice;
    
    // 5. Знаходимо нашого користувача (щоб отримати user.roappId)
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('Користувача не знайдено');
    }

    // 6. Створюємо замовлення в НАШІЙ базі
    const order = new Order({
        orderItems: calculatedOrderItems,
        user: req.user.id,
        shippingAddress,
        paymentMethod,
        itemsPrice, // <-- Наша розрахована ціна
        taxPrice,
        shippingPrice,
        totalPrice,
        roappId: user.roappId // <-- Зберігаємо ID клієнта з RoApp
    });

    const createdOrder = await order.save();

    // 7. Створюємо замовлення в RoApp (безпечно)
    const roappOrder = await createRoappOrder(createdOrder, user);

    if (roappOrder && roappOrder.id) {
        createdOrder.roappOrderId = roappOrder.id.toString(); // <-- Зберігаємо ID замовлення з RoApp
        await createdOrder.save();
    }

    // 8. Віддаємо користувачу замовлення (з НАШОЇ бази)
    res.status(201).json(createdOrder);
});


// @desc    Отримати замовлення за ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email roappId' // Додаємо roappId
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
        order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.payer ? req.body.payer.email_address : '',
        };

        // (Тут можна додати логіку оновлення статусу в RoApp, якщо потрібно)

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});

// @desc    Отримати мої замовлення
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
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

        // (Тут можна додати логіку оновлення статусу в RoApp, якщо потрібно)

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
    getOrders,
    updateOrderToDelivered
};