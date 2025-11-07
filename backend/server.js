// backend/server.js

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
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

// ---------- Безпека / базові middleware ----------
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json()); // Для парсингу JSON-тіл запитів

// ДОДАНО: стиснення відповідей
app.use(compression());

// ---------- ДОДАНО: роздача статики з правильним кешуванням ----------
const setStaticCacheHeaders = (res /*, filePath */) => {
  // Річний кеш + immutable, щоб браузер не перетягував зображення при скролі/навігації
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable, no-transform');
  // ETag/Last-Modified виставляються express.static автоматично
};

// Якщо у тебе папки інші — заміни шляхи нижче
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

// ---------- Rate Limiter (як у тебе, тільки на /api/auth) ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин'
  }
});

// ---------- МАРШРУТИ ----------
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes')); // <-- як і було

// ---------- Централізований обробник помилок ----------
app.use(errorHandler);

// ---------- Запуск сервера ----------
app.listen(PORT, () => {
  console.log(`🚀 Сервер успішно запущено на порту http://localhost:${PORT}`);
});

// (Не обов'язково, але корисно бачити непродумані відмови промісів)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
