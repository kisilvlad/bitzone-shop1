// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // === ДОДАНО ===

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Будь ласка, додайте ім'я"],
        },
        email: {
            type: String,
            required: [true, "Будь ласка, додайте email"],
            unique: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Будь ласка, введіть коректний email',
            ],
        },
        password: {
            type: String,
            required: [true, "Будь ласка, додайте пароль"],
            minlength: 6,
            select: false, // Не повертати пароль за замовчуванням
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

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

// === НОВИЙ МЕТОД ДЛЯ ГЕНЕРАЦІЇ TOKENA ===
userSchema.methods.getSignedJwtToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
// ======================================

module.exports = mongoose.model('User', userSchema);