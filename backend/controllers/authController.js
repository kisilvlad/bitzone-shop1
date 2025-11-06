// backend/controllers/authController.js
const User = require('../models/User');
const asyncHandler = require('express-async-handler'); // === ДОДАНО ===

// === ЛОГІКУ ГЕНЕРАЦІЇ ТОКЕНА ВИДАЛЕНО ЗВІДСИ ===

// Функція для відправки відповіді з токеном
const sendTokenResponse = (user, statusCode, res) => {
    // === ВИКОРИСТОВУЄМО НОВИЙ МЕТОД З МОДЕЛІ ===
    const token = user.getSignedJwtToken(); 

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
        // Примітка: 'sameSite: none' вимагає 'secure: true'. 
        // Якщо у вас frontend і backend на різних доменах, це може знадобитись.
        // options.sameSite = 'none'; 
    }

    res.status(statusCode)
       .cookie('token', token, options)
       .json({
           success: true,
           token,
           user: { // Повертаємо дані користувача
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
// === ОБГОРНУТО В ASYNCHANDLER, ПРИБРАНО TRY...CATCH ===
const registerUser = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Перевірка, чи користувач вже існує
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким email вже існує');
    }

    // Створення нового користувача
    const user = await User.create({
        name,
        email,
        password,
    });

    // Відправка токена
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
// === ОБГОРНУТО В ASYNCHANDLER, ПРИБРАНО TRY...CATCH ===
const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Перевірка email та пароля
    if (!email || !password) {
        res.status(400);
        throw new Error('Будь ласка, введіть email та пароль');
    }

    // Пошук користувача + витягуємо пароль
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        res.status(401);
        throw new Error('Невірний email або пароль');
    }

    // Перевірка пароля
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        res.status(401);
        throw new Error('Невірний email або пароль');
    }

    // Відправка токена
    sendTokenResponse(user, 200, res);
});

// @desc    Вихід користувача (Logout)
// @route   GET /api/auth/logout
// @access  Private
// === ОБГОРНУТО В ASYNCHANDLER, ПРИБРАНО TRY...CATCH ===
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
// === ОБГОРНУТО В ASYNCHANDLER, ПРИБРАНО TRY...CATCH ===
const getMe = asyncHandler(async (req, res, next) => {
    // req.user встановлюється в middleware/authMiddleware.js
    const user = await User.findById(req.user.id);
    
    if (!user) {
        res.status(404);
        throw new Error('Користувача не знайдено');
    }

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