// backend/middleware/authMiddleware.js
// !!! ГОЛОВНИЙ ФІКС ДЛЯ 401 !!!

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
            // Шукаємо Mongoose-користувача за `roAppId` з токена.
            req.user = await User.findOne({ roAppId: decoded.id }).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, token failed (user not found)');
            }
            
            // !!! ГОЛОВНЕ !!!
            // Ми БІЛЬШЕ НЕ перезаписуємо req.user.id.
            // Тепер `req.user` має і `_id` (для Mongoose) і `roAppId` (для RoApp).

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
            
            // !!! ФІКС !!! (Та сама логіка)
            req.user = await User.findOne({ roAppId: decoded.id }).select('-password');
            
            // (Не перезаписуємо ID)

        } catch (error) {
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
});

// Функція `admin` (правильна, залишаємо)
const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403); 
        throw new Error('Not authorized as an admin');
    }
};

module.exports = { authMiddleware, optionalAuthMiddleware, admin };