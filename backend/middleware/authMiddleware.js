// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// --- ЦЕЙ MIDDLEWARE ЗАЛИШАЄТЬСЯ БЕЗ ЗМІН (для захищених сторінок, як профіль) ---
const authMiddleware = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: decoded.id, name: decoded.name };
            next();
        } catch (error) {
            console.error('Помилка авторизації:', error.message);
            res.status(401);
            throw new Error('Не авторизовано, токен недійсний');
        }
    }
    if (!token) {
        res.status(401);
        throw new Error('Не авторизовано, токен відсутній');
    }
});

// --- НОВА ФУНКЦІЯ: "Опціональна" перевірка авторизації ---
// Вона намагається розшифрувати токен, якщо він є, але не видає помилку, якщо його немає.
// Це ідеально підходить для створення замовлень.
const optionalAuthMiddleware = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Якщо токен валідний, додаємо дані користувача до запиту
            req.user = { id: decoded.id, name: decoded.name };
        } catch (error) {
            // Якщо токен є, але він невалідний, нічого не робимо, req.user залишиться undefined
            console.log('Надано невалідний токен, запит обробляється як гостьовий.');
        }
    }
    // Незалежно від того, чи був токен, ми пропускаємо запит далі
    next();
});


// --- ОНОВЛЕНИЙ ЕКСПОРТ ---
module.exports = {
    authMiddleware,
    optionalAuthMiddleware // Експортуємо обидві функції
};