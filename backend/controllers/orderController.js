// backend/controllers/orderController.js
// !!! ФІКС: Додано БЕЗПЕЧНУ `getMyOrders` !!!

const asyncHandler = require('express-async-handler');
const roappApi = require('../utils/roappApi'); // <-- !!! ВИКОРИСТОВУЄМО НОВИЙ ФАЙЛ !!!

// --- ID з твого коду ---
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

    let customerId;
    if (req.user && req.user.roAppId) {
        customerId = req.user.roAppId;
    } else {
        // Логіка для "гостей"
        const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': customerData.phone } });
        if (searchResponse.data.data.length > 0) {
            customerId = searchResponse.data.data[0].id;
        } else {
            const newCustomerPayload = {
                first_name: customerData.firstName,
                last_name: customerData.lastName,
                phones: [{"title": "Основний", "phone": customerData.phone, "notify": false}],
                email: customerData.email,
                address: `${customerData.city}, ${customerData.address}`
            };
            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            customerId = createCustomerResponse.data.id;
        }
    }

    const createOrderResponse = await roappApi.post('orders', {
        client_id: customerId,
        branch_id: MY_BRANCH_ID,
        order_type_id: MY_ORDER_TYPE_ID,
        assignee_id: MY_ASSIGNEE_ID,
        due_date: new Date().toISOString()
    });

    const orderId = createOrderResponse.data.id;

    for (const item of cartItems) {
        await roappApi.post(`orders/${orderId}/items`, {
            product_id: item.id,
            quantity: item.qty,
            price: item.price,
            assignee_id: MY_ASSIGNEE_ID,
            entity_id: item.id,
            cost: 0,
            discount: { "type": "value", "percentage": 0, "amount": 0, "sponsor": "staff" },
            warranty: { "period": "0", "periodUnits": "months" }
        });
    }
    res.status(201).json({ success: true, orderId: orderId });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const { id: orderId } = req.params;
    const userId = req.user.roAppId;
    const isAdmin = req.user.isAdmin;

    const { data: orderData } = await roappApi.get(`orders/${orderId}`);
    
    // Перевірка, що це твоє замовлення АБО ти адмін
    if (String(orderData.client_id) !== String(userId) && !isAdmin) {
        res.status(403);
        throw new Error('Доступ заборонено');
    }

    const { data: itemsData } = await roappApi.get(`orders/${orderId}/items`);
    const items = itemsData.data.map(item => ({
        id: item.product ? item.product.id : item.entity_id,
        name: item.product ? item.product.title : 'Товар обробляється...',
        price: item.price,
        quantity: item.quantity,
        image: (item.product && item.product.images?.length > 0) ? item.product.images[0].image : '/assets/bitzone-logo1.png'
    }));

    const result = {
        id: orderData.id,
        createdAt: orderData.created_at,
        status: orderData.status ? orderData.status.title : 'В обробці',
        statusColor: orderData.status ? orderData.status.color : '#888888',
        total: orderData.total_sum || items.reduce((sum, current) => sum + (current.price * current.quantity), 0),
        items: items,
    };
    res.json(result);
});

// @desc    Update order to paid (Симуляція)
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
    res.json({ id, isPaid: true, paidAt: new Date() });
});

// @desc    Notify me when product is available
// @route   POST /api/orders/notify-me
// @access  Public
const notifyMe = asyncHandler(async (req, res) => {
    // ... (код notifyMe не змінюємо, він не є проблемою) ...
    // ... (він також має бути оновлений, щоб використовувати `roappApi`, але це не критично ЗАРАЗ) ...
    const { productId, productName, phone } = req.body;
    if (!productId || !productName || !phone) {
        res.status(400);
        throw new Error('Недостатньо даних для створення запиту');
    }
    res.status(200).json({ success: true, message: 'Запит прийнято!' });
    try {
        let customerId;
        const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': phone } });
        if (searchResponse.data.data.length > 0) {
            customerId = searchResponse.data.data[0].id;
        } else {
            const newCustomerPayload = { first_name: "Клієнт (очікує товар)", last_name: phone, phones: [{"title": "Основний", "phone": phone, "notify": false}] };
            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            customerId = createCustomerResponse.data.id;
        }
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 30);
        const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
        const taskPayload = { 
            title: `Повідомити про наявність: ${productName}`, 
            description: `Клієнт ${phone} очікує ${productName} (ID: ${productId}).`, 
            client_id: customerId, 
            branch_id: MY_BRANCH_ID, 
            assignees: [MY_ASSIGNEE_ID], 
            deadline: deadlineTimestamp 
        };
        await roappApi.post('tasks', taskPayload);
    } catch (error) {
        console.error(`[NotifyMe ФОНОВА ПОМИЛКА]`, error.message);
    }
});


// --- !!! НОВА ФУНКЦІЯ, ЯКА ВИРІШУЄ ПРОБЛЕМУ "ВСІХ ЗАМОВЛЕНЬ" !!! ---
// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const userId = req.user.roAppId;

    // !!! ГОЛОВНИЙ ФІКС БЕЗПЕКИ !!!
    // Якщо `userId` з якоїсь причини відсутній (наприклад, "старий"
    // користувач, якого не вдалося "вилікувати"),
    // ми кидаємо помилку, а НЕ відправляємо запит без `client_id`.
    if (!userId) {
        console.error(`Критична помилка безпеки: getMyOrders викликано без roAppId для Mongoose user ${req.user._id}`);
        res.status(401);
        throw new Error('Не вдалося верифікувати ID користувача для CRM');
    }

    const { data: ordersResponse } = await roappApi.get('orders', {
        params: {
            client_id: userId,
            sort: '-created_at' 
        }
    });

    const orders = ordersResponse.data.map(order => ({
        id: order.id,
        createdAt: order.created_at,
        total: order.total_sum,
        status: order.status ? order.status.title : 'В обробці',
        statusColor: order.status ? order.status.color : '#888888',
        isPaid: order.status ? (order.status.title === 'Оплачено' || order.status.title === 'Виконано') : false,
        isDelivered: order.status ? order.status.title === 'Виконано' : false,
    }));

    res.json(orders);
});

// --- Експортуємо ВСІ функції ---
module.exports = { 
    createOrder, 
    getOrderById,
    updateOrderToPaid,
    notifyMe,
    getMyOrders, // <-- ДОДАНО
};