// backend/controllers/authController.js
// !!! ВЕРСІЯ З ВИПРАВЛЕННЯМ ДЛЯ "email: null" !!!

const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const roappApi = require('../utils/roappApi');

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
// (Ця функція у вас написана ПРАВИЛЬНО, залишаємо її)
const findOrCreateRoAppCustomer = async (user) => {
    try {
        console.log(`[DEBUG] 1. Пошук RoApp юзера за телефоном: ${user.phone}`); // <-- ЛОГ 1
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
            };

            // Додаємо email у ПРАВИЛЬНОМУ форматі, тільки якщо він існує
            if (user.email) {
                newCustomerPayload.emails = [
                    { "title": "Основний", "email": user.email, "notify": false }
                ];
            }

            console.log(`[DEBUG] 2. Створення RoApp юзера. Payload:`, JSON.stringify(newCustomerPayload, null, 2)); // <-- ЛОГ 2

            const createCustomerResponse = await roappApi.post('contacts/people', newCustomerPayload);
            return createCustomerResponse.data.id; // Створили
        }
    } catch (error) {
        // Цей лог покаже нам ТОЧНУ помилку від RoApp
        console.error(`[DEBUG] 3. Помилка під час роботи з RoApp:`, error.response?.data || error.message); // <-- ЛОГ 3
        throw new Error(error.response?.data?.message || 'Помилка синхронізації з CRM');
    }
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    
    console.log(`[DEBUG] 0. Отримано запит на /api/auth/register. Body:`, req.body); // <-- ЛОГ 0

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

    // ==========================================================
    // (!!!) ОСЬ ГОЛОВНЕ ВИПРАВЛЕННЯ (!!!)
    // ==========================================================
    
    // 1. Створюємо об'єкт для нового користувача
    const newUserPayload = {
        name: `${firstName} ${lastName || ''}`.trim(),
        firstName,
        lastName: lastName || '',
        phone,
        password, // <--- Пароль тут. "Гачок" pre-save у User.js його захешує
        username: phone, 
        roAppId: roAppId
    };

    // 2. Додаємо email до об'єкта, ТІЛЬКИ ЯКЩО він не порожній.
    // Якщо `email` - це `undefined`, `null` або `""`,
    // поле `email` буде пропущено (omitted) при створенні.
    // Це саме те, що потрібно для `sparse: true` індексу.
    if (email) {
        newUserPayload.email = email;
    }

    // 3. Створюємо користувача з підготовленими даними
    const user = await User.create(newUserPayload);
    
    // ==========================================================
    // КІНЕЦЬ ВИПРАВЛЕННЯ
    // ==========================================================

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
    // ... (Ваша логіка логіну чудова, залишаємо її без змін) ...
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });

    if (!user || !(await user.matchPassword(password))) {
        res.status(401);
        throw new Error('Неправильний телефон або пароль');
    }

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

    res.json({
        _id: user._id,
        roAppId: user.roAppId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        token: generateToken(user.roAppId), 
    });
});

module.exports = { registerUser, loginUser };