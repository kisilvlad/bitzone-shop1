import React, { useState, useCallback } from 'react';
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

export default function Cart() {
  const items = useSelector(selectCartItems);
  const totalQty = useSelector(selectCartQty);
  const total = useSelector(selectCartTotal);
  const dispatch = useDispatch();

  const hasItems = items.length > 0;

  // Checkout state
  const [checkoutStep, setCheckoutStep] = useState(hasItems ? 'cart' : 'empty');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    delivery: 'nova-poshta',
    payment: 'cash-on-delivery'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successGrandTotal, setSuccessGrandTotal] = useState(0); // Зберігаємо grandTotal для success

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Ім'я обов'язкове";
    if (!formData.lastName.trim()) newErrors.lastName = "Прізвище обов'язкове";
    if (!formData.phone.trim()) newErrors.phone = 'Телефон обов\'язковий';
    if (!formData.email.trim()) newErrors.email = 'Email обов\'язковий';
    if (formData.delivery !== 'self-pickup' && !formData.city.trim()) newErrors.city = 'Місто обов\'язкове';
    if (formData.delivery !== 'self-pickup' && !formData.address.trim()) newErrors.address = 'Адреса обов\'язкова';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = async () => {
    if (checkoutStep === 'cart') {
      setCheckoutStep('form');
    } else {
      if (validateForm() && !isSubmitting) {
        setIsSubmitting(true);
        // Зберігаємо grandTotal перед очищенням
        const currentDeliveryCost = deliveryOptions.find(opt => opt.value === formData.delivery)?.cost || 0;
        setSuccessGrandTotal(total + currentDeliveryCost);
        // Simulate API call
        setTimeout(() => {
          window.alert("Замовлення оформлено! Дякуємо, " + formData.firstName + "! Ми зв'яжемося з вами на " + formData.phone + ". (демо)");
          dispatch(clearCart());
          setCheckoutStep('success');
          setIsSubmitting(false);
        }, 1500);
      }
    }
  };

  const deliveryOptions = [
    { value: 'nova-poshta', label: '🚚 Нова Пошта (від 70 грн)', cost: 70 },
    { value: 'ukr-poshta', label: '📬 УкрПошта (від 50 грн)', cost: 50 },
    { value: 'self-pickup', label: '🏪 Самовивіз (Київ, безкоштовно)', cost: 0 }
  ];

  const paymentOptions = [
    { value: 'cash-on-delivery', label: '💰 Накладений платіж' },
    { value: 'card', label: '💳 Карткою онлайн' },
    { value: 'self-pickup', label: '🛒 При самовивозі' }
  ];

  // Calculate delivery cost
  const deliveryCost = deliveryOptions.find(opt => opt.value === formData.delivery)?.cost || 0;
  const grandTotal = total + deliveryCost;

  // Стабілізовані handler'и
  const handleIncrease = useCallback((id, e) => {
    e.stopPropagation();
    dispatch(increaseQty(id));
  }, [dispatch]);

  const handleDecrease = useCallback((id, e) => {
    e.stopPropagation();
    dispatch(decreaseQty(id));
  }, [dispatch]);

  const handleRemove = useCallback((id, e) => {
    e.stopPropagation();
    if (window.confirm('Видалити товар з кошика?')) {
      dispatch(removeFromCart(id));
    }
  }, [dispatch]);

  const handleClear = useCallback(() => {
    if (window.confirm('Очистити весь кошик?')) {
      dispatch(clearCart());
    }
  }, [dispatch]);

  // Анімації
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

  const buttonVariants = {
    hover: { scale: 1.02, boxShadow: '0 0 20px currentColor', y: -2 },
    tap: { scale: 0.98, y: 0 }
  };

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
  };

  if (checkoutStep === 'empty') {
    return (
      <section className="container">
        <motion.div
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          className="surface center"
          style={{ 
            padding: 48, 
            minHeight: '50vh', 
            borderRadius: 'var(--radius)', 
            boxShadow: 'var(--shadow-card), 0 0 30px rgba(255,215,0,0.1)',
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8), rgba(12,12,12,0.8))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(45deg, rgba(255,215,0,0.05), rgba(0,245,255,0.05))', pointerEvents: 'none' }} />
          <motion.div 
            className="mono" 
            style={{ color: 'var(--yellow)', fontSize: 18, marginBottom: 16, textShadow: '0 0 10px var(--yellow)', position: 'relative', zIndex: 1 }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Кошик порожній 😔
          </motion.div>
          <p className="p" style={{ opacity: 0.8, marginBottom: 24, fontSize: 12, position: 'relative', zIndex: 1 }}>Додайте товари з каталогу, щоб почати покупки!</p>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Link to="/products" className="btn btn-green" style={{ padding: '12px 24px', fontSize: 12, position: 'relative', zIndex: 1 }}>
              🛒 Перейти до каталогу
            </Link>
          </motion.div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="container">
      <motion.h1 
        className="h1 retro" 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          marginBottom: 24, 
          background: 'linear-gradient(45deg, var(--yellow), var(--turquoise))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(255,215,0,0.5)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        🛒 Мій кошик ({totalQty} товарів)
      </motion.h1>

      <AnimatePresence mode="wait">
        {checkoutStep === 'cart' && (
          <motion.div
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-2"
            style={{ gap: 24, marginBottom: 24 }}
          >
            {/* Список товарів */}
            <motion.div 
              className="surface shimmer" 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                gridColumn: '1 / span 1', 
                padding: 20, 
                borderRadius: 'var(--radius)', 
                overflow: 'hidden', 
                boxShadow: 'var(--shadow-card), 0 0 20px rgba(255,215,0,0.1)',
                background: 'linear-gradient(180deg, rgba(26,26,26,0.95), rgba(12,12,12,0.95))',
                border: '1px solid rgba(255,215,0,0.1)',
                position: 'relative'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(45deg, rgba(255,215,0,0.05), rgba(0,245,255,0.05))', pointerEvents: 'none' }} />
              <div className="mono" style={{ color: 'var(--yellow)', marginBottom: 16, fontSize: 14, textShadow: '0 0 8px var(--yellow)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                🛒 Товари в кошику
              </div>
              <AnimatePresence>
                {items.map((item, idx) => {
                  // Безпечне обчислення: qty дефолт 1, price Number
                  const qty = Number(item.qty) || 1;
                  const lineTotal = (Number(item.price) || 0) * qty;
                  const lowStock = qty >= 5; // Badge для низького стоку (приклад)

                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(255,215,0,0.2)' }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '80px 1fr 140px',
                        gap: 16,
                        alignItems: 'center',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)',
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
                            background: 'linear-gradient(180deg, var(--pink), var(--pink-2))',
                            color: 'var(--white)',
                            fontSize: 8,
                            padding: '4px 6px'
                          }}
                        >
                          Швидко!
                        </motion.span>
                      )}
                      <div 
                        style={{ 
                          borderRadius: 8, 
                          overflow: 'hidden', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          background: 'linear-gradient(45deg, rgba(255,215,0,0.1), rgba(0,245,255,0.1))'
                        }}
                      >
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: 70, objectFit: 'contain', imageRendering: 'pixelated' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h3 className="h2 mono" style={{ fontSize: 13, margin: 0, color: 'var(--turquoise)', textShadow: '0 0 6px var(--turquoise)' }}>{item.name}</h3>
                        <div className="p" style={{ opacity: 0.9, fontSize: 11, color: 'var(--yellow)' }}>Ціна за одиницю: <strong>{formatPrice(Number(item.price) || 0)}</strong></div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, justifyItems: 'end', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'end', background: 'rgba(255,255,255,0.06)', padding: '6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <motion.button 
                            className="btn-outline" 
                            onClick={(e) => handleDecrease(item.id, e)}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            disabled={qty <= 1}
                            style={{ 
                              width: 28, 
                              height: 28, 
                              padding: 0, 
                              fontSize: 14, 
                              minWidth: 'auto', 
                              borderRadius: '50%', 
                              background: qty <= 1 ? '#666' : 'linear-gradient(180deg, var(--pink), var(--pink-2))', 
                              border: 'none',
                              color: 'var(--white)',
                              boxShadow: qty <= 1 ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 8px rgba(255,0,127,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                              opacity: qty <= 1 ? 0.6 : 1
                            }}
                          >
                            −
                          </motion.button>
                          <motion.div 
                            style={{ 
                              padding: '6px 12px', 
                              borderRadius: 6, 
                              fontWeight: 'bold', 
                              minWidth: 24, 
                              textAlign: 'center', 
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))', 
                              color: 'var(--white)', 
                              border: '1px solid rgba(255,255,255,0.2)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                              fontSize: 12
                            }}
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            {qty}
                          </motion.div>
                          <motion.button 
                            className="btn" 
                            onClick={(e) => handleIncrease(item.id, e)}
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                            style={{ 
                              width: 28, 
                              height: 28, 
                              padding: 0, 
                              fontSize: 14, 
                              minWidth: 'auto', 
                              borderRadius: '50%', 
                              background: 'linear-gradient(180deg, var(--green), var(--green-2))', 
                              border: 'none',
                              color: 'var(--white)',
                              boxShadow: '0 2px 8px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            +
                          </motion.button>
                        </div>
                        <div className="p" style={{ opacity: 1, fontSize: 11, textAlign: 'right', color: 'var(--green)', fontWeight: 'bold', textShadow: '0 0 4px var(--green)' }}>
                          {formatPrice(lineTotal)}
                        </div>
                        <motion.button 
                          className="btn btn-outline delete-btn" 
                          onClick={(e) => handleRemove(item.id, e)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: 10, 
                            width: '100%', 
                            background: 'linear-gradient(180deg, rgba(255,0,127,0.15), rgba(255,0,127,0.05))', 
                            border: '1px solid var(--pink)',
                            borderRadius: '999px', 
                            color: 'var(--pink)', 
                            boxShadow: '0 2px 8px rgba(255,0,127,0.3)',
                            transition: 'all 0.3s ease',
                            fontWeight: 'bold'
                          }}
                        >
                          🗑️ Видалити
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {hasItems && (
                <motion.button
                  className="btn btn-outline"
                  onClick={handleClear}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  style={{ 
                    width: '100%', 
                    marginTop: 12, 
                    padding: '10px 16px', 
                    fontSize: 11, 
                    background: 'rgba(255,0,127,0.1)', 
                    border: '1px solid var(--pink)', 
                    borderRadius: '999px',
                    color: 'var(--pink)',
                    boxShadow: '0 2px 8px rgba(255,0,127,0.2)'
                  }}
                >
                  🧹 Очистити кошик
                </motion.button>
              )}
            </motion.div>

            {/* Підсумок */}
            <motion.aside 
              className="surface shimmer" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ 
                padding: 20, 
                height: 'fit-content', 
                borderRadius: 'var(--radius)', 
                boxShadow: 'var(--shadow-card), 0 0 25px rgba(0,245,255,0.15)',
                background: 'linear-gradient(180deg, rgba(26,26,26,0.95), rgba(12,12,12,0.95))',
                border: '1px solid rgba(0,245,255,0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(45deg, rgba(0,245,255,0.05), rgba(255,215,0,0.05))', pointerEvents: 'none' }} />
              <h2 className="h2 retro" style={{ marginBottom: 16, color: 'var(--turquoise)', fontSize: 15, textShadow: '0 0 8px var(--turquoise)', position: 'relative', zIndex: 1 }}>💎 Підсумок</h2>
              <div style={{ display: 'grid', gap: 12, marginBottom: 20, fontSize: 12, position: 'relative', zIndex: 1 }}>
                <motion.div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, opacity: 0.9 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <span style={{ color: 'var(--yellow)' }}>📦 Кількість товарів</span>
                  <strong style={{ color: 'var(--yellow)' }}>{totalQty}</strong>
                </motion.div>
                <motion.div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, opacity: 0.9 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <span style={{ color: 'var(--turquoise)' }}>🚚 Доставка</span>
                  <strong style={{ color: 'var(--turquoise)' }}>{formatPrice(deliveryCost)}</strong>
                </motion.div>
                <motion.div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold', color: 'var(--green)', textShadow: '0 0 8px var(--green)', paddingTop: 6 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  <span>💰 Загальна сума</span>
                  <span>{formatPrice(grandTotal)}</span>
                </motion.div>
              </div>
              <motion.button
                className="btn btn-green"
                onClick={handleCheckout}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                disabled={isSubmitting}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  fontSize: 12, 
                  background: isSubmitting ? '#666' : 'linear-gradient(180deg, var(--green), var(--green-2))',
                  border: 'none',
                  boxShadow: isSubmitting ? '0 2px 4px rgba(0,0,0,0.2)' : '0 4px 12px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  color: 'var(--white)',
                  fontWeight: 'bold',
                  borderRadius: '999px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Обробка...' : '🛒 Оформити замовлення'}
              </motion.button>
            </motion.aside>
          </motion.div>
        )}

        {/* Форма оформлення */}
        {checkoutStep === 'form' && (
          <motion.div variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <div className="grid grid-2" style={{ gap: 24 }}>
              <div className="surface" style={{ padding: 20, borderRadius: 'var(--radius)' }}>
                <h3 className="h2 mono" style={{ color: 'var(--yellow)', marginBottom: 16 }}>📝 Дані отримувача</h3>
                <input name="firstName" placeholder="Ім'я" value={formData.firstName} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }} />
                {errors.firstName && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.firstName}</p>}
                <input name="lastName" placeholder="Прізвище" value={formData.lastName} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }} />
                {errors.lastName && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.lastName}</p>}
                <input name="phone" placeholder="Телефон (+380...)" value={formData.phone} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }} />
                {errors.phone && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.phone}</p>}
                <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }} />
                {errors.email && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.email}</p>}
              </div>
              <div className="surface" style={{ padding: 20, borderRadius: 'var(--radius)' }}>
                <h3 className="h2 mono" style={{ color: 'var(--turquoise)', marginBottom: 16 }}>📍 Доставка та оплата</h3>
                <select name="delivery" value={formData.delivery} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }}>
                  {deliveryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {formData.delivery !== 'self-pickup' && (
                  <>
                    <input name="city" placeholder="Місто" value={formData.city} onChange={handleInputChange} className="input" style={{ marginBottom: 12, width: '100%' }} />
                    {errors.city && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.city}</p>}
                    <input name="address" placeholder="Адреса (вул., буд., кв.)" value={formData.address} onChange={handleInputChange} className="input" style={{ width: '100%' }} />
                    {errors.address && <p className="p" style={{ color: 'var(--pink)', fontSize: 10, margin: '0 0 12px 0' }}>{errors.address}</p>}
                  </>
                )}
                <h4 className="mono" style={{ color: 'var(--pink)', margin: '12px 0 4px 0', fontSize: 12 }}>💳 Спосіб оплати</h4>
                <select name="payment" value={formData.payment} onChange={handleInputChange} className="input" style={{ width: '100%' }}>
                  {paymentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <motion.button className="btn btn-outline" onClick={() => setCheckoutStep('cart')} variants={buttonVariants} whileHover="hover" whileTap="tap">
                ← Назад до кошика
              </motion.button>
              <motion.button className="btn btn-green" onClick={handleCheckout} variants={buttonVariants} whileHover="hover" whileTap="tap" disabled={isSubmitting}>
                {isSubmitting ? 'Обробка...' : '✅ Підтвердити замовлення'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Успішне оформлення */}
        {checkoutStep === 'success' && (
          <motion.div 
            variants={successVariants} 
            initial="hidden" 
            animate="visible" 
            className="center" 
            style={{ padding: 48, minHeight: '50vh' }}
          >
            <motion.div 
              className="surface" 
              style={{ 
                padding: 40, 
                borderRadius: 'var(--radius)', 
                textAlign: 'center', 
                boxShadow: '0 0 40px rgba(76,175,80,0.3)' 
              }}
              initial={{ scale: 0.9, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <h2 className="h1 retro" style={{ color: 'var(--green)', textShadow: '0 0 20px var(--green)', marginBottom: 16 }}>
                ✅ Замовлення успішно оформлено!
              </h2>
              <p className="p" style={{ opacity: 0.8, marginBottom: 24, fontSize: 12 }}>
                Дякуємо за покупку! Ми зв'яжемося з вами найближчим часом по телефону {formData.phone}.
              </p>
              <div className="p" style={{ color: 'var(--yellow)', fontWeight: 'bold', marginBottom: 24 }}>
                Сума: {formatPrice(successGrandTotal)}
              </div>
              <motion.button 
                className="btn btn-green" 
                onClick={() => setCheckoutStep('cart')} 
                variants={buttonVariants} 
                whileHover="hover" 
                whileTap="tap" 
                style={{ marginTop: 16 }}
              >
                🛒 Продовжити покупки
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}