// backend/server.js

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
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

// ---------- !!! ФІКС ДЛЯ 'trust proxy' !!! ----------
// Це повідомляє Express, що він знаходиться за 1 рівнем проксі (Nginx, etc.)
// Це ПОВИННО бути ДО `app.use(helmet())` та rate-limiters
app.set('trust proxy', 1);

// ---------- Безпека / базові middleware ----------
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ---------- Роздача статики (як і було) ----------
const setStaticCacheHeaders = (res /*, filePath */) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable, no-transform');
};
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir, {
  etag: true,
  lastModified: true,
  fallthrough: true,
  setHeaders: setStaticCacheHeaders
}));
const publicDir = path.join(__dirname, 'public');
app.use('/public', express.static(publicDir, {
  etag: true,
  lastModified: true,
  fallthrough: true,
  setHeaders: setStaticCacheHeaders
}));

// ---------- Rate Limiter (тепер він буде працювати коректно) ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин'
  }
});

const novaPostRoutes = require('./routes/novaPostRoutes');

// ---------- МАРШРУТИ (як і було) ----------
app.use('/api/novapost', novaPostRoutes);
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes')); 

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);
// ---------- Централізований обробник помилок ----------
app.use(errorHandler);

// ---------- Запуск сервера ----------
app.listen(PORT, () => {
  console.log(`🚀 Сервер успішно запущено на порту http://localhost:${PORT}`);
});

// Логування (як і було)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});