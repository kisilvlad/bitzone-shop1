// backend/controllers/userController.js
// !!! ФІКС: ВИКОРИСТАННЯ ПРАВИЛЬНИХ ID (roAppId vs _id) !!!

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const axios = require('axios');

// --- RoApp API (для відгуків) ---
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// @desc    Get user profile (for Settings tab)
// @route   GET /api/users/me
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    // Ця функція працює з Mongoose. 
    // Вона (правильно) використовує `req.user._id`.
    // Помилка 500 була через `req.user` = null. 
    // Наш новий `authController` це виправив.
    
    // `req.user` приходить з `authMiddleware`
    const user = await User.findById(req.user._id); 

    if (user) {
        res.json({
            _id: user._id,
            roAppId: user.roAppId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            // Додано поля з Account.jsx
            firstName: user.firstName || user.name.split(' ')[0],
            lastName: user.lastName || user.name.split(' ')[1] || '',
            birthday: user.birthday
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Update user profile (for Settings tab)
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    // Ця функція теж працює з Mongoose
    const user = await User.findById(req.user._id);

    if (user) {
        // Оновлюємо Mongoose
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.birthday = req.body.birthday || user.birthday;
        user.name = `${user.firstName} ${user.lastName}`.trim();
        
        // (Тут можна додати логіку оновлення email/phone/password,
        // але вона має бути складнішою, з перевірками)

        const updatedUser = await user.save();

        // Оновлюємо RoApp (асинхронно, не чекаємо)
        if (user.roAppId) {
            roappApi.put(`contacts/people/${user.roAppId}`, {
                first_name: updatedUser.firstName,
                last_name: updatedUser.lastName,
                // (RoApp не має 'birthday')
            }).catch(err => {
                console.error(`[RoApp] Помилка оновлення профілю ${user.roAppId}:`, err.message);
            });
        }

        res.json({
            _id: updatedUser._id,
            roAppId: updatedUser.roAppId,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            isAdmin: updatedUser.isAdmin,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            birthday: updatedUser.birthday
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Get user reviews (for Reviews tab)
// @route   GET /api/users/me/reviews
// @access  Private
const getUserReviews = asyncHandler(async (req, res) => {
    // !!! ФІКС !!!
    // Лог показав, що сюди йшов Mongoose ID (`690...`).
    // Нам потрібен `roAppId` (число)
    const customerId = req.user.roAppId;

    console.log(`----- ЗАПИТ ВІДГУКІВ для RoApp ID: ${customerId} -----`);

    if (!customerId) {
        console.warn(`Користувач ${req.user.phone} не має roAppId. Неможливо завантажити відгуки.`);
        res.json([]); // Повертаємо порожній масив
        return;
    }
    
    try {
        //
        const { data } = await roappApi.get('/customer-reviews', {
            params: {
                customer_id: customerId 
            }
        });
        
        // Адаптуємо відповідь RoApp до формату,
        // який очікує Account.jsx
        const reviews = data.data.map(review => ({
            id: review.id,
            rating: review.rating,
            text: review.text,
            createdAt: review.created_at,
            product: {
                id: review.product?.id || null,
                name: review.product?.title || 'Видалений товар',
                image: review.product?.images?.length > 0 ? review.product.images[0].image : '/assets/bitzone-logo1.png'
            }
        }));

        res.json(reviews);

    } catch (error) {
        // Якщо RoApp повертає 404 (немає відгуків),
        // ми просто повертаємо порожній масив
        if (error.response && error.response.status === 404) {
            console.log(`Відповідь від ROAPP 404 (немає відгуків), відправляємо порожній масив на фронтенд.`);
            res.json([]);
        } else {
            console.error(`[RoApp] Помилка завантаження відгуків для ${customerId}:`, error.message);
            res.status(500);
            throw new Error('Не вдалося завантажити відгуки');
        }
    }
});

// (Інші функції: getUsers, deleteUser, getUserById, updateUser...)
// ... вони, ймовірно, для адмінки і зараз не є проблемою ...

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserReviews,
    // ... (експорт інших функцій, якщо вони є) ...
};