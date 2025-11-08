// backend/models/User.js
// !!! ФІКС: `sparse: true` для email ТА roAppId !!!

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        // --- ОБОВ'ЯЗКОВІ ПОЛЯ ---
        name: {
            type: String,
            required: [true, 'Ім\'я є обов\'язковим'],
        },
        // 'username' вимагається згідно з логами
        username: {
            type: String,
            required: [true, 'Path `username` is required.'],
            unique: true,
        },
        password: {
            type: String,
            required: [true, 'Пароль є обов\'язковим'],
        },
        phone: {
            type: String,
            required: [true, 'Телефон є обов\'язковим'],
            unique: true,
            match: [/^\+?[0-9]{10,15}$/, 'Неправильний формат телефону'],
        },

        // --- НЕ ОБОВ'ЯЗКОВІ ПОЛЯ ---
        roAppId: {
            type: Number,
            required: false, // "Старі" користувачі можуть не мати
            unique: true,
            sparse: true // Дозволяє мати багато null
        },
        email: {
            type: String,
            required: false, // <-- !!! ЕМЕЙЛ НЕ ОБОВ'ЯЗКОВИЙ !!!
            unique: true,
            // !!! ФІКС: `sparse: true` дозволяє мати багато `null` значень !!!
            sparse: true, 
            match: [/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/, 'Неправильний формат email'],
        },
        isAdmin: {
            type: Boolean,
            required: true,
            default: false,
        },
        firstName: String,
        lastName: String,
        birthday: Date,
    },
    {
        timestamps: true,
    }
);

// --- Bcrypt (як і було) ---
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;