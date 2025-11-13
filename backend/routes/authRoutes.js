// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { registerUser, loginUser } = require('../controllers/authController');

// --- СХЕМА ВАЛІДАЦІЇ ДЛЯ РЕЄСТРАЦІЇ ---
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).required().messages({
    'string.base': `Ім'я має бути рядком`,
    'string.empty': `Ім'я не може бути порожнім`,
    'string.min': `Ім'я має містити щонайменше {#limit} символи`,
    'any.required': `Поле "Ім'я" є обов'язковим`,
  }),

  lastName: Joi.string().min(2).required().messages({
    'string.base': `Прізвище має бути рядком`,
    'string.empty': `Прізвище не може бути порожнім`,
    'string.min': `Прізвище має містити щонайменше {#limit} символи`,
    'any.required': `Поле "Прізвище" є обов'язковим`,
  }),

  phone: Joi.string()
    .pattern(/^(?:\+380|380|0)\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': `Невірний формат телефону (наприклад: 0991234567)`,
      'any.required': `Поле "Телефон" є обов'язковим`,
    }),

  // 👇 Email робимо НЕобов'язковим
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .allow('', null)
    .optional()
    .messages({
      'string.email': `Невірний формат email`,
    }),

  password: Joi.string().min(8).required().messages({
    'string.min': `Пароль має містити щонайменше {#limit} символів`,
    'any.required': `Поле "Пароль" є обов'язковим`,
  }),
});

// --- СХЕМА ВАЛІДАЦІЇ ДЛЯ ВХОДУ ---
const loginSchema = Joi.object({
  phone: Joi.string().required().messages({
    'any.required': `Поле "Телефон" є обов'язковим`,
  }),
  password: Joi.string().required().messages({
    'any.required': `Поле "Пароль" є обов'язковим`,
  }),
});

// --- MIDDLEWARE ДЛЯ ВАЛІДАЦІЇ ---
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    allowUnknown: false, // зайві поля забороняємо
    abortEarly: true,
  });

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};

// --- МАРШРУТИ ---
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

module.exports = router;
