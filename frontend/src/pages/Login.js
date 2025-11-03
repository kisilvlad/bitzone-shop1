// src/pages/Login.js
// !!! ОНОВЛЕНО URL-адреси для деплою !!!

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/authSlice';

export default function Login() {
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    setLoginError('');
  };
  
  // Валідація
  const validateForm = () => {
      const newErrors = {};
      if (!formData.phone.trim()) newErrors.phone = "Телефон обов'язковий";
      if (!formData.password) newErrors.password = "Пароль обов'язковий";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };
  
  // --- Логіка handleSubmit (без змін) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Нормалізуємо номер телефону до формату 380...
      const cleaned = formData.phone.replace(/\D/g, '');
      const normalizedPhone = cleaned.startsWith('0') ? `38${cleaned}` : cleaned;

      // !!! ВИПРАВЛЕННЯ URL !!!
      const response = await axios.post('https://bitzone-shop1.onrender.com/api/auth/login', {
        phone: normalizedPhone,
        password: formData.password
      });
      // Зберігаємо токен та дані користувача в Redux
      dispatch(loginSuccess({ token: response.data.token }));
      
      setSuccess(true);
      // Перенаправляємо на головну сторінку через 1.5 секунди
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      const message = err.response?.data?.message || 'Сталася помилка. Спробуйте ще раз.';
      setLoginError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formVariants = { hidden: { opacity: 0, y: 30, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } } };
  const successVariants = { hidden: { scale: 0, opacity: 0, rotate: -180 }, visible: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
  
  return (
    <section className="container">
      <motion.div 
        variants={formVariants} 
        initial="hidden" 
        animate="visible" 
        className="surface center auth-container" 
        style={{ padding: 'clamp(24px, 5vw, 48px)' }} // Додаємо padding
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
        <AnimatePresence>
          {!success ? (
            <div style={{ width: '100%', maxWidth: '400px', zIndex: 1 }}>
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
                🔐 Вхід
              </motion.h1>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Телефон</label>
                    <motion.input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="+380..." />
                    {errors.phone && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: '8px', display: 'block', fontSize: '12px' }}>Пароль</label>
                    <motion.input type="password" name="password" value={formData.password} onChange={handleInputChange} className="input" style={{ width: '100%' }} placeholder="Введіть пароль" />
                    {errors.password && <p className="p" style={{ color: 'var(--accent-pink)', fontSize: '10px', marginTop: '4px' }}>{errors.password}</p>}
                  </div>
                </div>
                {loginError && <p className="p" style={{ color: 'var(--accent-pink)', textAlign: 'center', marginTop: '12px', fontSize: '11px' }}>{loginError}</p>}
                <motion.button type="submit" className="btn btn-green" disabled={isSubmitting} style={{ width: '100%', marginTop: '24px' }} >
                  {isSubmitting ? 'Входимо...' : 'Увійти'}
                </motion.button>
              </form>
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', opacity: 0.8, color: 'var(--text-secondary)' }}>
                Немає акаунту? <Link to="/register" style={{ color: 'var(--accent-turquoise)' }}>Зареєструйтеся</Link>
              </p>
            </div>
          ) : (
            <motion.div variants={successVariants} className="center" style={{ flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ color: 'var(--accent-green)' }}>✅ Успішно!</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Перенаправляємо на головну...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}