// backend/controllers/userController.js

const axios = require('axios');
const asyncHandler = require('express-async-handler'); // Імпортуємо asyncHandler

const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// @desc    Отримання профілю користувача
// @route   GET /api/users/me
const getUserProfile = asyncHandler(async (req, res) => {
    const { data: user } = await roappApi.get(`contacts/people/${req.user.id}`);
    res.json({
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phones.find(p => p.is_primary)?.phone || user.phones[0]?.phone || '',
        birthday: user.custom_fields[process.env.BIRTHDAY_CUSTOM_FIELD_ID] || '',
    });
});

// @desc    Оновлення профілю користувача
// @route   PUT /api/users/me
const updateUserProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, birthday } = req.body;
    
    const payload = {
        first_name: firstName,
        last_name: lastName,
        custom_fields: { [process.env.BIRTHDAY_CUSTOM_FIELD_ID]: birthday }
    };

    const { data: updatedUser } = await roappApi.patch(`contacts/people/${req.user.id}`, payload);
    res.json({
        success: true,
        user: {
            firstName: updatedUser.first_name,
            lastName: updatedUser.last_name,
            birthday: updatedUser.custom_fields[process.env.BIRTHDAY_CUSTOM_FIELD_ID] || '',
        }
    });
});

// @desc    Отримання замовлень користувача
// @route   GET /api/users/my-orders
const getMyOrders = asyncHandler(async (req, res) => {
    const response = await roappApi.get('orders', { params: { client_id: req.user.id, _sort: "-created_at" } });
    const orders = response.data.data.map(order => ({
        id: order.id,
        createdAt: order.created_at,
        status: order.status.title,
        statusColor: order.status.color,
        total: order.total_sum
    }));
    res.json(orders);
});

// @desc    Отримання відгуків користувача
// @route   GET /api/users/me/reviews
const getMyReviews = asyncHandler(async (req, res) => {
    console.log(`----- ЗАПИТ ВІДГУКІВ для користувача ID: ${req.user.id} -----`);
    try {
        const { data } = await roappApi.get('customer-reviews', {
            params: { 
                person: req.user.id,
                _sort: "-created_at"
            }
        });
        const reviews = data.data.map(review => ({
            id: review.id,
            rating: review.custom_fields[process.env.REVIEW_RATING_FIELD_ID] || 0,
            text: review.custom_fields[process.env.REVIEW_TEXT_FIELD_ID] || '',
            createdAt: review.created_at,
            product: {
                id: review.product.id,
                name: review.product.title,
                image: review.product.images?.length > 0 ? review.product.images[0].image : '/assets/bitzone-logo1.png'
            }
        }));
        res.json(reviews);
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log("Відповідь від ROAPP 404, відправляємо порожній масив на фронтенд.");
            return res.json([]);
        }
        // Для інших помилок передаємо їх далі на центральний обробник
        throw new Error('Не вдалося завантажити відгуки користувача.');
    }
});

module.exports = { 
    getUserProfile, 
    updateUserProfile, 
    getMyOrders, 
    getMyReviews 
};
