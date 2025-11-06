// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Використовуємо вашу модель User.js
const axios = require('axios');

// Функція для генерації токена
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// Функція для відправки відповіді з токеном
const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 днів
        httpOnly: true,
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
        // options.sameSite = 'none'; // Потрібно, якщо frontend і backend на різних доменах
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

// Допоміжна функція для створення Ліда в RoApp
const createRoappLead = async (name, email, password) => {
    const url = 'https://api.roapp.com/v1/leads';
    const apiKey = process.env.ROAPP_API_KEY;
    
    const body = {
        lead_type_id: 20074, // "Клієнт (BitZone)"
        name: name,
        contacts: {
            email: email,
        },
        custom_fields: [
            {
                id: process.env.PASSWORD_CUSTOM_FIELD_ID, // <--- ВИПРАВЛЕНО
                value: password
            }
        ]
    };

    try {
        const response = await axios.post(url, body, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            }
        });
        return response.data;
    } catch (error) {
        console.error('Помилка при створенні Ліда в RoApp:', error.response ? error.response.data : error.message);
        return null; // Не "ламати" реєстрацію, якщо RoApp недоступний
    }
};

// @desc    Реєстрація нового користувача
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // 1. Перевірка, чи користувач вже існує
        const userExists = await User.findOne({ email });
        if (userExists) {
            res.status(400);
            throw new Error('Користувач з таким email вже існує');
        }

        // 2. Створення нового користувача в нашій базі
        const user = await User.create({
            name,
            email,
            password,
        });

        // 3. Якщо користувач успішно створений в MongoDB
        if (user) {
            // 4. Створюємо Ліда в RoApp (асинхронно)
            const roappLead = await createRoappLead(name, email, password);

            // 5. Якщо Лід створений, оновлюємо нашого юзера
            if (roappLead && roappLead.id) {
                user.roappId = roappLead.id;
                await user.save();
            }

            // 6. Відправляємо токен і відповідь
            sendTokenResponse(user, 201, res);
        } else {
            res.status(400);
            throw new Error('Невірні дані користувача');
        }
    } catch (error) {
        next(error); // Передаємо помилку в errorMiddleware
    }
};

// @desc    Автентифікація користувача (Логін)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1. Перевірка email та пароля
        if (!email || !password) {
            res.status(400);
            throw new Error('Будь ласка, введіть email та пароль');
        }

        // 2. Пошук користувача
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            res.status(401); // 401 (Unauthorized) - більш коректно для логіна
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

    } catch (error) {
        next(error);
    }
};

// @desc    Вихід користувача (Logout)
// @route   GET /api/auth/logout
// @access  Private
const logoutUser = async (req, res, next) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000), // 10 секунд
            httpOnly: true,
        });

        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Отримати поточного користувача
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
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
    } catch (error) {
        next(error);
    }
};


module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getMe
};