// backend/controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User'); 
const Product = require('../models/productModel'); 
const asyncHandler = require('express-async-handler');
const axios = require('axios');

// ... (функція createRoappOrder залишається без змін) ...
const createRoappOrder = async (createdOrder, user) => {
    const url = 'https://api.roapp.com/v1/orders';
    const apiKey = process.env.ROAPP_API_KEY;

    if (!user.roappId) {
        console.error(`Користувач ${user.email} не має roappId. Замовлення в RoApp не створено.`);
        return null; 
    }

    const productRoappIds = createdOrder.orderItems.map(item => item.product); 
    const productsFromDB = await Product.find({ roappId: { $in: productRoappIds } });
    
    const productMap = new Map();
    productsFromDB.forEach(p => productMap.set(p.roappId, p)); 

    const roappItems = createdOrder.orderItems.map(item => {
        const product = productMap.get(item.product);
        return {
            product_id: product ? product.roappId : null, 
            quantity: item.qty,
            price: item.price, 
        };
    });

    const body = {
        order_status_id: 61166, // "Нове (BitZone)"
        person_id: user.roappId, // ID клієнта в RoApp
        order_items: roappItems,
        branch_id: 212229, 
        assignee_id: 306951, 
    };

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
        console.error('ПОМИЛКА при створенні Замовлення в RoApp:', error.response ? error.response.data : error.message);
        return null;
    }
};

// @desc    Створити нове замовлення
// @route   POST /api/orders
// @access  Private
const addOrderItems = asyncHandler(async (req, res) => {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    if (!orderItems || orderItems.length === 0) {
        res.status(400);
        throw new Error('Немає товарів у замовленні');
    }

    // 1-4. Розрахунок цін (це швидко, все з нашої БД)
    const itemRoappIds = orderItems.map(item => item.product);
    const productsFromDB = await Product.find({ roappId: { $in: itemRoappIds } });
    const productMap = new Map();
    productsFromDB.forEach(p => productMap.set(p.roappId, p.price)); 

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
            price: dbPrice, 
            product: item.product, 
        };
    });

    const taxPrice = 0; 
    const shippingPrice = itemsPrice > 5000 ? 0 : 150; 
    const totalPrice = itemsPrice + taxPrice + shippingPrice;
    
    // 5. Знаходимо користувача (швидко)
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('Користувача не знайдено');
    }

    // 6. Створюємо замовлення в НАШІЙ базі (швидко)
    const order = new Order({
        orderItems: calculatedOrderItems,
        user: req.user.id,
        shippingAddress,
        paymentMethod,
        itemsPrice, 
        taxPrice,
        shippingPrice,
        totalPrice,
        roappId: user.roappId 
    });

    const createdOrder = await order.save();

    // === ОПТИМІЗАЦІЯ ШВИДКОСТІ ===
    
    // 7. НЕГАЙНО віддаємо відповідь користувачу
    res.status(201).json(createdOrder);

    // 8. ПІСЛЯ ЦЬОГО запускаємо повільну синхронізацію з RoApp у фоні
    const roappOrder = await createRoappOrder(createdOrder, user);

    if (roappOrder && roappOrder.id) {
        // Тихо оновлюємо наше замовлення в базі,
        // користувач про це вже не чекає
        await Order.findByIdAndUpdate(createdOrder._id, {
             roappOrderId: roappOrder.id.toString() 
        });
    }
    // ============================
});


// ... (решта файлу: getOrderById, updateOrderToPaid і т.д. залишаються без змін) ...

const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email roappId' 
    );

    if (order) {
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});

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

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Замовлення не знайдено');
    }
});

const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
});

const getOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
    res.json(orders);
});

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
    getOrders,
    updateOrderToDelivered
};