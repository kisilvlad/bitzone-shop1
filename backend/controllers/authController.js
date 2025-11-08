// backend/controllers/authController.js
// !!! ФІКС: Вхід за ТЕЛЕФОНОМ !!!

const User = require('../models/User'); // Наша оновлена модель
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// --- RoApp API ---
const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// --- Функція генерації токена (з roAppId) ---
// (Ця функція коректна, залишаємо)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    // Отримуємо дані з фронтенду
    const { firstName, lastName, phone, password, email } = req.body;

    // !!! ФІКС: Перевіряємо за ТЕЛЕФОНОМ !!!
    if (!phone || !password || !firstName) {
        res.status(400);
        throw new Error('Будь ласка, заповніть обов\'язкові поля (Ім\'я, Телефон, Пароль)');
    }

    const userExists = await User.findOne({ phone });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким телефоном вже існує');
    }

    // 2. Створюємо клієнта в RoApp
    let roAppId;
    try {
        const newCustomerPayload = {
            first_name: firstName,
            last_name: lastName || '', // Прізвище може бути не обов'язковим
            phones: [{ "title": "Основний", "phone": phone, "notify": false, "has_viber": false, "has_whatsapp": false }],
            email: email || '', // Email не обов'язковий
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
    // !!! ФІКС: 'username: phone' !!!
    const user = await User.create({
        name: `${firstName} ${lastName || ''}`.trim(),
        firstName,
        lastName: lastName || '',
        phone,
        email: email || null, // Зберігаємо email, якщо він є
        password,
        username: phone, // <-- ЦЕ ВИПРАВИТЬ ПОМИЛКУ 'username is required'
        roAppId: roAppId 
    });

    // 4. Повертаємо Mongoose User + Токен з ROAPP ID
    if (user) {
        res.status(201).json({
            _id: user._id, 
            roAppId: user.roAppId, 
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
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
    // !!! ФІКС: Отримуємо ТЕЛЕФОН !!!
    const { phone, password } = req.body;

    // !!! ФІКС: Шукаємо за ТЕЛЕФОНОМ !!!
    const user = await User.findOne({ phone });

    // 2. Перевіряємо пароль і повертаємо дані
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            roAppId: user.roAppId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            token: generateToken(user.roAppId), // Токен з roAppId
        });
    } else {
        res.status(401);
        // !!! ФІКС: Оновлене повідомлення про помилку !!!
        throw new Error('Неправильний телефон або пароль');
    }
});

module.exports = { registerUser, loginUser };