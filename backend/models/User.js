// Це повний вміст файлу backend/models/User.js

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

// ===================================================================
// ▼▼▼ ДОДАЙТЕ ЦЕЙ "ГАЧОК" (HOOK) В КІНЕЦЬ ФАЙЛУ ▼▼▼
// ===================================================================
// Цей код автоматично викличе syncUserToRoapp ПІСЛЯ
// успішного збереження нового користувача в базі даних.
userSchema.post('save', async function (doc) {
  // `roappId` тут ще не буде, бо користувач тільки-но створений.
  // Ми перевіряємо, чи був він встановлений раніше (для надійності).
  // `wasNew` – це більш надійний прапорець, який ми можемо встановити у `pre('save')`,
  // але для простоти перевіримо `roappId`.
  
  // Примітка: `this.isNew` не працює в `post` хуках, тому ми дивимось на `doc`.
  // Нам потрібно переконатися, що це спрацює лише один раз при створенні.
  
  // Давайте використаємо `created_at` і `updated_at` для перевірки.
  // Якщо вони дуже близькі, це, ймовірно, нове створення.
  // Або, ще простіше: якщо `roappId` не встановлено, ми спробуємо синхронізувати.
  
  if (!doc.roappId) { 
    try {
      // Завантажуємо сервіс "ліниво" (тут), 
      // щоб уникнути циклічних залежностей між файлами.
      const syncService = require('../services/syncService');
      
      // Викликаємо нашу нову функцію з виправленням
      await syncService.syncUserToRoapp(doc); 
      
    } catch (error) {
      console.error('Помилка "гачка" User.save (post): не вдалося синхронізувати з Roapp:', error);
      // Ми НЕ кидаємо помилку (throw error) далі, 
      // щоб реєстрація на сайті пройшла успішно, 
      // навіть якщо синхронізація з Roapp дала збій.
    }
  }
});
// ===================================================================

module.exports = User;