// backend/controllers/authController.js
// !!! ФІКС: "ЛІКУВАННЯ" СТАРИХ КОРИСТУВАЧІВ ПРИ ВХОДІ !!!

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
    // Перевірка, що ID існує, перш ніж генерувати
    if (!id) {
        console.error("Критична помилка: Спроба згенерувати токен без ID");
        throw new Error('Не вдалося згенерувати токен');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- Функція пошуку/створення RoApp ID ---
const findOrCreateRoAppCustomer = async (user) => {
    try {
        // 1. Шукаємо в RoApp за телефоном
        const searchResponse = await roappApi.get('contacts/people', {
            params: { 'phones[]': user.phone }
        });

        if (searchResponse.data.data.length > 0) {
            // Знайшли, повертаємо ID
            return searchResponse.data.data[0].id;
        } else {
            // 2. Не знайшли? Створюємо в RoApp
            console.log(`[RoApp] Користувача ${user.phone} не знайдено, створюємо нового...`);
            const newCustomerPayload = {
                first_name: user.firstName || user.name.split(' ')[0] || 'Клієнт',
                last_name: user.lastName || user.name.split(' ')[1] || '',
                phones: [{ "title": "Основний", "phone": user.phone, "notify": false }],
                email: user.email || '',
            };
            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            return createCustomerResponse.data.id;
        }
    } catch (error) {
        console.error(`[RoApp] Помилка при пошуку/створенні клієнта ${user.phone}:`, error.message);
        throw new Error('Помилка синхронізації з CRM');
    }
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, phone, password, email } = req.body;

    if (!phone || !password || !firstName) {
        res.status(400);
        throw new Error('Будь ласка, заповніть обов\'язкові поля (Ім\'я, Телефон, Пароль)');
    }

    // 1. Перевіряємо Mongoose
    const userExists = await User.findOne({ phone });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким телефоном вже існує');
    }

    // 2. Знаходимо або створюємо RoApp ID
    // (Ми передаємо тимчасовий об'єкт, схожий на user)
    const roAppId = await findOrCreateRoAppCustomer({
        phone, firstName, lastName, email
    });

    if (!roAppId) {
        res.status(500);
        throw new Error('Не вдалося створити клієнта в CRM');
    }

    // 3. Створюємо Mongoose User
    const user = await User.create({
        name: `${firstName} ${lastName || ''}`.trim(),
        firstName,
        lastName: lastName || '',
        phone,
        email: email || null, 
        password,
        username: phone, // (Як і домовлялися, username = phone)
        roAppId: roAppId // <-- Зберігаємо ID
    });

    // 4. Повертаємо дані
    if (user) {
        res.status(201).json({
            _id: user._id, 
            roAppId: user.roAppId, 
            name: user.name,
            email: user.email,
            phone: user.phone,
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
    const { phone, password } = req.body;

    // 1. Знаходимо Mongoose User
    const user = await User.findOne({ phone });

    // 2. Перевіряємо пароль
    if (!user || !(await user.matchPassword(password))) {
        res.status(401);
        throw new Error('Неправильний телефон або пароль');
    }

    // --- !!! ГОЛОВНЕ "ЛІКУВАННЯ" ТУТ !!! ---
    // 3. Перевіряємо, чи є у старого користувача roAppId
    if (!user.roAppId) {
        console.warn(`[FIX] Користувач ${user.phone} не мав roAppId. Виправляємо...`);
        try {
            const roAppId = await findOrCreateRoAppCustomer(user);
            if (roAppId) {
                user.roAppId = roAppId;
                await user.save(); // Зберігаємо ID в Mongoose
                console.log(`[FIX] Користувача ${user.phone} вилікувано. Новий roAppId: ${roAppId}`);
            }
        } catch (error) {
            // Не блокуємо вхід, якщо RoApp недоступний,
            // але логуємо помилку
            console.error(`[FIX] Не вдалося "вилікувати" ${user.phone}:`, error.message);
            // Якщо ми не змогли отримати ID, ми не можемо згенерувати токен
            res.status(500);
            throw new Error('Помилка синхронізації CRM. Спробуйте пізніше.');
        }
    }
    // --- Кінець "лікування" ---

    // 4. Повертаємо дані
    res.json({
        _id: user._id,
        roAppId: user.roAppId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        token: generateToken(user.roAppId), // Токен з (тепер гарантованим) roAppId
    });
});

module.exports = { registerUser, loginUser };