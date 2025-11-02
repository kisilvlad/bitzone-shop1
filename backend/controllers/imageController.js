// backend/controllers/imageController.js
const axios = require('axios');
const sharp = require('sharp');
const asyncHandler = require('express-async-handler');
const redis = require('redis');

const redisClient = redis.createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));
(async () => { if (!redisClient.isOpen) await redisClient.connect(); })();

const IMAGE_CACHE_EXPIRATION = 3600;

const optimizeImage = asyncHandler(async (req, res) => {
  const { url: imageUrl } = req.query;
  const w = req.query.w ? parseInt(req.query.w, 10) : undefined;
  const h = req.query.h ? parseInt(req.query.h, 10) : undefined;
  const quality = req.query.q ? parseInt(req.query.q, 10) : 80;

  if (!imageUrl) {
    res.status(400);
    throw new Error('URL зображення не вказано');
  }

  // ключ кешу враховує лише реально задані параметри
  const cacheKey = `image:${encodeURIComponent(imageUrl)}:w${w||'x'}:h${h||'x'}:q${quality}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(Buffer.from(cached, 'base64'));
  }

  const response = await axios({ url: imageUrl, responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data, 'binary');

  const resizeOpts = { fit: 'inside', withoutEnlargement: true };
  if (w) resizeOpts.width = w;
  if (h) resizeOpts.height = h;

  const optimized = await sharp(buffer)
    .rotate()                             // нормалізація EXIF-орієнтації
    .resize(resizeOpts)                   // лишаємо тільки задані обмеження
    .webp({ quality })
    .toBuffer();

  await redisClient.setEx(cacheKey, IMAGE_CACHE_EXPIRATION, optimized.toString('base64'));
  res.set('Content-Type', 'image/webp');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(optimized);
});

module.exports = { optimizeImage };
