// src/pages/Cart.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems,
  selectCartQty,
  selectCartTotal,
  increaseQty,
  decreaseQty,
  removeFromCart,
  clearCart
} from '../redux/cartSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Cart() {
  const items = useSelector(selectCartItems);
  const totalQty = useSelector(selectCartQty);
  const total = useSelector(selectCartTotal);
  const dispatch = useDispatch();
  const { token, user } = useSelector(state => state.auth);
  
  const hasItems = items.length > 0;
  const [checkoutStep, setCheckoutStep] = useState(hasItems ? 'cart' : 'empty');
  const [isMobile, setIsMobile] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    delivery: 'nova-poshta',
    payment: 'cash' // мапиться на бекенд у 'cash-on-delivery' | 'card'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successGrandTotal, setSuccessGrandTotal] = useState(0);
  
  const mapPaymentForBackend = (p) => (p === 'cash' ? 'cash-on-delivery' : 'card');
  
  // Адаптив
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  
  // Не скидаємо success на empty після очищення
  useEffect(() => {
    if (checkoutStep === 'success') return;
    if (items.length === 0) setCheckoutStep('empty');
    else if (checkoutStep === 'empty') setCheckoutStep('cart');
  }, [items, checkoutStep]);
  
  // Скрол до верху при успіху
  useEffect(() => {
    if (checkoutStep === 'success') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    }
  }, [checkoutStep]);
  
  // Автозаповнення імені
  useEffect(() => {
    if (user && user.name && checkoutStep === 'form') {
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
      }));
    }
  }, [user, checkoutStep]);

  // Якщо самовивіз — знімаємо вимоги адреси
  useEffect(() => {
    if (formData.delivery === 'self-pickup') {
      setErrors(prev => ({ ...prev, city: '', address: '' }));
    }
  }, [formData.delivery]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };
  
  const validateForm = () => {
    const newErrors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneDigits = formData.phone.replace(/\D/g, '');

    if (!formData.firstName.trim()) newErrors.firstName = "Ім'я обов'язкове";
    if (!formData.lastName.trim()) newErrors.lastName = "Прізвище обов'язкове";
    if (!formData.phone.trim()) newErrors.phone = 'Телефон обовʼязковий';
    else if (!(phoneDigits.length >= 10 && phoneDigits.length <= 13)) newErrors.phone = 'Невірний формат телефону';
    if (!formData.email.trim()) newErrors.email = 'Email обовʼязковий';
    else if (!emailRe.test(formData.email)) newErrors.email = 'Невалідний email';
    if (formData.delivery !== 'self-pickup') {
      if (!formData.city.trim()) newErrors.city = 'Місто обовʼязкове';
      if (!formData.address.trim()) newErrors.address = 'Адреса обовʼязкова';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const normalizePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('380')) return cleaned;
    if (cleaned.startsWith('0')) return `38${cleaned}`;
    return cleaned;
  };

  const handleCheckout = async () => {
    if (checkoutStep === 'cart') {
      setCheckoutStep('form');
      return;
    }
    if (validateForm() && !isSubmitting) {
      setIsSubmitting(true);
      const normalizedFormData = {
        ...formData,
        phone: normalizePhoneNumber(formData.phone),
        payment: mapPaymentForBackend(formData.payment)
      };
      setSuccessGrandTotal(total); // без доставки

      const orderPayload = {
        customerData: normalizedFormData,
        cartItems: items
      };
      
      try {
        const config = { headers: {} };
        if (token) config.headers.Authorization = `Bearer ${token}`;
        await axios.post('/api/orders', orderPayload, config);

        setCheckoutStep('success');
        dispatch(clearCart());
      } catch (err) {
        console.error('Помилка при створенні замовлення:', err);
        const errorMessage = err.response?.data?.message || 'Не вдалося оформити замовлення. Спробуйте ще раз або звʼяжіться з нами.';
        alert(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  // ---- Варіанти доставки з іконками з public/assets/icons ----
  const deliveryOptions = [
    { value: 'nova-poshta', label: 'Нова пошта', icon: '/assets/icons/nova-poshta.svg' },
    { value: 'ukr-poshta',  label: 'Укрпошта',  icon: '/assets/icons/ukrposhta.png'  },
    { value: 'meest',       label: 'Meest',      icon: '/assets/icons/meest.svg'      },
    { value: 'self-pickup', label: 'Самовивіз (Київ)', emoji: '🏪' } // без svg — емодзі
  ];
  const paymentOptions = [
    { value: 'cash', label: 'Готівка', emoji: '💵' },
    { value: 'card', label: 'Оплата online', emoji: '💳' },
  ];
  
  const handleIncrease = useCallback((id, e) => { e.stopPropagation(); dispatch(increaseQty(id)); }, [dispatch]);
  const handleDecrease = useCallback((id, e) => { e.stopPropagation(); dispatch(decreaseQty(id)); }, [dispatch]);
  const handleRemove = useCallback((id, e) => {
    e.stopPropagation();
    if (window.confirm('Видалити товар з кошика?')) dispatch(removeFromCart(id));
  }, [dispatch]);
  
  const handleClear = useCallback(() => {
    if (window.confirm('Очистити весь кошик?')) dispatch(clearCart());
  }, [dispatch]);
  
  const itemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }
  };
  const stepVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } }
  };
  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
  };
  
  // ——— СТОРІНКА: ПОРОЖНІЙ КОШИК (ОНОВЛЕНО) ———
  if (checkoutStep === 'empty') {
    return (
      <section className="container" style={{ paddingBottom: isMobile ? 72 : 0 }}>
        <motion.div 
          variants={stepVariants} 
          initial="hidden" 
          animate="visible" 
          className="surface" // <-- ЗМІНЕНО: .surface
          style={glassPanel({ p: 32, center: true })} // .surface + glassPanel helpers
        >
          <div style={glassGradientOverlay()} />
          <motion.div 
            className="mono" 
            style={{ 
              color: 'var(--accent-yellow)', // <-- ЗМІНЕНО
              fontSize: 18, 
              marginBottom: 16, 
              textShadow: '0 0 10px var(--accent-yellow)', // <-- ЗМІНЕНО
              position: 'relative', 
              zIndex: 1 
            }} 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Кошик порожній 😔
          </motion.div>
          <p className="p" style={{ opacity: 0.8, marginBottom: 24, fontSize: 12, position: 'relative', zIndex: 1, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
            Додайте товари з каталогу, щоб почати покупки!
          </p>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.35, duration: 0.3 }}>
            <Link to="/products" className="btn btn-green" style={{ padding: '12px 24px', fontSize: 12, position: 'relative', zIndex: 1 }}>
              🛒 Перейти до каталогу
            </Link>
          </motion.div>
        </motion.div>
      </section>
    );
  }

  // ——— СТОРІНКА: ОСНОВНИЙ КОШИК (ОНОВЛЕНО) ———
  return (
    <>
      <section className="container" style={{ paddingBottom: isMobile && checkoutStep === 'cart' ? 84 : 0 }}>
        <motion.h1 
          className="h1 retro" 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{
            marginBottom: 24,
            background: 'linear-gradient(45deg, var(--accent-yellow), var(--accent-turquoise))', // <-- ЗМІНЕНО
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255,215,0,0.5)', // TODO: theme
            textAlign: 'center'
          }}
        >
          🛒 Мій кошик ({totalQty} товарів)
        </motion.h1>

        <AnimatePresence mode="wait">
          {/* ——— КРОК 1: КОШИК (ОНОВЛЕНО) ——— */}
          {checkoutStep === 'cart' && (
            <motion.div 
              variants={stepVariants} 
              initial="hidden" 
              animate="visible" 
              exit="exit" 
              className="grid grid-2" 
              style={{ gap: 24, marginBottom: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 360px' }}
            >
              <motion.div 
                className="surface shimmer" // <-- ЗМІНЕНО: .surface
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                style={glassPanel({ p: 16 })} // .surface + glassPanel helpers
              >
                <div style={glassGradientOverlay()} />
                <div className="mono" style={{ color: 'var(--accent-yellow)', marginBottom: 16, fontSize: 14, textShadow: '0 0 8px var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                  🛒 Товари в кошику
                </div>

                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const qty = Number(item.qty) || 1;
                    const price = Number(item.price) || 0;
                    const lineTotal = price * qty;
                    const lowStock = qty >= 5;
                    const imgSrc = item.image || (Array.isArray(item.images) ? item.images[0] : '') || '/assets/placeholder.png';
                    
                    return (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        whileHover={{ y: -2, boxShadow: 'var(--shadow-card-hover)' }} // <-- ЗМІНЕНО
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '72px 1fr' : '96px 1fr 160px',
                          gap: 12,
                          alignItems: 'center',
                          padding: '14px',
                          border: '1px solid var(--border-primary)', // <-- ЗМІНЕНО
                          borderRadius: 14,
                          background: 'var(--surface-input)', // <-- ЗМІНЕНО
                          backdropFilter: 'blur(6px)',
                          '[data-theme="light"] &': { backdropFilter: 'none' },
                          marginBottom: 12,
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {lowStock && (
                          <motion.span
                            className="badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'linear-gradient(180deg, var(--accent-pink), var(--accent-pink-dark))', // <-- ЗМІНЕНО
                              color: 'var(--text-on-accent-light)', // <-- ЗМІНЕНО
                              fontSize: 10,
                              padding: '4px 7px',
                              borderRadius: 999
                            }}
                          >
                            Швидко!
                          </motion.span>
                        )}

                        <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 14px rgba(0,0,0,0.35)', background: 'var(--surface-gradient)' }}> {/* <-- ЗМІНЕНО */}
                          <img src={imgSrc} alt={item.name} style={{ width: '100%', height: isMobile ? 64 : 84, objectFit: 'contain' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                          <h3 className="h2 mono" style={{ fontSize: 13, margin: 0, color: 'var(--accent-turquoise)', textShadow: '0 0 6px var(--accent-turquoise)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </h3>
                          <div className="p" style={{ opacity: 0.9, fontSize: 11, color: 'var(--accent-yellow)' }}>
                            Ціна: <strong>{formatPrice(price)}</strong>
                          </div>

                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <QtyControl qty={qty} onDec={(e) => handleDecrease(item.id, e)} onInc={(e) => handleIncrease(item.id, e)} />
                              <div className="p" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent-green)', fontWeight: 'bold', textShadow: '0 0 4px var(--accent-green)' }}>
                                {formatPrice(lineTotal)}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isMobile && (
                          <div style={{ display: 'grid', gap: 8, justifyItems: 'end', alignItems: 'center' }}>
                            <QtyControl qty={qty} onDec={(e) => handleDecrease(item.id, e)} onInc={(e) => handleIncrease(item.id, e)} wide />
                            <div className="p" style={{ opacity: 1, fontSize: 12, textAlign: 'right', color: 'var(--accent-green)', fontWeight: 'bold', textShadow: '0 0 4px var(--accent-green)' }}>
                              {formatPrice(lineTotal)}
                            </div>
                            <motion.button className="btn btn-outline delete-btn" onClick={(e) => handleRemove(item.id, e)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={dangerPill()}>
                              🗑️ Видалити
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {hasItems && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                    <button className="btn btn-outline" onClick={handleClear} style={dangerPill({ full: isMobile })}>
                      🧹 Очистити кошик
                    </button>
                    <Link to="/products" className="btn" style={ghostPill()}>← Продовжити покупки</Link>
                  </div>
                )}
              </motion.div>

              <motion.aside 
                className="surface shimmer" // <-- ЗМІНЕНО: .surface
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                style={glassPanel({ p: 16 })} // .surface + glassPanel helpers
              >
                <div style={glassGradientOverlay(true)} />
                <h2 className="h2 retro" style={{ marginBottom: 16, color: 'var(--accent-turquoise)', fontSize: 15, textShadow: '0 0 8px var(--accent-turquoise)', position: 'relative', zIndex: 1 }}>💎 Підсумок</h2>
                <div style={{ display: 'grid', gap: 12, marginBottom: 20, fontSize: 12, position: 'relative', zIndex: 1 }}>
                  <RowLine label="📦 Кількість товарів" value={totalQty} color="var(--accent-yellow)" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', color: 'var(--accent-green)', textShadow: '0 0 8px var(--accent-green)', paddingTop: 6 }}>
                    <span>💰 Загальна сума</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <button className="btn btn-green" onClick={handleCheckout} disabled={isSubmitting} style={primaryCta({ full: true, disabled: isSubmitting })}>
                  {isSubmitting ? 'Обробка...' : '🛒 Оформити замовлення'}
                </button>
              </motion.aside>
            </motion.div>
          )}

          {/* ——— КРОК 2: ФОРМА (ОНОВЛЕНО) ——— */}
          {checkoutStep === 'form' && (
            <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit" style={{ marginBottom: 24 }}>
              <div className="grid grid-2" style={{ gap: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                <div className="surface" style={glassPanel({ p: 16 })}>
                  <h3 className="h2 mono" style={{ color: 'var(--accent-yellow)', marginBottom: 16 }}>📝 Дані отримувача</h3>
                  <FormInput name="firstName" placeholder="Ім'я"  value={formData.firstName} onChange={handleInputChange} error={errors.firstName} />
                  <FormInput name="lastName"  placeholder="Прізвище" value={formData.lastName}  onChange={handleInputChange} error={errors.lastName} />
                  <FormInput name="phone"     placeholder="Телефон (+380...)" value={formData.phone} onChange={handleInputChange} error={errors.phone} />
                  <FormInput name="email"     placeholder="Email" type="email" value={formData.email} onChange={handleInputChange} error={errors.email} />
                </div>

                <div className="surface" style={glassPanel({ p: 16 })}>
                  <h3 className="h2 mono" style={{ color: 'var(--accent-turquoise)', marginBottom: 16 }}>📍 Доставка та оплата</h3>

                  {/* ВІДКРИТІ ПЛИТКИ — Delivery з іконками */}
                  <OptionTiles
                    label="Спосіб доставки"
                    name="delivery"
                    value={formData.delivery}
                    onChange={(val) => setFormData(prev => ({ ...prev, delivery: val }))}
                    options={deliveryOptions}
                    columns={isMobile ? 1 : 2}
                  />

                  {formData.delivery !== 'self-pickup' && (
                    <>
                      <FormInput name="city" placeholder="Місто" value={formData.city} onChange={handleInputChange} error={errors.city} />
                      <FormInput name="address" placeholder="Адреса (вул., буд., кв.)" value={formData.address} onChange={handleInputChange} error={errors.address} />
                    </>
                  )}

                  {/* ВІДКРИТІ ПЛИТКИ — Payment */}
                  <OptionTiles
                    label="Оплата"
                    name="payment"
                    value={formData.payment}
                    onChange={(val) => setFormData(prev => ({ ...prev, payment: val }))}
                    options={paymentOptions}
                    columns={isMobile ? 1 : 2}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setCheckoutStep('cart')} style={ghostPill()}>
                  ← Назад до кошика
                </button>
                <button className="btn btn-green" onClick={handleCheckout} disabled={isSubmitting} style={primaryCta()}>
                  {isSubmitting ? 'Обробка...' : '✅ Підтвердити замовлення'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ——— КРОК 3: УСПІХ (ОНОВЛЕНО) ——— */}
          {checkoutStep === 'success' && (
            <motion.div variants={successVariants} initial="hidden" animate="visible" className="center" style={{ padding: 48, minHeight: '50vh' }} aria-live="polite">
              <motion.div 
                className="surface" // <-- ЗМІНЕНО: .surface
                style={{
                  padding: 40,
                  borderRadius: 'var(--radius)',
                  textAlign: 'center',
                  boxShadow: '0 0 40px var(--shadow-btn-green)', // <-- ЗМІНЕНО
                  background: 'var(--surface-gradient)', // <-- ЗМІНЕНО
                  backdropFilter: 'blur(10px)',
                  '[data-theme="light"] &': { backdropFilter: 'none' },
                  border: '1px solid var(--border-primary)' // <-- ЗМІНЕНО
                }} 
                initial={{ scale: 0.9, rotate: -5 }} 
                animate={{ scale: 1, rotate: 0 }} 
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <h2 className="h1 retro" style={{ color: 'var(--accent-green)', textShadow: '0 0 20px var(--accent-green)', marginBottom: 16 }}>
                  ✅ Замовлення успішно оформлено!
                </h2>
                <p className="p" style={{ opacity: 0.85, marginBottom: 24, fontSize: 12, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
                  Дякуємо за покупку!
                  Ми зв'яжемося з вами найближчим часом по телефону {formData.phone}.
                </p>
                <div className="p" style={{ color: 'var(--accent-yellow)', fontWeight: 'bold', marginBottom: 24 }}>
                  Сума: {formatPrice(successGrandTotal)}
                </div>
                <button className="btn btn-green" onClick={() => (window.location.href = '/products')} style={{ marginTop: 16 }}>
                  🛒 Продовжити покупки
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ——— МОБІЛЬНИЙ ФУТЕР (ОНОВЛЕНО) ——— */}
      {isMobile && checkoutStep === 'cart' && hasItems && (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: `calc(12px + env(safe-area-inset-bottom, 0))`, zIndex: 40 }}>
          <div 
            className="surface" // <-- ЗМІНЕНО: .surface
            style={{
              display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
              padding: 12, borderRadius: 14,
              background: 'var(--surface-header-bg)', // <-- ЗМІНЕНО
              border: '1px solid var(--border-input)', // <-- ЗМІНЕНО
              backdropFilter: 'blur(10px)',
              '[data-theme="light"] &': { backdropFilter: 'none' },
              boxShadow: 'var(--shadow-card-hover)' // <-- ЗМІНЕНО
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className="mono" style={{ fontSize: 11, opacity: .9, color: 'var(--text-secondary)' }}>Загальна сума</span> {/* <-- ЗМІНЕНО */}
              <strong style={{ color: 'var(--accent-green)', fontSize: 14 }}>{formatPrice(total)}</strong>
            </div>
            <button className="btn btn-green" onClick={handleCheckout} disabled={isSubmitting} style={primaryCta({ compact: true })}>
              {isSubmitting ? '...' : 'Оформити'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==================================================================== */
/* ====================== ВІДКРИТІ ПЛИТКИ-ВИБІР (ОНОВЛЕНО) ====================== */
/* ==================================================================== */

function OptionTiles({ label, name, value, onChange, options, columns = 2 }) {
  const groupRef = useRef(null);
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const el = document.activeElement;
      if (el && el.dataset && el.dataset.val) {
        onChange(el.dataset.val);
        e.preventDefault();
      }
    }
  };

  const iconStyle = {
    width: 18,
    height: 18,
    objectFit: 'contain',
    flexShrink: 0,
    display: 'block'
  };
  
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div className="mono" style={{ fontSize: 11, opacity: .85, marginBottom: 8, color: 'var(--text-secondary)' }}>{label}</div>} {/* <-- ЗМІНЕНО */}

      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 10
        }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-val={opt.value}
              onClick={() => onChange(opt.value)}
              tabIndex={active ? 0 : -1}
              style={tileBtn(active)} // Використовуємо хелпер
            >
              {/* Іконка SVG або емодзі */}
              {opt.icon ? (
                <img src={opt.icon} alt="" aria-hidden="true" style={iconStyle} />
              ) : opt.emoji ? (
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>{opt.emoji}</span>
              ) : null}

              {/* Текст */}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {opt.label}
              </span>

              {/* Чекмарка при активі */}
              {active && <span aria-hidden style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/* ====================== ДОПОМІЖНІ КОМПОНЕНТИ (ОНОВЛЕНО) ====================== */
/* ================================================================== */

function QtyControl({ qty, onDec, onInc, wide }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'end',
      background: 'var(--surface-input)', // <-- ЗМІНЕНО
      padding: '6px', borderRadius: 10, border: '1px solid var(--border-input)' // <-- ЗМІНЕНО
    }}>
      <button onClick={onDec} disabled={qty <= 1} aria-label="Зменшити кількість" style={circleBtn(qty <= 1 ? 'disabledMinus' : 'minus', wide)}>−</button>
      <div style={{
        padding: '6px 12px', borderRadius: 8, fontWeight: 'bold', minWidth: 28, textAlign: 'center',
        background: 'var(--surface-gradient)', // <-- ЗМІНЕНО
        color: 'var(--text-primary)', // <-- ЗМІНЕНО
        border: '1px solid var(--border-input)', // <-- ЗМІНЕНО
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        fontSize: 12
      }} aria-live="polite">
        {qty}
      </div>
      <button onClick={onInc} aria-label="Збільшити кількість" style={circleBtn('plus', wide)}>+</button>
    </div>
  );
}

function RowLine({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: 6, opacity: 0.92 }}> {/* <-- ЗМІНЕНО */}
      <span style={{ color }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function FormInput({ name, placeholder, value, onChange, error, type = 'text' }) {
  const id = `field-${name}`;
  const errId = `${id}-err`;
  return (
    <>
      {/* --- ЗМІНЕНО: Використовуємо .input з index.css --- */}
      <input 
        id={id} 
        name={name} 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
        aria-invalid={!!error} 
        aria-describedby={error ? errId : undefined} 
        className="input" 
        style={{ marginBottom: 12 }} 
      />
      {error && <p id={errId} className="p" style={{ color: 'var(--accent-pink)', fontSize: 10, margin: '6px 0 12px 0' }}>{error}</p>} {/* <-- ЗМІНЕНО */}
    </>
  );
}

/* ================================================================ */
/* ====================== СТИЛЬ-ХЕЛПЕРИ (ОНОВЛЕНО) ====================== */
/* ================================================================ */

function tileBtn(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    width: '100%',
    borderRadius: 12,
    background: active
      ? 'var(--surface-gradient)' 
      : 'var(--surface-input)', // <-- ЗМІНЕНО
    border: active ? '1px solid var(--accent-turquoise)' : '1px solid var(--border-input)', // <-- ЗМІНЕНО
    color: active ? 'var(--accent-turquoise)' : 'var(--text-secondary)', // <-- ЗМІНЕНО
    backdropFilter: 'blur(10px)',
    '[data-theme="light"] &': { backdropFilter: 'none' },
    boxShadow: active
      ? '0 10px 28px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,0.08)' // <-- ЗМІНЕНО
      : '0 6px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)', // <-- ЗМІНЕНО
    cursor: 'pointer',
    transition: 'all .2s ease',
    textAlign: 'left',
    outline: 'none'
  };
}

function circleBtn(kind = 'plus', wide = false) {
  const base = {
    width: wide ? 30 : 28, height: wide ? 30 : 28, padding: 0, fontSize: 14, minWidth: 'auto', borderRadius: '50%',
    border: 'none', color: 'var(--text-on-accent-light)', // <-- ЗМІНЕНО
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'transform .12s ease'
  };
  if (kind === 'minus') {
    return { ...base,
      background: 'linear-gradient(180deg, var(--accent-pink), var(--accent-pink-dark))', // <-- ЗМІНЕНО
      boxShadow: '0 2px 8px var(--shadow-btn-pink), inset 0 1px 0 rgba(255,255,255,0.1)' // <-- ЗМІНЕНО
    };
  }
  if (kind === 'disabledMinus') {
    return { ...base, background: '#666', cursor: 'not-allowed', opacity: .6, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }; // <-- ЗМІНЕНО
  }
  return { ...base,
    background: 'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))', // <-- ЗМІНЕНО
    boxShadow: '0 2px 8px var(--shadow-btn-green), inset 0 1px 0 rgba(255,255,255,0.12)' // <-- ЗМІНЕНО
  };
}

// .surface + glassPanel helpers
function glassPanel({ p = 20, center = false } = {}) {
  return {
    padding: p,
    boxShadow: 'var(--shadow-card-hover), inset 0 1px 0 rgba(255,255,255,.06)', // <-- ЗМІНЕНО
    '[data-theme="light"] &': { 
      boxShadow: 'var(--shadow-card-hover), inset 0 1px 0 rgba(0,0,0,.04)',
      backdropFilter: 'none' 
    },
    border: '1px solid var(--border-primary)', // <-- ЗМІНЕНО
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden',
    ...(center ? { display: 'grid', placeItems: 'center', textAlign: 'center' } : {})
  };
}

function glassGradientOverlay(reverse = false) {
  const gradient = reverse
    ? 'linear-gradient(45deg, rgba(0,245,255,0.06), rgba(255,215,0,0.06))'
    : 'linear-gradient(45deg, rgba(255,215,0,0.06), rgba(0,245,255,0.06))';
  
  return {
    position: 'absolute',
    inset: 0,
    background: gradient,
    pointerEvents: 'none',
    '[data-theme="light"] &': { opacity: 0.5 } // Робимо градієнт ледь помітним на світлому
  };
}

function primaryCta({ full = false, compact = false, disabled = false } = {}) {
  return {
    width: full ? '100%' : 'auto',
    padding: compact ? '10px 16px' : '12px',
    fontSize: compact ? 12 : 13,
    background: disabled ? '#666' : 'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))', // <-- ЗМІНЕНО
    border: 'none',
    boxShadow: disabled
      ? '0 2px 4px rgba(0,0,0,0.2)'
      : '0 6px 14px var(--shadow-btn-green), inset 0 1px 0 rgba(255,255,255,0.2)', // <-- ЗМІНЕНО
    color: 'var(--text-on-accent-light)', // <-- ЗМІНЕНО
    fontWeight: 'bold',
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1
  };
}

function dangerPill({ full = false } = {}) {
  return {
    width: full ? '100%' : 'auto',
    padding: '9px 14px',
    fontSize: 11,
    background: 'linear-gradient(180deg, rgba(255,0,127,0.14), rgba(255,0,127,0.06))', // TODO: theme
    border: '1px solid var(--accent-pink)', // <-- ЗМІНЕНО
    borderRadius: 999,
    color: 'var(--accent-pink)', // <-- ЗМІНЕНО
    boxShadow: '0 2px 8px var(--shadow-btn-pink)', // <-- ЗМІНЕНО
    fontWeight: 'bold'
  };
}

function ghostPill() {
  return {
    padding: '9px 14px',
    fontSize: 11,
    borderRadius: 999,
    background: 'var(--surface-input)', // <-- ЗМІНЕНО
    border: '1px solid var(--border-input)', // <-- ЗМІНЕНО
    color: 'var(--text-primary)', // <-- ЗМІНЕНО
    textDecoration: 'none'
  };
}

// Функція inputGlass() видалена, оскільки ми тепер використовуємо .input