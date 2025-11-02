// backend/middleware/errorMiddleware.js

const errorHandler = (err, req, res, next) => {
    // Якщо статус код був 200 (OK), але сталася помилка, встановлюємо 500 (Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);

    console.error("❌ Спрацював центральний обробник помилок:", err.message);

    res.json({
        message: err.message,
        // В режимі розробки можна показувати стек помилки, в продакшені - ні
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { errorHandler };