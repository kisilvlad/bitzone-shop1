// backend/controllers/userController.js
// !!! ФІКС: Виправлено ID для RoApp vs Mongoose !!!

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const roappApi = require('../utils/roappApi'); // <-- !!! ВИКОРИСТОВУЄМО НОВИЙ ФАЙЛ !!!

// @desc    Get user profile (for Settings tab)
// @route   GET /api/users/me (або /api/users/profile)
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    // Ця функція працює з Mongoose. 
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
// @route   PUT /api/users/me (або /api/users/profile)
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        // Оновлюємо Mongoose
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.birthday = req.body.birthday || user.birthday;
        user.name = `${user.firstName} ${user.lastName}`.trim();
        
        const updatedUser = await user.save();

        // Оновлюємо RoApp (асинхронно)
        if (user.roAppId) {
            roappApi.put(`contacts/people/${user.roAppId}`, {
                first_name: updatedUser.firstName,
                last_name: updatedUser.lastName,
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
    // Беремо `roAppId` (число)
    const customerId = req.user.roAppId;

    console.log(`----- ЗАПИТ ВІДГУКІВ для RoApp ID: ${customerId} -----`);

    if (!customerId) {
        console.warn(`Користувач ${req.user.phone} не має roAppId. Неможливо завантажити відгуки.`);
        res.json([]); 
        return;
    }
    
    try {
        const { data } = await roappApi.get('/customer-reviews', {
            params: {
                customer_id: customerId 
            }
        });
        
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
        if (error.response && error.response.status === 404) {
            console.log(`Відповідь від ROAPP 404 (немає відгуків), відправляємо порожній масив.`);
            res.json([]);
        } else {
            console.error(`[RoApp] Помилка завантаження відгуків для ${customerId}:`, error.message);
            res.status(500);
            throw new Error('Не вдалося завантажити відгуки');
        }
    }
});

// Експортуємо тільки те, що використовується (згідно з userRoutes.js)
module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserReviews,
    // (інші функції адміна, такі як deleteUser, getUserById, updateUser,
    // які є у тебе, тут не потрібні для виправлення Account.jsx)
};