// backend/controllers/authController.js
// !!! ФІКС: "Лікування" + `email: null` + токени з `roAppId` !!!

const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const roappApi = require('../utils/roappApi'); // <-- !!! ВИКОРИСТОВУЄМО НОВИЙ ФАЙЛ !!!

// --- Функція генерації токена (з roAppId) ---
const generateToken = (id) => {
    if (typeof id !== 'number') {
        console.error(`Критична помилка: Спроба згенерувати токен з не-числовим ID: ${id}`);
        throw new Error('Не вдалося згенерувати токен (неправильний ID)');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- Функція пошуку/створення RoApp ID ---
const findOrCreateRoAppCustomer = async (user) => {
    try {
        const searchResponse = await roappApi.get('contacts/people', {
            params: { 'phones[]': user.phone }
        });

        if (searchResponse.data.data.length > 0) {
            return searchResponse.data.data[0].id; // Знайшли
        } else {
            console.log(`[RoApp] Користувача ${user.phone} не знайдено, створюємо нового...`);
            const newCustomerPayload = {
                first_name: user.firstName || user.name.split(' ')[0] || 'Клієнт',
                last_name: user.lastName || user.name.split(' ')[1] || '',
                phones: [{ "title": "Основний", "phone": user.phone, "notify": false }],
                email: user.email || '', // Email не обов'язковий
            };
            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            return createCustomerResponse.data.id; // Створили
        }
    } catch (error) {
        console.error(`[RoApp] Помилка при пошуку/створенні ${user.phone}:`, error.response?.data || error.message);
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

    const userExists = await User.findOne({ phone });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким телефоном вже існує');
    }

    const roAppId = await findOrCreateRoAppCustomer({
        phone, firstName, lastName, email
    });

    if (typeof roAppId !== 'number') {
        res.status(500);
        throw new Error('Не вдалося створити клієнта в CRM (не отримано ID)');
    }

    const user = await User.create({
        name: `${firstName} ${lastName || ''}`.trim(),
        firstName,
        lastName: lastName || '',
        phone,
        email: email || null, // <-- !!! ФІКС E11000: Явно вказуємо null !!!
        password,
        username: phone, 
        roAppId: roAppId 
    });

    if (user) {
        res.status(201).json({
            _id: user._id, 
            roAppId: user.roAppId, 
            name: user.name,
            email: user.email,
            phone: user.phone,
            isAdmin: user.isAdmin,
            token: generateToken(user.roAppId), // Генеруємо токен з roAppId
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

    const user = await User.findOne({ phone });

    if (!user || !(await user.matchPassword(password))) {
        res.status(401);
        throw new Error('Неправильний телефон або пароль');
    }

    // --- !!! ГОЛОВНЕ "ЛІКУВАННЯ" ТУТ !!! ---
    if (typeof user.roAppId !== 'number') {
        console.warn(`[FIX] Користувач ${user.phone} не мав roAppId. Виправляємо...`);
        try {
            const roAppId = await findOrCreateRoAppCustomer(user);
            if (typeof roAppId === 'number') {
                user.roAppId = roAppId;
                await user.save(); 
                console.log(`[FIX] Користувача ${user.phone} вилікувано. Новий roAppId: ${roAppId}`);
            } else {
                 throw new Error('findOrCreateRoAppCustomer не повернув числовий ID');
            }
        } catch (error) {
            console.error(`[FIX] Не вдалося "вилікувати" ${user.phone}:`, error.message);
            res.status(500);
            throw new Error('Помилка синхронізації CRM. Спробуйте пізніше.');
        }
    }
    // --- Кінець "лікування" ---

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