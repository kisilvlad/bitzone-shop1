// backend/server.js

const path = require('path');
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

// ---------- Безпека / базові middleware ----------
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json()); // Для парсингу JSON-тіл запитів

// ---------- Роздача статики для зображень (бекенд-uploads/public) ----------
const setStaticCacheHeaders = (res, filePath) => {
  const ext = path.extname(filePath || '').toLowerCase();
  const longCacheExt = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf']);
  if (longCacheExt.has(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable, no-transform');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  }
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

// ---------- Rate Limiter (лише на /api/auth) ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин'
  }
});

// ---------- МАРШРУТИ API (без змін) ----------
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes')); // як було

// ---------- Роздача фронтенд-білда + SPA fallback ----------
const clientBuild = path.join(__dirname, '../frontend/build');

// 1) Статика білда з правильним кешем для ассетів
app.use(express.static(clientBuild, {
  etag: true,
  lastModified: true,
  fallthrough: true,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath || '').toLowerCase();
    const longCacheExt = new Set(['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf']);
    if (longCacheExt.has(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable, no-transform');
    } else {
      // index.html та ін.: без довгого кешу
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

// 2) SPA fallback: всі НЕ-API запити -> index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// ---------- Централізований обробник помилок ----------
app.use(errorHandler);

// ---------- Запуск сервера ----------
app.listen(PORT, () => {
  console.log(`🚀 Сервер успішно запущено на порту http://localhost:${PORT}`);
});

// Діагностика необроблених помилок (необов’язково)
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
