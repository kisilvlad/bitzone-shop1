// backend/controllers/orderController.js
// !!! ПОВНІСТЮ ВИПРАВЛЕНИЙ ФАЙЛ ПІД ROAPP API !!!

const axios = require('axios');
const asyncHandler = require('express-async-handler');

// --- Ініціалізація roappApi ---
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// --- ID з твого коду ---
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    // Ця функція з твого коду, вона виглядає коректною
    const { customerData, cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) {
        res.status(400);
        throw new Error('Неможливо створити замовлення без товарів');
    }

    let customerId;
    // Ми беремо ID клієнта з req.user, якщо він залогінений
    // Це важливо для getMyOrders
    if (req.user && req.user.id) {
        customerId = req.user.id;
    } else {
        // Пошук або створення клієнта (для незалогінених)
        const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': customerData.phone } });
        if (searchResponse.data.data.length > 0) {
            customerId = searchResponse.data.data[0].id;
        } else {
            const newCustomerPayload = {
                first_name: customerData.firstName,
                last_name: customerData.lastName,
                phones: [{"title": "Основний", "phone": customerData.phone, "notify": false, "has_viber": false, "has_whatsapp": false}],
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
    // Ця функція з твого коду. Вона ВЖЕ МАЄ ПЕРЕВІРКУ БЕЗПЕКИ!
    const { id: orderId } = req.params;
    // req.user.id - це roappApi ID (ми це знаємо з createOrder)
    const { id: userId, isAdmin } = req.user; 

    const { data: orderData } = await roappApi.get(`orders/${orderId}`);
    
    // !!! ФІКС БЕЗПЕКИ !!!
    // Додаємо перевірку, що користувач - адмін (isAdmin)
    if (String(orderData.client_id) !== String(userId) && !isAdmin) {
        res.status(403); // 403 Forbidden
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
    // Ця функція з твого коду, виглядає коректною
    const { productId, productName, phone } = req.body;
    if (!productId || !productName || !phone) {
        res.status(400);
        throw new Error('Недостатньо даних для створення запиту');
    }
    res.status(200).json({ success: true, message: 'Запит прийнято!' });
    try {
        console.log(`[NotifyMe] Початок фонової обробки для телефону: ${phone}`);
        let customerId;
        const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': phone } });
        if (searchResponse.data.data.length > 0) {
            customerId = searchResponse.data.data[0].id;
        } else {
            const newCustomerPayload = { first_name: "Клієнт (очікує товар)", last_name: phone, phones: [{"title": "Основний", "phone": phone, "notify": false, "has_viber": false, "has_whatsapp": false}] };
            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            customerId = createCustomerResponse.data.id;
        }
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 30);
        const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
        const taskPayload = { 
            title: `Повідомити про наявність: ${productName}`, 
            description: `Клієнт з номером ${phone} очікує на товар "${productName}" (ID товару: ${productId}).`, 
            client_id: customerId, 
            branch_id: MY_BRANCH_ID, 
            assignees: [MY_ASSIGNEE_ID], 
            deadline: deadlineTimestamp 
        };
        await roappApi.post('tasks', taskPayload);
        console.log(`[NotifyMe] Успішно створено завдання в Roapp для телефону: ${phone}`);
    } catch (error) {
        console.error(`[NotifyMe ФОНОВА ПОМИЛКА] Не вдалося створити завдання для тел. ${phone}:`, error.message);
    }
});


// --- !!! НОВА ФУНКЦІЯ, ЯКА ВИРІШУЄ ПРОБЛЕМУ !!! ---
// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    // Беремо ID користувача з middleware (це roappApi ID)
    const userId = req.user.id;

    if (!userId) {
        res.status(401);
        throw new Error('Користувач не авторизований');
    }

    // Робимо запит до roappApi, але просимо замовлення ТІЛЬКИ 
    // для 'client_id', який дорівнює нашому userId.
    // Це виправляє помилку "всі бачать всі замовлення".
    const { data: ordersResponse } = await roappApi.get('orders', {
        params: {
            client_id: userId,
            sort: '-created_at' // Сортуємо від нових до старих
        }
    });

    // Адаптуємо дані з roappApi у той формат,
    // який очікує твій фронтенд (спрощений список)
    const orders = ordersResponse.data.map(order => ({
        id: order.id,
        createdAt: order.created_at,
        total: order.total_sum,
        status: order.status ? order.status.title : 'В обробці',
        statusColor: order.status ? order.status.color : '#888888',
        // Фронтенд може очікувати ці поля, але roappApi їх не має
        isPaid: order.status ? (order.status.title === 'Оплачено' || order.status.title === 'Виконано') : false,
        isDelivered: order.status ? order.status.title === 'Виконано' : false,
    }));

    res.json(orders);
});

// --- !!! НОВА ФУНКЦІЯ ДЛЯ АДМІНІВ !!! ---
// @desc    Get all orders (for Admin)
// @route   GET /api/orders/all
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
    // Ця функція доступна лише якщо middleware 
    // перевірив і додав `req.user.isAdmin`
    if (!req.user.isAdmin) {
        res.status(403);
        throw new Error('Доступ заборонено. Потрібні права адміністратора.');
    }

    // Адмін отримує ВСІ замовлення
    const { data: ordersResponse } = await roappApi.get('orders', {
         params: { sort: '-created_at' }
    });
    
    // Тут ми не можемо 'populate' Mongoose,
    // але ми можемо повернути все, що дає roappApi
    res.json(ordersResponse.data);
});


// !!! ОНОВЛЕНИЙ ЕКСПОРТ !!!
// Переконайся, що твій `orderRoutes.js` використовує ці назви
module.exports = { 
    createOrder, 
    getOrderById,
    updateOrderToPaid,
    notifyMe,
    getMyOrders, // <-- ДОДАНО
    getAllOrders // <-- ДОДАНО (для адмінки)
};