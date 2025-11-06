// backend/controllers/authController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler'); // <-- ДОДАНО

// Опції для cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken(); // <-- ВИКОРИСТОВУЄМО НОВИЙ МЕТОД

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
        options.sameSite = 'none';
    }

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
           success: true,
           token,
           user: {
               _id: user._id,
               name: user.name,
               email: user.email,
               isAdmin: user.isAdmin,
           }
       });
};

// @desc    Реєстрація нового користувача
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res, next) => { // <-- ОГОРНУТО В ASYNCHANDLER
    const { name, email, password } = req.body;

    // 1. Перевірка, чи користувач вже існує
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким email вже існує');
    }

    // 2. Створення нового користувача
    const user = await User.create({
        name,
        email,
        password,
    });

    // 3. Відправка токена
    if (user) {
        sendTokenResponse(user, 201, res);
    } else {
        res.status(400);
        throw new Error('Невірні дані користувача');
    }
});

// @desc    Автентифікація користувача (Логін)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res, next) => { // <-- ОГОРНУТО В ASYNCHANDLER
    const { email, password } = req.body;

    // 1. Перевірка email та пароля
    if (!email || !password) {
        res.status(400);
        throw new Error('Будь ласка, введіть email та пароль');
    }

    // 2. Пошук користувача
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        res.status(401);
        throw new Error('Невірний email або пароль');
    }

    // 3. Перевірка пароля
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        res.status(401);
        throw new Error('Невірний email або пароль');
    }

    // 4. Відправка токена
    sendTokenResponse(user, 200, res);
});

// @desc    Вихід користувача (Logout)
// @route   GET /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // 10 секунд
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        data: {},
    });
});

// @desc    Отримати поточного користувача
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res, next) => {
    // req.user встановлюється в middleware/authMiddleware.js
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
        success: true,
        user: {
           _id: user._id,
           name: user.name,
           email: user.email,
           isAdmin: user.isAdmin,
        }
    });
});


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getMe
};