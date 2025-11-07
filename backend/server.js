// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');
const path = require('path');
const redisClient = require('./config/redisClient'); // Ваш Redis
const imageCache = require('./middleware/imageCache'); // Ваш кеш

// Ініціалізація
if (process.env.NODE_ENV !== 'production') {
  console.log('Running in development mode, loading .env file...');
  dotenv.config();
} else {
  // В production .env теж потрібен! RoApp API ключі та інше.
  // Можливо, ви їх ставите глобально, але якщо ні - dotenv потрібен.
  // Якщо .env файл лежить поруч, краще завжди його завантажувати:
  dotenv.config();
}

// --- ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
connectDB();

// --- ЗАПУСК ФОНОВОЇ СИНХРОНІЗАЦІЇ ---
require('./services/syncService');

const app = express();
const PORT = process.env.PORT || 5000;

// === ФІКС ДЛЯ RATE-LIMIT ТА NGINX/APACHE ===
// Це виправить помилку "X-Forwarded-For"
app.set('trust proxy', 1);
// ==========================================

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors()); 
app.use(express.json()); 

// Rate Limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 спроб на 15 хвилин
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин' }
});

// МАРШРУТИ
app.use('/api/auth', authLimiter, require('./routes/authRoutes')); 
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', imageCache, require('./routes/imageRoutes')); // Ваш кеш для картинок
app.use('/api/webhooks', require('./routes/webhookRoutes'));

// --- ЦЕНТРАЛІЗОВАНИЙ ОБРОБНИК ПОМИЛОК ---
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер успішно запущено на порту ${PORT}`);
});