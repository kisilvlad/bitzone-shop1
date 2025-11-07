// backend/server.js

const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const connectDB = require('./config/db'); // Підключення до БД
const { errorHandler } = require('./middleware/errorMiddleware');

// ----------------------- Ініціалізація -----------------------
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT || 5000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

// Довіряємо проксі (якщо є Nginx/Cloudflare)
app.set('trust proxy', 1);

// Увімкнути strong ETag (за замовчуванням увімкнено, але фіксуємо явно)
app.set('etag', 'strong');

// ----------------------- Підключення до БД -----------------------
connectDB(); // Викликаємо функцію підключення

// ----------------------- Фонові сервіси -----------------------
require('./services/syncService'); // Запускаємо наш сервіс

// ----------------------- Безпека/логування/стиснення -----------------------
app.use(
  helmet({
    crossOriginResourcePolicy: false, // залишено, як було у тебе
    contentSecurityPolicy: false,     // вимкнено суворий CSP, щоб не ламати фронт
  })
);

app.use(compression());

if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ----------------------- CORS -----------------------
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || CORS_ORIGIN === '*' || origin === CORS_ORIGIN) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'If-Modified-Since',
      'If-None-Match',
      'Accept',
      'Origin',
    ],
    maxAge: 86400, // кеш префлайтів на 24 години
  })
);

// ----------------------- Парсинг тіла -----------------------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

// ----------------------- Лімітер (лише для /api/auth) -----------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      'Забагато спроб входу з цієї IP-адреси, будь ласка, спробуйте знову через 15 хвилин',
  },
});

// ----------------------- Кешування статики (зображення/шрифти/JS/CSS) -----------------------
const setStaticCacheHeaders = (res /*, filePath */) => {
  // Річний кеш + immutable, щоб браузер не перетягав файли при скролі/навігації
  res.setHeader(
    'Cache-Control',
    'public, max-age=31536000, immutable, no-transform'
  );
  // ETag/Last-Modified виставляє express.static автоматично
};

// Папка зі статикою фронтенду (за потреби)
const publicDir = path.join(__dirname, 'public');
app.use(
  '/public',
  express.static(publicDir, {
    etag: true,
    lastModified: true,
    fallthrough: true,
    setHeaders: setStaticCacheHeaders,
  })
);

// Папка зображень/завантажень (використовує твій шлях backend/uploads)
const uploadsDir = path.join(__dirname, 'uploads');
app.use(
  '/uploads',
  express.static(uploadsDir, {
    etag: true,
    lastModified: true,
    fallthrough: true,
    setHeaders: setStaticCacheHeaders,
  })
);

// ----------------------- Healthcheck -----------------------
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json({
    status: 'ok',
    env: NODE_ENV,
    time: new Date().toISOString(),
  });
});

// ----------------------- Маршрути API -----------------------
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/images', require('./routes/imageRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes')); // <-- ДОДАНО ЦЕЙ РЯДОК (як у тебе)

// ----------------------- Централізований обробник помилок -----------------------
app.use(errorHandler);

// ----------------------- Запуск сервера -----------------------
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Сервер успішно запущено на порту http://localhost:${PORT} [${NODE_ENV}]`);
});
