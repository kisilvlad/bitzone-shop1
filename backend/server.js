// backend/server.js
// !!! ФІКС: Додано правильні налаштування CORS для твого домену !!!

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');

// Ініціалізація
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
// Вкажи URL твого фронтенду (з Hostinger)
const allowedOrigins = [
    'https://bitzone.com.ua', // <-- !!! ЗАМІНИ ЦЕ НА СВІЙ ДОМЕН (наприклад, https://bitzone.shop) !!!
    'https://www.bitzone.com.ua' // <-- Додай також версію з www
];

const corsOptions = {
    origin: function (origin, callback) {
        // Дозволяємо запити без origin (наприклад, Postman або мобільні додатки)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
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
	max: 10,
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