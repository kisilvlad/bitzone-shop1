// backend/controllers/userController.js
// !!! ФІКС: Виправлено ID для RoApp (Відгуки) vs Mongoose (Налаштування) !!!

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const roappApi = require('../utils/roappApi'); // <-- !!! ВИКОРИСТОВУЄМО НОВИЙ ФАЙЛ !!!

// @desc    Get user profile (for Settings tab)
// @route   GET /api/users/me
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
    // Ця функція ПРАВИЛЬНО використовує Mongoose `req.user._id`.
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
        throw new Error('User not found (Mongoose)');
    }
});

// @desc    Update user profile (for Settings tab)
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
    // Ця функція ПРАВИЛЬНО використовує Mongoose `req.user._id`.
    const user = await User.findById(req.user._id);

    if (user) {
        user.firstName = req.body.firstName || user.firstName;
        user.lastName = req.body.lastName || user.lastName;
        user.birthday = req.body.birthday || user.birthday;
        user.name = `${user.firstName} ${user.lastName}`.trim();
        
        const updatedUser = await user.save();

        // Оновлюємо RoApp (асинхронно)
        if (typeof user.roAppId === 'number') {
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
        throw new Error('User not found (Mongoose)');
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

    if (typeof customerId !== 'number') {
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

// Експортуємо тільки те, що використовується
module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserReviews,
};