// backend/controllers/orderController.js
// !!! ВИПРАВЛЕННЯ, ЩОБ ВИКОРИСТОВУВАТИ roAppId !!!

const axios = require('axios');
const asyncHandler = require('express-async-handler');

// ... (roappApi та ID константи ... )
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});
const MY_BRANCH_ID = 212229;
const MY_ORDER_TYPE_ID = 325467;
const MY_ASSIGNEE_ID = 306951;

const createOrder = asyncHandler(async (req, res) => {
    // ... (код createOrder не змінився, він використовує req.user.id) ...
    // ... (але `optionalAuthMiddleware` тепер має це виправити) ...
    
    // (Повний код createOrder з твого файлу)
    const { customerData, cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) {
        res.status(400);
        throw new Error('Неможливо створити замовлення без товарів');
    }

    let customerId;
    if (req.user && req.user.roAppId) { // !!! ФІКС: перевіряємо roAppId !!!
        customerId = req.user.roAppId;
    } else {
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

const getOrderById = asyncHandler(async (req, res) => {
    const { id: orderId } = req.params;
    
    // !!! ФІКС: Явно беремо roAppId та isAdmin з req.user !!!
    const userId = req.user.roAppId;
    const isAdmin = req.user.isAdmin;

    const { data: orderData } = await roappApi.get(`orders/${orderId}`);
    
    if (String(orderData.client_id) !== String(userId) && !isAdmin) {
        res.status(403);
        throw new Error('Доступ заборонено');
    }
    // ... (решта функції getOrderById ... )
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

const updateOrderToPaid = asyncHandler(async (req, res) => {
    // ... (код без змін) ...
    const { id } = req.params;
    console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
    res.json({ id, isPaid: true, paidAt: new Date() });
});

const notifyMe = asyncHandler(async (req, res) => {
    // ... (код без змін) ...
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

const getMyOrders = asyncHandler(async (req, res) => {
    // !!! ФІКС: Явно беремо roAppId !!!
    const userId = req.user.roAppId;

    if (!userId) {
        res.status(401);
        throw new Error('Користувач не авторизований (немає roAppId)');
    }

    const { data: ordersResponse } = await roappApi.get('orders', {
        params: {
            client_id: userId,
            sort: '-created_at'
        }
    });
    // ... (решта функції без змін) ...
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

const getAllOrders = asyncHandler(async (req, res) => {
    // ... (код без змін) ...
    if (!req.user.isAdmin) {
        res.status(403);
        throw new Error('Доступ заборонено. Потрібні права адміністратора.');
    }
    const { data: ordersResponse } = await roappApi.get('orders', {
         params: { sort: '-created_at' }
    });
    res.json(ordersResponse.data);
});

module.exports = { 
    createOrder, 
    getOrderById,
    updateOrderToPaid,
    notifyMe,
    getMyOrders,
    getAllOrders
};