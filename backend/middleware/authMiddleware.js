// backend/middleware/authMiddleware.js
// !!! ФІНАЛЬНЕ ВИПРАВЛЕННЯ (BSONTypeError / CastError) !!!

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // !!! ФІКС !!!
            // Раніше було: User.findById(decoded.id),
            // але в токені у нас roAppId (число), а не Mongoose _id.
            // Шукаємо користувача за полем roAppId.
            req.user = await User.findOne({ roAppId: decoded.id }).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, token failed (user not found)');
            }
            
            // !!! ВАЖЛИВО !!!
            // Ми додаємо `id` до `req.user`
            // Це числовий `roAppId`, який потрібен `orderController`
            // для запитів до roappApi.
            req.user.id = req.user.roAppId; 

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

const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // !!! ФІКС !!!
            // Та сама логіка, що й у authMiddleware
            req.user = await User.findOne({ roAppId: decoded.id }).select('-password');
            
            if (req.user) {
                // Додаємо `roAppId` як `req.user.id`
                req.user.id = req.user.roAppId;
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

// Функція `admin` (яку ми додали раніше, вона правильна)
const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403); // 403 Forbidden
        throw new Error('Not authorized as an admin');
    }
};

// Експортуємо все
module.exports = { authMiddleware, optionalAuthMiddleware, admin };