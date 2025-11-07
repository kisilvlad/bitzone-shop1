// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const axios = require('axios');
const asyncHandler = require('express-async-handler'); 

// ... (функції generateToken, sendTokenResponse залишаються без змін) ...

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);
    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
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

// === БЕЗПЕЧНА ФУНКЦІЯ СТВОРЕННЯ ЛІДА В ROAPP ===
// Вона залишається без змін
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
                id: process.env.PASSWORD_CUSTOM_FIELD_ID, 
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
        console.log('Лід в RoApp успішно створено:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('ПОМИЛКА при створенні Ліда в RoApp:', error.response ? error.response.data : error.message);
        return null; 
    }
};

// @desc    Реєстрація нового користувача
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res, next) => { 
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Користувач з таким email вже існує');
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        // === ОПТИМІЗАЦІЯ ШВИДКОСТІ ===
        
        // 1. НЕГАЙНО віддаємо відповідь користувачу
        sendTokenResponse(user, 201, res);
        
        // 2. ПІСЛЯ ЦЬОГО запускаємо повільну синхронізацію з RoApp у фоні
        const roappLead = await createRoappLead(name, email, password);

        if (roappLead && roappLead.id) {
            // Тихо оновлюємо нашого юзера в базі
            await User.findByIdAndUpdate(user._id, { roappId: roappLead.id.toString() });
        }
        // ============================

    } else {
        res.status(400);
        throw new Error('Невірні дані користувача');
    }
});

// @desc    Автентифікація користувача (Логін)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res, next) => { 
    // === ЛОГІН І ТАК ШВИДКИЙ, ТУТ ЗМІН НЕ ПОТРІБНО ===
    // Він не робить запитів до RoApp
    
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Будь ласка, введіть email та пароль');
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        res.status(401); 
        throw new Error('Невірний email або пароль');
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        res.status(401);
        throw new Error('Невірний email або пароль');
    }

    sendTokenResponse(user, 200, res);
});

// ... (решта файлу: logoutUser, getMe залишаються без змін) ...

const logoutUser = asyncHandler(async (req, res, next) => { 
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), 
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        data: {},
    });
});

const getMe = asyncHandler(async (req, res, next) => { 
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