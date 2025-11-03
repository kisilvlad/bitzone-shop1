// backend/server.js
// !!! ФІНАЛЬНА ВЕРСІЯ З CORS ДЛЯ 'bitzone.com.ua' !!!

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');

// Ініціалізація
// Запускаємо dotenv ТІЛЬКИ в розробці (development)
if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode, loading .env file...');
  dotenv.config();
}

// --- ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
connectDB();

// --- ЗАПУСК ФОНОВОЇ СИНХРОНІЗАЦІЇ ---
require('./services/syncService');

const app = express();
const PORT = process.env.PORT || 5000;

// --- !!! ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ: НАЛАШТУВАННЯ CORS !!! ---
// Вказуємо твій домен на Hostinger
const allowedOrigins = [
    'https://bitzone.com.ua',
    'https://www.bitzone.com.ua'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Дозволяємо запити без origin (наприклад, Postman) АБО якщо origin є в списку
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            const msg = 'CORS policy: Access not allowed from this Origin.';
            return callback(new Error(msg), false);
        }
    },
    credentials: true, // Дозволяємо передавати токени
    optionsSuccessStatus: 200 
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(corsOptions)); // <-- Використовуємо нові налаштування
app.use(express.json()); 

// Rate Limiter
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10, // Дозволяє 10 спроб на 15 хв
	standardHeaders: true,
	legacyHeaders: false,
    message: { message: 'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин' }
});

// МАРШРУТИ
app.use('/api/auth', authLimiter, require('./routes/authRoutes')); 
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));

// --- ЦЕНТРАЛІЗОВАНИЙ ОБРОБНИК ПОМИЛОК ---
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер успішно запущено на порту ${PORT}`);
});