// src/pages/PaymentResult.js
import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { clearCart } from '../redux/cartSlice';
import formatPrice from '../utils/formatPrice';

export default function PaymentResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [state, setState] = useState({
    loading: true,
    success: false,
    status: null,
    amount: null,
    error: null,
    orderId: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
      setState({
        loading: false,
        success: false,
        status: null,
        amount: null,
        error: 'Не передано номер замовлення.',
        orderId: null,
      });
      return;
    }

    const checkPayment = async () => {
      try {
        const { data } = await axios.get('/api/payments/monobank/status', {
          params: { orderId },
        });

        if (data.ok && data.paid && data.status === 'success') {
          // якщо оплата успішна — очищаємо кошик
          dispatch(clearCart());

          setState({
            loading: false,
            success: true,
            status: data.status,
            amount: data.amount,
            error: null,
            orderId,
          });
        } else {
          setState({
            loading: false,
            success: false,
            status: data.status || 'not_found',
            amount: data.amount || null,
            error: null,
            orderId,
          });
        }
      } catch (err) {
        console.error('Помилка перевірки оплати:', err);
        setState({
          loading: false,
          success: false,
          status: null,
          amount: null,
          error:
            'Не вдалося перевірити оплату. Спробуйте оновити сторінку або звʼязатися з нами.',
          orderId,
        });
      }
    };

    checkPayment();
  }, [location.search, dispatch]);

  const { loading, success, status, amount, error, orderId } = state;

  const isDarkTheme = () => {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return (
      root.dataset.theme === 'dark' ||
      root.classList.contains('theme-dark') ||
      root.classList.contains('dark')
    );
  };

  const glassPanel = ({ p = 24 } = {}) => ({
    padding: p,
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.16), 0 18px 45px rgba(0,0,0,0.32)',
    border: '1px solid var(--border-primary)',
    backdropFilter: 'blur(22px)',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
  });

  const gradientOverlay = (reverse = false) => ({
    position: 'absolute',
    inset: 0,
    background: reverse
      ? 'linear-gradient(135deg, rgba(0,0,0,0.16), rgba(255,255,255,0.04))'
      : 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,0,0,0.08))',
    pointerEvents: 'none',
    borderRadius: 'inherit',
  });

  const primaryCta = ({ full = false } = {}) => ({
    width: full ? '100%' : 'auto',
    padding: '12px 20px',
    fontSize: 13,
    background:
      'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))',
    border: 'none',
    boxShadow: isDarkTheme()
      ? 'none'
      : '0 0 0 1px rgba(255,255,255,0.16), 0 16px 40px rgba(0,0,0,0.32)',
    color: 'var(--text-on-accent-light)',
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
  });

  const ghostBtn = () => ({
    padding: '10px 16px',
    fontSize: 12,
    borderRadius: 999,
    background: 'var(--surface-input)',
    border: '1px solid var(--border-input)',
    color: 'var(--text-primary)',
    textDecoration: 'none',
  });

  const successVariants = {
    hidden: { scale: 0.9, opacity: 0, y: 10 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  };

  const wrapperStyle = {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // ---------- LOADING ----------
  if (loading) {
    return (
      <section className="container" style={wrapperStyle}>
        <motion.div
          variants={successVariants}
          initial="hidden"
          animate="visible"
          className="surface"
          style={glassPanel({ p: 24 })}
        >
          <div style={gradientOverlay()} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <h2 className="h1 retro" style={{ fontSize: 20, marginBottom: 12 }}>
              Перевіряємо оплату...
            </h2>
            <p className="p" style={{ fontSize: 12, opacity: 0.85 }}>
              Зачекайте кілька секунд. Ми запитуємо банкінг Monobank.
            </p>
          </div>
        </motion.div>
      </section>
    );
  }

  // ---------- SUCCESS ----------
  if (success) {
    const amountUah =
      typeof amount === 'number' ? formatPrice(amount / 100) : null;

    return (
      <section className="container" style={wrapperStyle}>
        <motion.div
          variants={successVariants}
          initial="hidden"
          animate="visible"
          className="surface"
          style={glassPanel({ p: 28 })}
          aria-live="polite"
        >
          <div style={gradientOverlay()} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
            <h2
              className="h1 retro"
              style={{
                color: 'var(--text-primary)',
                marginBottom: 12,
                fontSize: 22,
                textAlign: 'center',
              }}
            >
              Оплата пройшла успішно 🎉
            </h2>
            <p
              className="p"
              style={{
                opacity: 0.9,
                marginBottom: 8,
                fontSize: 13,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              Ваше замовлення <strong>№{orderId}</strong> успішно оплачено.
            </p>
            {amountUah && (
              <p
                className="p"
                style={{
                  opacity: 0.95,
                  marginBottom: 16,
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                }}
              >
                Сума оплати: <strong>{amountUah}</strong>
              </p>
            )}
            <p
              className="p"
              style={{
                opacity: 0.7,
                marginBottom: 24,
                fontSize: 11,
                color: 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              Найближчим часом наш менеджер звʼяжеться з вами для підтвердження деталей
              доставки.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link to="/account" className="btn btn-green" style={primaryCta({ full: false })}>
                Перейти до моїх замовлень
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => navigate('/')}
                style={ghostBtn()}
              >
                На головну
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    );
  }

  // ---------- FAIL / NOT FOUND / ERROR ----------
  return (
    <section className="container" style={wrapperStyle}>
      <motion.div
        variants={successVariants}
        initial="hidden"
        animate="visible"
        className="surface"
        style={glassPanel({ p: 24 })}
      >
        <div style={gradientOverlay(true)} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          <h2
            className="h1 retro"
            style={{
              color: 'var(--text-primary)',
              marginBottom: 12,
              fontSize: 20,
              textAlign: 'center',
            }}
          >
            Не вдалося підтвердити оплату 😔
          </h2>
          {error ? (
            <p
              className="p"
              style={{
                opacity: 0.9,
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--accent-pink)',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          ) : (
            <>
              <p
                className="p"
                style={{
                  opacity: 0.9,
                  marginBottom: 8,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                Статус платежу: <strong>{status || 'невідомий'}</strong>
              </p>
              <p
                className="p"
                style={{
                  opacity: 0.8,
                  marginBottom: 16,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                Якщо кошти були списані, але статус не оновився — зверніться до нашої підтримки
                або оновіть сторінку через кілька хвилин.
              </p>
            </>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn btn-green"
              onClick={() => navigate('/cart')}
              style={primaryCta({ full: false })}
            >
              Повернутись до кошика
            </button>
            <Link to="/" className="btn" style={ghostBtn()}>
              На головну
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
