// backend/controllers/imageController.js
// !!! ФІКС: ПІДКЛЮЧЕННЯ ДО REDIS ЧЕРЕЗ process.env.REDIS_URL !!!

const axios = require('axios');
const sharp = require('sharp');
const asyncHandler = require('express-async-handler');
const redis = require('redis');

// --- !!! ОСЬ ГОЛОВНЕ ВИПРАВЛЕННЯ !!! ---
// Ми створюємо клієнт, лише якщо REDIS_URL вказано
let redisClient;

// Upstash використовує 'rediss://' (з 's'), що вимагає 'tls'
if (process.env.REDIS_URL) {
    const redisURL = process.env.UPSTASH_REDIS_URL;
    
    redisClient = redis.createClient({
        url: redisURL,
        // Додаємо цей об'єкт, якщо URL починається з rediss://
        socket: redisURL.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : undefined
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    
    (async () => {
        if (!redisClient.isOpen) {
            try {
                await redisClient.connect();
                console.log('✅ Redis (Upstash) успішно підключено!');
            } catch (err) {
                console.error('❌ Не вдалося підключитися до Redis (Upstash):', err);
            }
        }
    })();
} else {
    console.warn("****************************************************************");
    console.warn("!!! УВАГА: REDIS_URL не налаштовано в .env !!!");
    console.warn("!!! Кешування зображень вимкнено. Додаток працюватиме повільніше. !!!");
    console.warn("****************************************************************");
}
// --- КІНЕЦЬ ВИПРАВЛЕННЯ ---

const IMAGE_CACHE_EXPIRATION = 3600; // Час життя кешу (1 година)

const optimizeImage = asyncHandler(async (req, res) => {
    const { url: imageUrl, w, h, q } = req.query;

    if (!imageUrl) {
        res.status(400);
        throw new Error('URL зображення не вказано');
    }

    const width = w ? parseInt(w) : 400;
    const height = h ? parseInt(h) : 400;
    const quality = q ? parseInt(q) : 80;

    const cacheKey = `image:${encodeURIComponent(imageUrl)}:w${width}:h${height}:q${quality}`;
    
    // 1. ПЕРЕВІРЯЄМО КЕШ (тільки якщо Redis підключено)
    if (redisClient && redisClient.isOpen) {
        try {
            const cachedImage = await redisClient.get(cacheKey);
            if (cachedImage) {
                console.log(`Cache HIT for image: ${cacheKey}`);
                res.set('Content-Type', 'image/webp');
                return res.send(Buffer.from(cachedImage, 'base64'));
            }
            console.log(`Cache MISS for image: ${cacheKey}`);
        } catch (err) {
            console.error("Redis GET Error:", err.message);
        }
    }
    
    try {
        const response = await axios({ url: imageUrl, responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        const optimizedBuffer = await sharp(buffer)
            .resize({ width, height, fit: 'inside', withoutEnlargement: true })
            .webp({ quality })
            .toBuffer();

        // 2. ЗБЕРІГАЄМО В КЕШ (тільки якщо Redis підключено)
        if (redisClient && redisClient.isOpen) {
            try {
                await redisClient.setEx(cacheKey, IMAGE_CACHE_EXPIRATION, optimizedBuffer.toString('base64'));
            } catch (err) {
                 console.error("Redis SET Error:", err.message);
            }
        }
        
        res.set('Content-Type', 'image/webp');
        res.send(optimizedBuffer);

    } catch (error) {
        console.error(`Помилка обробки зображення: ${imageUrl}`, error.message);
        res.status(500);
        throw new Error('Не вдалося обробити зображення');
    }
});

module.exports = { optimizeImage };