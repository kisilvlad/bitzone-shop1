// backend/controllers/orderController.js

const axios = require('axios');
const asyncHandler = require('express-async-handler');
const Product = require('../models/productModel'); // <-- ІМПОРТУЄМО МОДЕЛЬ

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

// Функція створення замовлення залишається без змін
const createOrder = asyncHandler(async (req, res) => {
    const { customerData, cartItems } = req.body;
    if (!cartItems || cartItems.length === 0) {
        res.status(400);
        throw new Error('Неможливо створити замовлення без товарів');
    }

    let customerId;
    if (req.user && req.user.id) {
        customerId = req.user.id;
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
    const { id: userId } = req.user;

    const { data: orderData } = await roappApi.get(`orders/${orderId}`, {
        params: { _with: 'client' }
    });
    
    const ownerId = orderData.client ? orderData.client.id : undefined;

    if (!ownerId || String(ownerId) !== String(userId)) {
        res.status(403);
        throw new Error('Доступ заборонено');
    }

    const { data: itemsData } = await roappApi.get(`orders/${orderId}/items`);

    // --- ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ ---
    // Створюємо надійний масив товарів. Якщо Roapp не повернув `data`,
    // ми створимо порожній масив, щоб уникнути падіння сервера.
    const orderItemsFromApi = (itemsData && Array.isArray(itemsData.data)) ? itemsData.data : [];

    if (orderItemsFromApi.length === 0) {
        console.log(`[DEBUG] Roapp API не повернув товарів для замовлення ${orderId}. Спроба відновити з локальної БД.`);
    }

    const items = await Promise.all(orderItemsFromApi.map(async (item) => {
        let productName = 'Назва товару завантажується...';
        let productImage = '/assets/bitzone-logo1.png'; // Картинка-заглушка

        // Спочатку перевіряємо, чи надав Roapp повну інформацію
        if (item.product && item.product.title) {
            productName = item.product.title;
            if (item.product.images?.length > 0) {
                productImage = item.product.images[0].image;
            }
        } else {
            // Якщо ні - шукаємо товар у нашій локальній базі даних
            console.log(`[Fallback] Roapp не повернув дані для товару ${item.entity_id}. Шукаємо в локальній БД.`);
            const localProduct = await Product.findOne({ roappId: item.entity_id });
            if (localProduct) {
                productName = localProduct.name;
                productImage = localProduct.image || '/assets/bitzone-logo1.png';
            }
        }

        return {
            id: item.entity_id,
            name: productName,
            price: item.price,
            quantity: item.quantity,
            image: productImage
        };
    }));

    // Надійно розраховуємо загальну суму.
    // Якщо Roapp її ще не надав, ми розрахуємо її самі на основі товарів.
    const total = orderData.total_sum || items.reduce((sum, current) => sum + (current.price * current.quantity), 0);

    const result = {
        id: orderData.id,
        createdAt: orderData.created_at,
        status: orderData.status ? orderData.status.title : 'В обробці',
        statusColor: orderData.status ? orderData.status.color : '#888888',
        total: total,
        items: items,
    };

    res.json(result);
});

// Решта файлу залишається без змін
const updateOrderToPaid = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`Замовлення ${id} позначено як оплачене (симуляція)`);
    res.json({ id, isPaid: true, paidAt: new Date() });
});

const notifyMe = asyncHandler(async (req, res) => {
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

module.exports = { 
    createOrder, 
    getOrderById,
    updateOrderToPaid,
    notifyMe 
};