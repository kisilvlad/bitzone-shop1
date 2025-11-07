// backend/middleware/authMiddleware.js
// !!! ПОВНІСТЮ ОНОВЛЕНИЙ ФАЙЛ !!!

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// (Ця функція, ймовірно, у тебе вже є і працює)
const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Знаходимо користувача Mongoose за ID з токена
            // і прикріплюємо його до req.user
            // ВАЖЛИВО: ми вибираємо `roAppId`, щоб він був у `req.user`
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, token failed (user not found)');
            }
            
            // ВАЖЛИВО: Ми очікуємо, що `req.user.id` - це roAppId
            // Переконаємось, що це так. Якщо у моделі User.js ID для RoApp 
            // називається `roAppId`, то ми робимо так:
            if (req.user.roAppId) {
                // Перезаписуємо `id` для сумісності з `orderController`
                req.user.id = req.user.roAppId;
            } else {
                 // Якщо `roAppId` немає, ми припускаємо,
                 // що `_id` з Mongoose - це і є roAppId.
                 // Це ризиковано, але так було у твоєму коді.
                 // Найкраще - перевірити, як `roAppId` збережено у User.js
                 req.user.id = req.user._id.toString(); 
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// (Ця функція, ймовірно, у тебе вже є і працює)
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id).select('-password');
            
            if (req.user && req.user.roAppId) {
                req.user.id = req.user.roAppId;
            } else if (req.user) {
                req.user.id = req.user._id.toString();
            }

        } catch (error) {
            // Якщо токен невалідний, просто ігноруємо
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
});


// !!! ФІКС: ДОДАЄМО ВІДСУТНЮ ФУНКЦІЮ 'admin' !!!
const admin = (req, res, next) => {
    // Ця функція має запускатися *після* `authMiddleware`
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403); // 403 Forbidden
        throw new Error('Not authorized as an admin');
    }
};


// !!! ФІКС: ДОДАЄМО 'admin' В ЕКСПОРТ !!!
module.exports = { authMiddleware, optionalAuthMiddleware, admin };