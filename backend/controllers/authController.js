// backend/controllers/authController.js
// !!! ФІКС ДЛЯ `username is required` !!!

const User = require('../models/User');
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

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з такою поштою вже існує');
    }

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

    // --- !!! ФІКС 'username' !!! ---
    // Додаємо `username: email` сюди,
    // тому що `User.js` вимагає це поле
    const user = await User.create({
        username: email, // <-- ОСЬ ВИПРАВЛЕННЯ
        name: `${firstName} ${lastName}`,
        email,
        password,
        roAppId: roAppId 
    });

    if (user) {
        res.status(201).json({
            _id: user._id, 
            roAppId: user.roAppId, 
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user.roAppId), // Токен з roAppId
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

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            roAppId: user.roAppId,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            token: generateToken(user.roAppId), // Токен з roAppId
        });
    } else {
        res.status(401);
        throw new Error('Неправильний email або пароль');
    }
});

module.exports = { registerUser, loginUser };