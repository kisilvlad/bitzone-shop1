// backend/controllers/authController.js

const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // Імпортуємо asyncHandler

const roappApi = axios.create({
    baseURL: 'https://api.roapp.io/',
    headers: {
        'accept': 'application/json',
        'authorization': `Bearer ${process.env.ROAPP_API_KEY}`
    }
});

// @desc    Реєстрація нового користувача
// @route   POST /api/auth/register
const registerUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, phone, password } = req.body; 
    
    const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': phone } });
    if (searchResponse.data.data.length > 0) {
        res.status(409); // Conflict
        throw new Error('Користувач з таким номером телефону вже існує.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newCustomerPayload = {
        first_name: firstName,
        last_name: lastName,
        phones: [{"title": "Основний", "phone": phone, "notify": false, "has_viber": false, "has_whatsapp": false}],
        custom_fields: { [process.env.PASSWORD_CUSTOM_FIELD_ID]: hashedPassword }
    };

    await roappApi.post('contacts/people', newCustomerPayload);
    res.status(201).json({ success: true, message: 'Реєстрація успішна!' });
});

// @desc    Автентифікація користувача та отримання токену
// @route   POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
    const { phone, password } = req.body;

    const searchResponse = await roappApi.get('contacts/people', { params: { 'phones[]': phone } });
    if (searchResponse.data.data.length === 0) {
        res.status(401); // Unauthorized
        throw new Error('Неправильний телефон або пароль.');
    }

    const user = searchResponse.data.data[0];
    const storedHash = user.custom_fields[process.env.PASSWORD_CUSTOM_FIELD_ID];
    if (!storedHash) {
        res.status(401);
        throw new Error('Для цього користувача не встановлено пароль.');
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
        res.status(401);
        throw new Error('Неправильний телефон або пароль.');
    }

    const payload = { id: user.id, name: user.first_name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { name: user.first_name, phone: phone } });
});

module.exports = { 
    registerUser, 
    loginUser 
};