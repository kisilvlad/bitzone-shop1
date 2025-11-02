// backend/routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { optimizeImage } = require('../controllers/imageController');

router.get('/', optimizeImage);

module.exports = router;