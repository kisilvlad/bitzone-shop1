// backend/server.js
// !!! ФІНАЛЬНА ВЕРСІЯ ДЛЯ VPS: Прибрано allowedOrigins (це зробить Nginx) !!!

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');

// Ініціалізація
// !!! ФІКС: Запускаємо dotenv ТІЛЬКИ в розробці (development) !!!
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

// --- !!! СПРОЩЕНИЙ CORS ДЛЯ VPS !!! ---
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors()); // <-- Nginx буде нашим "фільтром", тому тут дозволяємо все.
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