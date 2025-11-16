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
    payment: 'cash'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successGrandTotal, setSuccessGrandTotal] = useState(0);
  const [orderNumber, setOrderNumber] = useState(null);

  // Nova Poshta state
  const [npCities, setNpCities] = useState([]);
  const [npCitiesLoading, setNpCitiesLoading] = useState(false);

  const [npWarehouses, setNpWarehouses] = useState([]);
  const [npWarehousesLoading, setNpWarehousesLoading] = useState(false);

  const [selectedNpCity, setSelectedNpCity] = useState(null);
  const [selectedNpWarehouse, setSelectedNpWarehouse] = useState(null);

  const mapPaymentForBackend = (p) => (p === 'cash' ? 'cash-on-delivery' : 'card');

  // Adaptive
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

  // Scroll to top on success
  useEffect(() => {
    if (checkoutStep === 'success') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    }
  }, [checkoutStep]);

  // Autofill name from user
  useEffect(() => {
    if (user && user.name && checkoutStep === 'form') {
      const parts = user.name.split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName
      }));
    }
  }, [user, checkoutStep]);

  // If self-pickup — relax address validation
  useEffect(() => {
    if (formData.delivery === 'self-pickup') {
      setErrors(prev => ({ ...prev, city: '', address: '' }));
    }
  }, [formData.delivery]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
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

  // Nova Poshta: cities
  const fetchNpCities = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setNpCities([]);
      return;
    }
    try {
      setNpCitiesLoading(true);
      const { data } = await axios.get('/api/novapost/cities', {
        params: { search: query.trim() }
      });
      setNpCities(data || []);
    } catch (err) {
      console.error('NovaPoshta: помилка завантаження міст', err);
    } finally {
      setNpCitiesLoading(false);
    }
  }, []);

  // Nova Poshta: warehouses
  const fetchNpWarehouses = useCallback(async (cityRef) => {
    if (!cityRef) {
      setNpWarehouses([]);
      return;
    }
    try {
      setNpWarehousesLoading(true);
      const { data } = await axios.get(`/api/novapost/warehouses/${cityRef}`);
      setNpWarehouses(data || []);
    } catch (err) {
      console.error('NovaPoshta: помилка завантаження відділень', err);
    } finally {
      setNpWarehousesLoading(false);
    }
  }, []);

  // Reset NP data on delivery change
  useEffect(() => {
    if (formData.delivery !== 'nova-poshta') {
      setSelectedNpCity(null);
      setSelectedNpWarehouse(null);
      setNpCities([]);
      setNpWarehouses([]);
    }
  }, [formData.delivery]);

const handleCheckout = async () => {
  if (checkoutStep === 'cart') {
    setCheckoutStep('form');
    return;
  }

  if (!validateForm() || isSubmitting) return;

  setIsSubmitting(true);

  const normalizedFormData = {
    ...formData,
    phone: normalizePhoneNumber(formData.phone),
    payment: mapPaymentForBackend(formData.payment),
  };

  // Збережемо суму для екрана успіху
  setSuccessGrandTotal(total);

  // Підготуємо дані для бекенду (створення замовлення + ROAPP)
  const orderPayload = {
    customerData: normalizedFormData,
    cartItems: cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      image: item.image,
    })),
  };

  try {
    const config = { headers: {} };
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // 1) Створюємо замовлення (з ROAPP інтеграцією) як і раніше
    const res = await axios.post('/api/orders', orderPayload, config);

    const backendOrderNumber =
      res?.data?.orderNumber ||
      res?.data?.number ||
      res?.data?.id ||
      null;

    const backendOrderId =
      res?.data?.orderId ||
      res?.data?.id ||
      backendOrderNumber;

    setOrderNumber(backendOrderNumber);

    // 2) Якщо обрано онлайн-оплату — створюємо інвойс Monobank
    if (normalizedFormData.payment === 'card') {
      try {
        const payRes = await axios.post(
          '/api/payments/monobank/invoice',
          {
            orderId: backendOrderId,
            // Monobank очікує суму в копійках
            amount: Math.round(total * 100),
          },
          config
        );

        const payUrl =
          payRes?.data?.pageUrl ||
          payRes?.data?.payUrl ||
          payRes?.data?.url;

        if (payUrl) {
          // Перенаправляємо користувача на сторінку оплати Monobank
          window.location.href = payUrl;
          return; // далі не показуємо локальний success-екран
        }
      } catch (payErr) {
        console.error('Помилка створення платежу в Monobank:', payErr);
        alert(
          'Замовлення створене, але не вдалося створити онлайн-оплату. ' +
            'Ви можете оплатити при отриманні або звернутися до нас.'
        );
      }
    }

    // 3) Звичайний сценарій (оплата при отриманні або fallback)
    dispatch(clearCart());
    setCheckoutStep('success');
  } catch (err) {
    console.error('Помилка при створенні замовлення:', err);
    const errorMessage =
      err.response?.data?.message ||
      'Не вдалося оформити замовлення. Спробуйте ще раз або звʼяжіться з нами.';
    alert(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleSuccessConfirm = () => {
    setCheckoutStep('empty');
    setOrderNumber(null);
  };

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
    if (window.confirm('Видалити товар з кошика?')) dispatch(removeFromCart(id));
  }, [dispatch]);

  const handleClear = useCallback(() => {
    if (window.confirm('Очистити весь кошик?')) {
      dispatch(clearCart());
      setCheckoutStep('empty');
    }
  }, [dispatch]);

  const itemVariants = {
    hidden: { opacity: 0, x: -20, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
    exit: { opacity: 0, y: -30, scale: 0.96, transition: { duration: 0.3 } }
  };

  const successVariants = {
    hidden: { scale: 0.9, opacity: 0, y: 10 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  const deliveryOptions = [
    { value: 'nova-poshta', label: 'Нова пошта', icon: '/assets/icons/nova-poshta.svg' },
    { value: 'ukr-poshta', label: 'Укрпошта', icon: '/assets/icons/ukrposhta.png' },
    { value: 'meest', label: 'Meest', icon: '/assets/icons/meest.svg' },
    { value: 'self-pickup', label: 'Самовивіз (Київ)', emoji: '🏪' }
  ];

  const paymentOptions = [
    { value: 'cash', label: 'Готівка при отриманні', emoji: '💵' },
    { value: 'card', label: 'Оплата online', emoji: '💳' }
  ];

  // ---------- PRIORITY: SUCCESS ----------
  if (checkoutStep === 'success') {
    return (
      <section className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}>
        <motion.div
          variants={successVariants}
          initial="hidden"
          animate="visible"
          className="surface"
          style={glassPanel({ p: isMobile ? 24 : 32, center: true })}
          aria-live="polite"
        >
          <div style={glassGradientOverlay()} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 480 }}>
            <h2
              className="h1 retro"
              style={{
                color: 'var(--text-primary)',
                marginBottom: 12,
                fontSize: isMobile ? 20 : 22,
                textAlign: 'center'
              }}
            >
              Замовлення створено 🎉
            </h2>
            <p
              className="p"
              style={{
                opacity: 0.9,
                marginBottom: 10,
                fontSize: 13,
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              Дякуємо за покупку в BitZone.
            </p>
            <p
              className="p"
              style={{
                opacity: 0.95,
                marginBottom: 18,
                fontSize: 12,
                color: 'var(--text-primary)',
                textAlign: 'center'
              }}
            >
              {orderNumber ? (
                <>
                  За номером <strong>#{orderNumber}</strong> прийнято успішно. Очікуйте звʼязку з менеджером.
                </>
              ) : (
                <>Ваше замовлення прийнято успішно. Очікуйте звʼязку з менеджером.</>
              )}
            </p>
            <p
              className="p"
              style={{
                opacity: 0.7,
                marginBottom: 24,
                fontSize: 11,
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}
            >
              Ми звʼяжемося з вами по телефону {formData.phone}.
            </p>
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-green"
                onClick={handleSuccessConfirm}
                style={primaryCta({ full: isMobile })}
              >
                Гаразд
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    );
  }

  // ---------- EMPTY CART ----------
  if (!hasItems && checkoutStep === 'empty') {
    return (
      <section className="container" style={{ paddingBottom: isMobile ? 72 : 0 }}>
        <motion.div
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          className="surface"
          style={glassPanel({ p: 32, center: true })}
        >
          <div style={glassGradientOverlay()} />
          <motion.div
            className="mono"
            style={{
              color: 'var(--text-primary)',
              fontSize: 18,
              marginBottom: 16,
              position: 'relative',
              zIndex: 1
            }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Кошик порожній
          </motion.div>
          <p
            className="p"
            style={{
              opacity: 0.8,
              marginBottom: 24,
              fontSize: 12,
              position: 'relative',
              zIndex: 1,
              color: 'var(--text-secondary)'
            }}
          >
            Додайте товари з каталогу, щоб почати покупки.
          </p>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.3 }}
          >
            <Link
              to="/products"
              className="btn btn-green"
              style={{ padding: '12px 24px', fontSize: 12, position: 'relative', zIndex: 1 }}
            >
              Перейти до каталогу
            </Link>
          </motion.div>
        </motion.div>
      </section>
    );
  }

  // ---------- MAIN CART / FORM ----------
  return (
    <>
      <section className="container" style={{ paddingBottom: isMobile && checkoutStep === 'cart' ? 84 : 0 }}>
        <motion.h1
          className="h1 retro"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 24,
            color: 'var(--text-primary)',
            textAlign: 'center',
            fontWeight: 700
          }}
        >
          Мій кошик ({totalQty} товарів)
        </motion.h1>

        <AnimatePresence mode="wait">
          {checkoutStep === 'cart' && (
            <motion.div
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid grid-2"
              style={{
                gap: 24,
                marginBottom: 24,
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 360px'
              }}
            >
              <motion.div
                className="surface"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={glassPanel({ p: 16 })}
              >
                <div style={glassGradientOverlay()} />
                <div
                  className="mono"
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: 16,
                    fontSize: 14,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  Товари в кошику
                </div>

                <AnimatePresence initial={false}>
                  {items.map(item => {
                    const qty = Number(item.qty) || 1;
                    const price = Number(item.price) || 0;
                    const lineTotal = price * qty;
                    const lowStock = qty >= 5;
                    const imgSrc =
                      item.image || (Array.isArray(item.images) ? item.images[0] : '') || '/assets/placeholder.png';

                    return (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        whileHover={{ y: -1 }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? '72px 1fr' : '96px 1fr 160px',
                          gap: 12,
                          alignItems: 'center',
                          padding: '14px',
                          border: '1px solid var(--border-primary)',
                          borderRadius: 18,
                          background: 'var(--surface-input)',
                          backdropFilter: 'blur(16px)',
                          marginBottom: 12,
                          transition: 'all 0.25s ease',
                          position: 'relative'
                        }}
                      >
                        {lowStock && (
                          <span
                            className="badge"
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: 'rgba(255,149,0,0.10)',
                              color: 'var(--text-primary)',
                              fontSize: 10,
                              padding: '4px 7px',
                              borderRadius: 999,
                              border: '1px solid rgba(255,149,0,0.4)'
                            }}
                          >
                            Обмежена кількість
                          </span>
                        )}

                        <div
                          style={{
                            borderRadius: 14,
                            overflow: 'hidden',
                            background: 'var(--surface-gradient)'
                          }}
                        >
                          <img
                            src={imgSrc}
                            alt={item.name}
                            style={{ width: '100%', height: isMobile ? 64 : 84, objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                          <h3
                            className="h2 mono"
                            style={{
                              fontSize: 13,
                              margin: 0,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {item.name}
                          </h3>
                          <div
                            className="p"
                            style={{ opacity: 0.9, fontSize: 11, color: 'var(--text-secondary)' }}
                          >
                            Ціна: <strong>{formatPrice(price)}</strong>
                          </div>

                          {isMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <QtyControl
                                qty={qty}
                                onDec={e => handleDecrease(item.id, e)}
                                onInc={e => handleIncrease(item.id, e)}
                              />
                              <div
                                className="p"
                                style={{
                                  marginLeft: 'auto',
                                  fontSize: 12,
                                  color: 'var(--accent-green)',
                                  fontWeight: 'bold'
                                }}
                              >
                                {formatPrice(lineTotal)}
                              </div>
                            </div>
                          )}
                        </div>

                        {!isMobile && (
                          <div style={{ display: 'grid', gap: 8, justifyItems: 'end', alignItems: 'center' }}>
                            <QtyControl
                              qty={qty}
                              onDec={e => handleDecrease(item.id, e)}
                              onInc={e => handleIncrease(item.id, e)}
                              wide
                            />
                            <div
                              className="p"
                              style={{
                                opacity: 1,
                                fontSize: 12,
                                textAlign: 'right',
                                color: 'var(--accent-green)',
                                fontWeight: 'bold'
                              }}
                            >
                              {formatPrice(lineTotal)}
                            </div>
                            <motion.button
                              className="btn btn-outline delete-btn"
                              onClick={e => handleRemove(item.id, e)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              style={dangerPill()}
                            >
                              Видалити
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {hasItems && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginTop: 12,
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    <button
                      className="btn btn-outline"
                      onClick={handleClear}
                      style={dangerPill({ full: isMobile })}
                    >
                      Очистити кошик
                    </button>
                    <Link to="/products" className="btn" style={ghostPill()}>
                      ← Продовжити покупки
                    </Link>
                  </div>
                )}
              </motion.div>

              <motion.aside
                className="surface"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={glassPanel({ p: 16 })}
              >
                <div style={glassGradientOverlay(true)} />
                <h2
                  className="h2 mono"
                  style={{
                    marginBottom: 16,
                    color: 'var(--text-primary)',
                    fontSize: 15,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  Підсумок
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gap: 12,
                    marginBottom: 20,
                    fontSize: 12,
                    position: 'relative',
                    zIndex: 1
                  }}
                >
                  <RowLine
                    label="Кількість товарів"
                    value={totalQty}
                    color="var(--text-secondary)"
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--accent-green)',
                      paddingTop: 6
                    }}
                  >
                    <span>Загальна сума</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                <button
                  className="btn btn-green"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  style={primaryCta({ full: true, disabled: isSubmitting })}
                >
                  {isSubmitting ? 'Обробка...' : 'Оформити замовлення'}
                </button>
              </motion.aside>
            </motion.div>
          )}

          {checkoutStep === 'form' && (
            <motion.div
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ marginBottom: 24 }}
            >
              <div
                className="grid grid-2"
                style={{
                  gap: 24,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
                }}
              >
                <div className="surface" style={glassPanel({ p: 16 })}>
                  <h3
                    className="h2 mono"
                    style={{ color: 'var(--text-primary)', marginBottom: 16 }}
                  >
                    Дані отримувача
                  </h3>
                  <FormInput
                    name="firstName"
                    placeholder="Ім'я"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={errors.firstName}
                  />
                  <FormInput
                    name="lastName"
                    placeholder="Прізвище"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={errors.lastName}
                  />
                  <FormInput
                    name="phone"
                    placeholder="Телефон (+380...)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    error={errors.phone}
                  />
                  <FormInput
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    error={errors.email}
                  />
                </div>

                <div className="surface" style={glassPanel({ p: 16 })}>
                  <h3
                    className="h2 mono"
                    style={{ color: 'var(--text-primary)', marginBottom: 16 }}
                  >
                    Доставка та оплата
                  </h3>

                  <OptionTiles
                    label="Спосіб доставки"
                    name="delivery"
                    value={formData.delivery}
                    onChange={val => {
                      setFormData(prev => ({ ...prev, delivery: val }));
                    }}
                    options={deliveryOptions}
                    columns={isMobile ? 1 : 2}
                  />

                  {formData.delivery === 'nova-poshta' && (
                    <NovaPoshtaAddressBlock
                      formData={formData}
                      setFormData={setFormData}
                      errors={errors}
                      npCities={npCities}
                      npCitiesLoading={npCitiesLoading}
                      npWarehouses={npWarehouses}
                      npWarehousesLoading={npWarehousesLoading}
                      selectedNpCity={selectedNpCity}
                      setSelectedNpCity={setSelectedNpCity}
                      selectedNpWarehouse={selectedNpWarehouse}
                      setSelectedNpWarehouse={setSelectedNpWarehouse}
                      fetchNpCities={fetchNpCities}
                      fetchNpWarehouses={fetchNpWarehouses}
                    />
                  )}

                  {formData.delivery !== 'nova-poshta' &&
                    formData.delivery !== 'self-pickup' && (
                      <>
                        <FormInput
                          name="city"
                          placeholder="Місто"
                          value={formData.city}
                          onChange={handleInputChange}
                          error={errors.city}
                        />
                        <FormInput
                          name="address"
                          placeholder="Адреса (вул., буд., кв.)"
                          value={formData.address}
                          onChange={handleInputChange}
                          error={errors.address}
                        />
                      </>
                    )}

                  {formData.delivery === 'self-pickup' && (
                    <p
                      className="p"
                      style={{ fontSize: 12, opacity: 0.85 }}
                    >
                      Самовивіз з нашого магазину в Києві (точну адресу ви
                      отримаєте після підтвердження).
                    </p>
                  )}

                  <OptionTiles
                    label="Оплата"
                    name="payment"
                    value={formData.payment}
                    onChange={val =>
                      setFormData(prev => ({ ...prev, payment: val }))
                    }
                    options={paymentOptions}
                    columns={isMobile ? 1 : 2}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  justifyContent: 'center',
                  marginTop: 24,
                  flexWrap: 'wrap'
                }}
              >
                <button
                  className="btn"
                  onClick={() => setCheckoutStep('cart')}
                  style={ghostPill()}
                >
                  ← Назад до кошика
                </button>
                <button
                  className="btn btn-green"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  style={primaryCta()}
                >
                  {isSubmitting ? 'Обробка...' : '✅ Підтвердити замовлення'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {isMobile && checkoutStep === 'cart' && hasItems && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: `calc(12px + env(safe-area-inset-bottom, 0))`,
            zIndex: 40
          }}
        >
          <div
            className="surface"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 18,
              background: 'var(--surface-header-bg)',
              border: '1px solid var(--border-input)',
              backdropFilter: 'blur(16px)',
              boxShadow: isDarkTheme()
                ? 'none'
                : '0 0 0 1px rgba(255,255,255,0.14), 0 16px 40px rgba(0,0,0,0.30)'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                lineHeight: 1.1
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  opacity: 0.9,
                  color: 'var(--text-secondary)'
                }}
              >
                Загальна сума
              </span>
              <strong
                style={{
                  color: 'var(--accent-green)',
                  fontSize: 14
                }}
              >
                {formatPrice(total)}
              </strong>
            </div>
            <button
              className="btn btn-green"
              onClick={handleCheckout}
              disabled={isSubmitting}
              style={primaryCta({ compact: true })}
            >
              {isSubmitting ? '...' : 'Оформити'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= Nova Poshta block ================= */

function NovaPoshtaAddressBlock({
  formData,
  setFormData,
  errors,
  npCities,
  npCitiesLoading,
  npWarehouses,
  npWarehousesLoading,
  selectedNpCity,
  setSelectedNpCity,
  selectedNpWarehouse,
  setSelectedNpWarehouse,
  fetchNpCities,
  fetchNpWarehouses
}) {
  const [cityQuery, setCityQuery] = React.useState(formData.city || '');
  const [warehouseQuery, setWarehouseQuery] = React.useState(
    formData.address || ''
  );
  const [cityDropdownOpen, setCityDropdownOpen] = React.useState(false);
  const [warehousesOpen, setWarehousesOpen] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (cityDropdownOpen && cityQuery.trim().length >= 2) {
        fetchNpCities(cityQuery);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [cityQuery, cityDropdownOpen, fetchNpCities]);

  const handleCityInputChange = e => {
    const value = e.target.value;
    setCityQuery(value);
    setFormData(prev => ({
      ...prev,
      city: value,
      address: ''
    }));
    setSelectedNpCity(null);
    setSelectedNpWarehouse(null);
    setWarehouseQuery('');
    setWarehousesOpen(false);
    setCityDropdownOpen(value.trim().length >= 2);
  };

  const handleCityFocus = () => {
    setWarehousesOpen(false);
    if (cityQuery.trim().length >= 2) {
      setCityDropdownOpen(true);
    }
  };

  const handleCitySelect = city => {
    setSelectedNpCity(city);
    setCityQuery(city.Description);
    setFormData(prev => ({
      ...prev,
      city: city.Description,
      address: ''
    }));
    setSelectedNpWarehouse(null);
    setWarehouseQuery('');
    setCityDropdownOpen(false);
    setWarehousesOpen(false);
    fetchNpWarehouses(city.Ref);
  };

  const handleWarehouseInputChange = e => {
    const value = e.target.value;
    setWarehouseQuery(value);
    setFormData(prev => ({
      ...prev,
      address: value
    }));
    if (selectedNpCity) {
      setWarehousesOpen(true);
    }
  };

  const handleWarehouseFocus = () => {
    if (!selectedNpCity) return;
    setCityDropdownOpen(false);
    if (!npWarehouses.length && !npWarehousesLoading) {
      fetchNpWarehouses(selectedNpCity.Ref);
    }
    setWarehousesOpen(true);
  };

  const handleWarehouseSelect = w => {
    setSelectedNpWarehouse(w);
    const label = w.ShortAddress || w.Description;
    setWarehouseQuery(label);
    setFormData(prev => ({
      ...prev,
      address: label
    }));
    setWarehousesOpen(false);
  };

  const filteredWarehouses = React.useMemo(() => {
    const q = warehouseQuery.trim().toLowerCase();
    if (!q) return npWarehouses;
    return npWarehouses.filter(w => {
      const short = (w.ShortAddress || '').toLowerCase();
      const desc = (w.Description || '').toLowerCase();
      const num = String(w.Number || '').toLowerCase();
      return short.includes(q) || desc.includes(q) || num.includes(q);
    });
  }, [npWarehouses, warehouseQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <FormInput
          name="city"
          placeholder="Місто (Нова пошта)"
          value={cityQuery}
          onChange={handleCityInputChange}
          onFocus={handleCityFocus}
          error={errors.city}
        />
        {npCitiesLoading && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              opacity: 0.7,
              marginTop: -6,
              marginBottom: 4
            }}
          >
            Завантаження міст...
          </div>
        )}

        {cityDropdownOpen && !!npCities.length && (
          <div
            style={{
              marginTop: 4,
              maxHeight: 220,
              overflowY: 'auto',
              background: 'var(--surface-header-bg)',
              borderRadius: 16,
              border: '1px solid var(--border-input)',
              boxShadow: isDarkTheme()
                ? 'none'
                : '0 0 0 1px rgba(0,0,0,0.1), 0 18px 40px rgba(0,0,0,0.30)',
              padding: 2,
              zIndex: 30
            }}
          >
            {npCities.map(city => (
              <button
                key={city.Ref}
                type="button"
                onClick={() => handleCitySelect(city)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  border: 'none',
                  background:
                    selectedNpCity?.Ref === city.Ref
                      ? 'rgba(255,255,255,0.08)'
                      : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  borderRadius: 10
                }}
              >
                <div className="mono" style={{ fontSize: 12 }}>
                  {city.Description}
                </div>
                {(city.AreaDescription || city.RegionDescription) && (
                  <div
                    className="p"
                    style={{ fontSize: 11, opacity: 0.7 }}
                  >
                    {city.AreaDescription} {city.RegionDescription}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ marginBottom: 4, fontSize: 11 }} className="mono">
          Відділення Нової пошти
        </div>

        <FormInput
          name="npWarehouse"
          placeholder={
            selectedNpCity
              ? 'Почніть вводити номер / адресу відділення'
              : 'Спочатку оберіть місто'
          }
          value={warehouseQuery}
          onChange={handleWarehouseInputChange}
          onFocus={handleWarehouseFocus}
          error={errors.address}
        />

        {selectedNpCity && warehousesOpen && (
          <div
            style={{
              marginTop: 4,
              maxHeight: 240,
              overflowY: 'auto',
              borderRadius: 16,
              background: 'var(--surface-header-bg)',
              border: '1px solid var(--border-input)',
              boxShadow: isDarkTheme()
                ? 'none'
                : '0 0 0 1px rgba(0,0,0,0.10), 0 18px 40px rgba(0,0,0,0.30)',
              padding: 4,
              zIndex: 30
            }}
          >
            {npWarehousesLoading && (
              <div
                className="mono"
                style={{ fontSize: 11, opacity: 0.7, padding: 6 }}
              >
                Завантаження відділень...
              </div>
            )}

            {!npWarehousesLoading && !filteredWarehouses.length && (
              <div
                className="mono"
                style={{ fontSize: 11, opacity: 0.7, padding: 6 }}
              >
                Немає відділень за цим запитом
              </div>
            )}

            {filteredWarehouses.map(w => (
              <button
                key={w.Ref}
                type="button"
                onClick={() => handleWarehouseSelect(w)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 8px',
                  border: 'none',
                  background:
                    selectedNpWarehouse?.Ref === w.Ref
                      ? 'rgba(0,255,128,0.10)'
                      : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  borderRadius: 10
                }}
              >
                <div className="mono">
                  Відділення №{w.Number} —{' '}
                  {w.ShortAddress || w.Description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= THEME HELPER ================= */

function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.dataset.theme === 'dark' ||
    root.classList.contains('theme-dark') ||
    root.classList.contains('dark')
  );
}

/* ================= Option tiles, inputs, helpers ================= */

function OptionTiles({ label, name, value, onChange, options, columns = 2 }) {
  const groupRef = useRef(null);

  const onKeyDown = e => {
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
      {label && (
        <div
          className="mono"
          style={{
            fontSize: 11,
            opacity: 0.85,
            marginBottom: 8,
            color: 'var(--text-secondary)'
          }}
        >
          {label}
        </div>
      )}

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
        {options.map(opt => {
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
              style={tileBtn(active)}
            >
              {opt.icon ? (
                <img
                  src={opt.icon}
                  alt=""
                  aria-hidden="true"
                  style={iconStyle}
                />
              ) : opt.emoji ? (
                <span
                  aria-hidden
                  style={{ fontSize: 16, lineHeight: 1 }}
                >
                  {opt.emoji}
                </span>
              ) : null}

              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {opt.label}
              </span>

              {active && <span aria-hidden style={{ marginLeft: 'auto' }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QtyControl({ qty, onDec, onInc, wide }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'end',
        background: 'var(--surface-input)',
        padding: '6px',
        borderRadius: 10,
        border: '1px solid var(--border-input)'
      }}
    >
      <button
        onClick={onDec}
        disabled={qty <= 1}
        aria-label="Зменшити кількість"
        style={circleBtn(qty <= 1 ? 'disabledMinus' : 'minus', wide)}
      >
        −
      </button>
      <div
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          fontWeight: 'bold',
          minWidth: 28,
          textAlign: 'center',
          background: 'var(--surface-gradient)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-input)',
          boxShadow: isDarkTheme()
            ? 'none'
            : '0 0 0 1px rgba(255,255,255,0.16), 0 6px 16px rgba(0,0,0,0.20)',
          fontSize: 12
        }}
        aria-live="polite"
      >
        {qty}
      </div>
      <button
        onClick={onInc}
        aria-label="Збільшити кількість"
        style={circleBtn('plus', wide)}
      >
        +
      </button>
    </div>
  );
}

function RowLine({ label, value, color }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-primary)',
        paddingBottom: 6,
        opacity: 0.92
      }}
    >
      <span style={{ color }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );
}

function FormInput({
  name,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  onFocus
}) {
  const id = `field-${name}`;
  const errId = `${id}-err`;
  return (
    <>
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        aria-invalid={!!error}
        aria-describedby={error ? errId : undefined}
        className="input"
        style={{ marginBottom: 6 }}
      />
      {error && (
        <p
          id={errId}
          className="p"
          style={{
            color: 'var(--accent-pink)',
            fontSize: 10,
            margin: '4px 0 10px 0'
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}

/* ============== Style helpers ============== */

function tileBtn(active) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    width: '100%',
    borderRadius: 16,
    background: active
      ? 'var(--surface-gradient)'
      : 'var(--surface-input)',
    border: active
      ? '1px solid var(--accent-turquoise)'
      : '1px solid var(--border-input)',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    backdropFilter: 'blur(18px)',
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.14), 0 16px 36px rgba(0,0,0,0.30)',
    cursor: 'pointer',
    transition: 'all .2s ease',
    textAlign: 'left',
    outline: 'none'
  };
}

function circleBtn(kind = 'plus', wide = false) {
  const base = {
    width: wide ? 30 : 28,
    height: wide ? 30 : 28,
    padding: 0,
    fontSize: 14,
    minWidth: 'auto',
    borderRadius: '50%',
    border: 'none',
    color: 'var(--text-on-accent-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform .12s ease'
  };
  if (kind === 'minus') {
    return {
      ...base,
      background:
        'linear-gradient(180deg, var(--accent-pink), var(--accent-pink-dark))',
      boxShadow: isDarkTheme()
        ? 'none'
        : '0 0 0 1px rgba(255,255,255,0.16), 0 6px 16px rgba(0,0,0,0.24)'
    };
  }
  if (kind === 'disabledMinus') {
    return {
      ...base,
      background: '#999',
      cursor: 'not-allowed',
      opacity: 0.6,
      boxShadow: isDarkTheme()
        ? 'none'
        : '0 0 0 1px rgba(255,255,255,0.10), 0 3px 10px rgba(0,0,0,0.18)',
      color: 'var(--text-secondary)'
    };
  }
  return {
    ...base,
    background:
      'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))',
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.16), 0 6px 16px rgba(0,0,0,0.24)'
  };
}

function glassPanel({ p = 20, center = false } = {}) {
  return {
    padding: p,
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.16), 0 18px 45px rgba(0,0,0,0.32)',
    border: '1px solid var(--border-primary)',
    backdropFilter: 'blur(22px)',
    position: 'relative',
    overflow: 'visible',
    borderRadius: 20,
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
    ...(center
      ? { display: 'grid', placeItems: 'center', textAlign: 'center' }
      : {})
  };
}

function glassGradientOverlay(reverse = false) {
  const gradient = reverse
    ? 'linear-gradient(135deg, rgba(0,0,0,0.14), rgba(255,255,255,0.04))'
    : 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(0,0,0,0.06))';

  return {
    position: 'absolute',
    inset: 0,
    background: gradient,
    pointerEvents: 'none',
    borderRadius: 'inherit'
  };
}

function primaryCta({ full = false, compact = false, disabled = false } = {}) {
  return {
    width: full ? '100%' : 'auto',
    padding: compact ? '10px 16px' : '12px 20px',
    fontSize: compact ? 12 : 13,
    background: disabled
      ? '#999'
      : 'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))',
    border: 'none',
    boxShadow: isDarkTheme()
      ? 'none'
      : disabled
      ? '0 0 0 1px rgba(255,255,255,0.12), 0 6px 16px rgba(0,0,0,0.20)'
      : '0 0 0 1px rgba(255,255,255,0.16), 0 16px 40px rgba(0,0,0,0.32)',
    color: 'var(--text-on-accent-light)',
    fontWeight: 600,
    borderRadius: 999,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.85 : 1
  };
}

function dangerPill({ full = false } = {}) {
  return {
    width: full ? '100%' : 'auto',
    padding: '9px 14px',
    fontSize: 11,
    background:
      'linear-gradient(180deg, rgba(255,59,48,0.10), rgba(255,59,48,0.04))',
    border: '1px solid var(--accent-pink)',
    borderRadius: 999,
    color: 'var(--accent-pink)',
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.12), 0 6px 16px rgba(0,0,0,0.22)',
    fontWeight: 500
  };
}

function ghostPill() {
  return {
    padding: '9px 14px',
    fontSize: 11,
    borderRadius: 999,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
    textDecoration: 'none'
  };
}
