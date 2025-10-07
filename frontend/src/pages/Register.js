// src/pages/Register.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import formatPrice from '../utils/formatPrice'; // Не використовується, але для сумісності з іншими сторінками

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validatePhone = (phone) => {
    // Український формат: +380 XX XXX XX XX або 0XX XXX XX XX
    const phoneRegex = /^(\+380|0)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validatePassword = (password) => {
    // Мінімум 8 символів, з цифрою та великою літерою
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Ім'я обов'язкове";
    if (!formData.lastName.trim()) newErrors.lastName = "Прізвище обов'язкове";
    if (!formData.phone.trim()) {
      newErrors.phone = "Телефон обов'язковий";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Невірний формат телефону (наприклад: +380 67 123 45 67)";
    }
    if (!formData.password) {
      newErrors.password = "Пароль обов'язковий";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Пароль повинен містити мінімум 8 символів, велику літеру та цифру";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm() && !isSubmitting) {
      setIsSubmitting(true);
      // Симуляція API виклику (замість реального бекенду)
      setTimeout(() => {
        // Збереження в localStorage для демо (в реальності - POST на сервер)
        const users = JSON.parse(localStorage.getItem('bitzone_users') || '[]');
        const newUser = { ...formData, id: Date.now().toString() };
        users.push(newUser);
        localStorage.setItem('bitzone_users', JSON.stringify(users));
        
        alert(`Реєстрація успішна, ${formData.firstName}! Тепер увійдіть у акаунт.`);
        setSuccess(true);
        setIsSubmitting(false);
        // Redirect на login через 1.5s
        setTimeout(() => navigate('/login'), 1500);
      }, 1500);
    }
  };

  // Анімації
  const formVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  const inputVariants = {
    focus: { scale: 1.02, boxShadow: '0 0 20px var(--turquoise)', transition: { duration: 0.2 } },
    error: { borderColor: 'var(--pink)', boxShadow: '0 0 10px var(--pink)' }
  };

  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: '0 0 25px var(--green)', y: -2 },
    tap: { scale: 0.98, y: 0 }
  };

  const successVariants = {
    hidden: { scale: 0, opacity: 0, rotate: -180 },
    visible: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <section className="container">
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        className="surface center"
        style={{
          padding: 48,
          minHeight: '60vh',
          // Видалено maxWidth для повної ширини контейнера
          margin: '0 auto',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-card), 0 0 40px rgba(76,175,80,0.1)',
          background: 'linear-gradient(180deg, rgba(26,26,26,0.95), rgba(12,12,12,0.95))',
          border: '1px solid rgba(76,175,80,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Фоновий градієнт для неонового ефекту */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(45deg, rgba(76,175,80,0.05), rgba(0,245,255,0.05))',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <AnimatePresence>
          {!success ? (
            <>
              <motion.h1
                className="h1 retro"
                style={{
                  marginBottom: 40, // Збільшено з 32 до 40 для більшого відступу від полів
                  background: 'linear-gradient(45deg, var(--yellow), var(--green))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(76,175,80,0.5)',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1
                }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                👤 Реєстрація
              </motion.h1>

              <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
                <div className="grid grid-2" style={{ gap: 20 }}> {/* Змінено на grid-2 для двох колонок на широкому екрані */}
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--yellow)', marginBottom: 6, display: 'block', fontSize: 12 }}>Ім'я</label>
                    <motion.input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="input"
                      style={{ width: '100%' }}
                      variants={inputVariants}
                      whileFocus="focus"
                      animate={errors.firstName ? "error" : undefined}
                      placeholder="Введіть ім'я"
                    />
                    {errors.firstName && (
                      <motion.p
                        className="p"
                        style={{ color: 'var(--pink)', fontSize: 10, marginTop: 4 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {errors.firstName}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="h2 mono" style={{ color: 'var(--yellow)', marginBottom: 6, display: 'block', fontSize: 12 }}>Прізвище</label>
                    <motion.input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="input"
                      style={{ width: '100%' }}
                      variants={inputVariants}
                      whileFocus="focus"
                      animate={errors.lastName ? "error" : undefined}
                      placeholder="Введіть прізвище"
                    />
                    {errors.lastName && (
                      <motion.p
                        className="p"
                        style={{ color: 'var(--pink)', fontSize: 10, marginTop: 4 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {errors.lastName}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="h2 mono" style={{ color: 'var(--yellow)', marginBottom: 6, display: 'block', fontSize: 12 }}>Телефон</label>
                    <motion.input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="input"
                      style={{ width: '100%' }}
                      variants={inputVariants}
                      whileFocus="focus"
                      animate={errors.phone ? "error" : undefined}
                      placeholder="+380 67 123 45 67"
                    />
                    {errors.phone && (
                      <motion.p
                        className="p"
                        style={{ color: 'var(--pink)', fontSize: 10, marginTop: 4 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {errors.phone}
                      </motion.p>
                    )}
                  </div>

                  <div>
                    <label className="h2 mono" style={{ color: 'var(--yellow)', marginBottom: 6, display: 'block', fontSize: 12 }}>Пароль</label>
                    <motion.input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input"
                      style={{ width: '100%' }}
                      variants={inputVariants}
                      whileFocus="focus"
                      animate={errors.password ? "error" : undefined}
                      placeholder="Мінімум 8 символів з великою літерою та цифрою"
                    />
                    {errors.password && (
                      <motion.p
                        className="p"
                        style={{ color: 'var(--pink)', fontSize: 10, marginTop: 4 }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="btn btn-green"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    marginTop: 24,
                    padding: '14px',
                    fontSize: 12,
                    background: isSubmitting ? 'linear-gradient(180deg, #666, #444)' : 'linear-gradient(180deg, var(--green), var(--green-2))',
                    borderColor: isSubmitting ? '#666' : 'var(--green)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  {isSubmitting ? '🎮 Реєструємо...' : '🎮 Зареєструватися'}
                </motion.button>
              </form>

              <motion.p
                style={{
                  textAlign: 'center',
                  marginTop: 28, // Збільшено з 20 до 28 для більшого відступу від кнопки
                  fontSize: 10,
                  opacity: 0.8,
                  color: 'var(--yellow)',
                  position: 'relative',
                  zIndex: 1
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
              >
                Вже маєте акаунт? <Link to="/login" style={{ color: 'var(--turquoise)', textDecoration: 'none' }}>Увійдіть</Link>
              </motion.p>
            </>
          ) : (
            <motion.div
              variants={successVariants}
              initial="hidden"
              animate="visible"
              className="center"
              style={{ flexDirection: 'column', gap: 20, position: 'relative', zIndex: 1 }}
            >
              <motion.div
                className="mono"
                style={{
                  color: 'var(--green)',
                  fontSize: 18,
                  textShadow: '0 0 15px var(--green)',
                  textAlign: 'center'
                }}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
              >
                ✅ Успішно!
              </motion.div>
              <p className="p" style={{ opacity: 0.9, textAlign: 'center', fontSize: 11 }}>
                Перенаправляємо на вхід...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}