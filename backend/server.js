// backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db'); // Імпортуємо функцію підключення до БД
const { errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('express-rate-limit');

// Ініціалізація
dotenv.config();

// --- ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
connectDB(); // Викликаємо функцію підключення

// --- ЗАПУСК ФОНОВОЇ СИНХРОНІЗАЦІЇ ---
require('./services/syncService'); // Запускаємо наш сервіс

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware (проміжні обробники)
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json()); // Для парсингу JSON-тіл запитів

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
app.use('/api/webhooks', require('./routes/webhookRoutes')); // <-- ДОДАНО ЦЕЙ РЯДОК

// --- ЦЕНТРАЛІЗОВАНИЙ ОБРОБНИК ПОМИЛОК ---
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер успішно запущено на порту http://localhost:${PORT}`);
});
