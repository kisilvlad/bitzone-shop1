// backend/models/User.js
// !!! ФІКС: Вхід за ТЕЛЕФОНОМ !!!

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        // --- ОБОВ'ЯЗКОВІ ПОЛЯ ---
        name: {
            type: String,
            required: [true, 'Ім\'я є обов\'язковим'],
        },
        // 'username' вимагається згідно з логами, ми будемо
        // використовувати телефон як username
        username: {
            type: String,
            required: [true, 'Path `username` is required.'],
            unique: true,
        },
        password: {
            type: String,
            required: [true, 'Пароль є обов\'язковим'],
        },
        // --- ФІКС: ТЕЛЕФОН ТЕПЕР ГОЛОВНИЙ ---
        phone: {
            type: String,
            required: [true, 'Телефон є обов\'язковим'],
            unique: true,
            match: [/^\+?[0-9]{10,15}$/, 'Неправильний формат телефону'],
        },
        roAppId: {
            type: Number,
            required: [true, 'roAppId є обов\'язковим'],
            unique: true,
        },

        // --- НЕ ОБОВ'ЯЗКОВІ ПОЛЯ ---
        // ФІКС: Email тепер не є обов'язковим
        email: {
            type: String,
            unique: true,
            // Перевірка формату, тільки якщо email надано
            match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Неправильний формат email'],
            sparse: true // Дозволяє мати nhiều null, але тільки один унікальний email
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        // Додаткові поля, які були у вашому Account.jsx
        firstName: String,
        lastName: String,
        birthday: Date,
    },
    {
        timestamps: true,
    }
);

// --- Bcrypt (як і було) ---

// Шифрування пароля перед збереженням
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Метод для порівняння паролів
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- Експорт ---
const User = mongoose.model('User', userSchema);
module.exports = User;