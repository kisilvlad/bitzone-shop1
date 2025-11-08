// src/pages/Register.js

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

export default function Register() {
  // <-- ФІКС: Додано 'email'
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    setServerError('');
  };
  
  // ——— Валідація (без змін) ———
  const validatePhone = (phone) => {
    const phoneRegex = /^(\+380|0)\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };
  
  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };
  
  // ——— Валідація Email (Додано) ———
  const validateEmail = (email) => {
    if (!email) return true; // Email не обов'язковий
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Ім'я обов'язкове";
    if (!formData.lastName.trim()) newErrors.lastName = "Прізвище обов'язкове";
    
    const cleanedPhone = formData.phone.replace(/\s/g, '');
    if (!cleanedPhone) {
      newErrors.phone = "Телефон обов'язковий";
    } else if (!validatePhone(cleanedPhone)) {
      newErrors.phone = "Невірний формат телефону (наприклад: 0671234567)";
    }

    // <-- ФІКС: Валідація email (якщо він введений)
    if (formData.email && !validateEmail(formData.email)) {
        newErrors.email = "Невірний формат email";
    }

    if (!formData.password) {
      newErrors.password = "Пароль обов'язковий";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Пароль повинен містити мінімум 8 символів, велику літеру та цифру";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // ——— Логіка handleSubmit (без змін) ———
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleaned = formData.phone.replace(/\D/g, '');
      const normalizedPhone = cleaned.startsWith('0') ? `38${cleaned}` : cleaned;
      
      // <-- ФІКС: 'email' тепер включено в запит
      await axios.post('/api/auth/register', {
        ...formData,
        phone: normalizedPhone
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);

    } catch (err) {
      const message = err.response?.data?.message || 'Сталася помилка. Спробуйте ще раз.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formVariants = { hidden: { opacity: 0, y: 30, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
  const successVariants = { 
    hidden: { scale: 0.9, opacity: 0, y: 20 }, 
    visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } 
  };
  
  return (
    <section className="container">
      <motion.div 
        variants={formVariants} 
        initial="hidden" 
        animate="visible" 
        className="surface center auth-container"
        style={{ padding: 'clamp(24px, 5vw, 48px)' }} 
      >
        <div 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(45deg, rgba(76,175,80,0.05), rgba(0,245,255,0.05))', 
            pointerEvents: 'none', 
            zIndex: 0,
            '[data-theme="light"] &': {
              background: 'linear-gradient(45deg, rgba(76,175,80,0.08), rgba(0,245,255,0.08))',
            }
          }} 
        />
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', maxWidth: '400px', zIndex: 1 }}
            >
              <motion.h1 
                className="h1 retro" 
                style={{ 
                  marginBottom: '24px', 
                  textAlign: 'center', 
                  background: 'linear-gradient(45deg, var(--accent-yellow), var(--accent-green))', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  '[data-theme="light"] &': {
                     background: 'linear-gradient(45deg, var(--accent-yellow), var(--accent-green))',
                     WebkitBackgroundClip: 'text', 
                  }
                }} 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
              >
                👤 Реєстрація
              </motion.h1>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Ім'я</label>
                    <motion.input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="Введіть ім'я" />
                    {errors.firstName && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Прізвище</label>
                    <motion.input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="Введіть прізвище" />
                    {errors.lastName && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.lastName}</p>}
                  </div>
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Телефон</label>
                    <motion.input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="0..." />
                    {errors.phone && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.phone}</p>}
                  </div>

                  {/* <-- ФІКС: Додано поле Email --> */}
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Email (необов'язково)</label>
                    <motion.input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="Введіть email" />
                    {errors.email && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Пароль</label>
                    <motion.input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="Мін. 8 символів, 1 велика літера, 1 цифра" />
                    {errors.password && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.password}</p>}
                  </div>
                </div>
                {serverError && <p className="p" style={{ color: 'var(--accent-pink)', textAlign: 'center', marginTop: '12px', fontSize: '11px' }}>{serverError}</p>}
                <motion.button type="submit" className="btn btn-green" disabled={isSubmitting} style={{ width: '100%', marginTop: '24px' }} >
                  {isSubmitting ? 'Реєструємо...' : 'Зареєструватися'}
                </motion.button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', opacity: 0.8, color: 'var(--text-secondary)' }}>
                Вже маєте акаунт? <Link to="/login" style={{ color: 'var(--accent-turquoise)' }}>Увійдіть</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              variants={successVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="center"
              style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '18px', 
                  background: 'var(--accent-green)', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 25px var(--shadow-btn-green), inset 0 0 10px rgba(255, 255, 255, 0.2)' 
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <motion.path
                        d="M5 13L9 17L19 7"
                        stroke="var(--text-on-accent-light)" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </svg>
              </motion.div>
              <h2 className="h2 mono" style={{ color: 'var(--accent-green)', margin: 0, textShadow: '0 0 10px var(--accent-green)' }}>Реєстрація успішна!</h2>
              <p className="p" style={{ margin: 0, opacity: 0.8, color: 'var(--text-secondary)' }}>Зараз ви будете перенаправлені на сторінку входу.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}