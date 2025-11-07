// backend/controllers/authController.js
// !!! ГОЛОВНИЙ ФІКС - ГЕНЕРАЦІЯ ПРАВИЛЬНОГО ТОКЕНА !!!

const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// --- RoApp API (з твого orderController) ---
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// --- Функція генерації токена ---
// !!! ФІКС !!!
// Ми очікуємо, що `id` тут - це числовий roAppId
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, phone, password } = req.body;

    // 1. Перевіряємо, чи є вже такий Mongoose User
    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з такою поштою вже існує');
    }

    // 2. Створюємо клієнта в RoApp
    let roAppId;
    try {
        const newCustomerPayload = {
            first_name: firstName,
            last_name: lastName,
            phones: [{ "title": "Основний", "phone": phone, "notify": false, "has_viber": false, "has_whatsapp": false }],
            email: email,
        };
        const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
        roAppId = createCustomerResponse.data.id;

        if (!roAppId) {
            throw new Error('RoApp не повернув ID клієнта');
        }

    } catch (error) {
        console.error("Помилка створення клієнта в RoApp:", error.response?.data || error.message);
        res.status(500);
        throw new Error('Не вдалося створити клієнта в CRM');
    }

    // 3. Створюємо Mongoose User
    const user = await User.create({
        name: `${firstName} ${lastName}`,
        email,
        password,
        roAppId: roAppId // !!! ЗБЕРІГАЄМО ID З ROAPP
    });

    // 4. Повертаємо Mongoose User + Токен з ROAPP ID
    if (user) {
        res.status(201).json({
            _id: user._id, // Mongoose ID
            roAppId: user.roAppId, // RoApp ID
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            // !!! ГОЛОВНИЙ ФІКС !!!
            // Створюємо токен, використовуючи roAppId, а не _id
            token: generateToken(user.roAppId),
        });
    } else {
        res.status(400);
        throw new Error('Неправильні дані користувача');
    }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // 1. Знаходимо Mongoose User
    const user = await User.findOne({ email });

    // 2. Перевіряємо пароль і повертаємо дані
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            roAppId: user.roAppId,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            // !!! ГОЛОВНИЙ ФІКС !!!
            // Створюємо токен, використовуючи roAppId
            token: generateToken(user.roAppId),
        });
    } else {
        res.status(401);
        throw new Error('Неправильний email або пароль');
    }
});

module.exports = { registerUser, loginUser };