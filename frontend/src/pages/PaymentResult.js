// src/pages/PaymentResult.js
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { clearCart } from '../redux/cartSlice';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function PaymentResult() {
  const query = useQuery();
  const orderId = query.get('orderId');
  const invoiceId = query.get('invoiceId'); // Monobank додає сам
  const [status, setStatus] = useState('checking'); // checking | success | failed | unknown
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!invoiceId) {
        // Якщо банк чомусь не передав invoiceId
        setStatus('unknown');
        return;
      }

      try {
        const { data } = await axios.get('/api/payments/monobank/status', {
          params: { invoiceId },
        });

        if (data.isSuccess) {
          setStatus('success');
          // Очищаємо кошик після підтвердженої оплати
          dispatch(clearCart());
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Помилка перевірки статусу оплати:', err);
        setError(
          err.response?.data?.message ||
            'Не вдалося перевірити статус оплати. Якщо кошти списано — звʼяжіться з нами.'
        );
        setStatus('unknown');
      }
    };

    check();
  }, [invoiceId, dispatch]);

  let title;
  let description;

  if (status === 'checking') {
    title = 'Перевіряємо оплату...';
    description = 'Будь ласка, зачекайте декілька секунд, ми отримуємо відповідь від Monobank.';
  } else if (status === 'success') {
    title = 'Оплата пройшла успішно 🎉';
    description =
      'Ваше замовлення створено та оплачено. Найближчим часом ми з вами звʼяжемося для підтвердження деталей.';
  } else if (status === 'failed') {
    title = 'Оплата не завершена';
    description =
      'Здається, оплата не була завершена або була відхилена. Якщо кошти списалися, звʼяжіться з нами для уточнення.';
  } else {
    title = 'Статус оплати невідомий';
    description =
      'Ми не змогли визначити статус оплати. Якщо ви впевнені, що платіж був проведений, звʼяжіться з нами.';
  }

  return (
    <section
      className="container"
      style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="surface"
        style={glassPanel({ p: 28, center: true })}
      >
        <div style={glassGradientOverlay()} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
          <h1
            className="h1 retro"
            style={{
              color: 'var(--text-primary)',
              marginBottom: 12,
              fontSize: 22,
              textAlign: 'center',
            }}
          >
            {title}
          </h1>

          <p
            className="p"
            style={{
              opacity: 0.9,
              marginBottom: 12,
              fontSize: 13,
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            {description}
          </p>

          {orderId && (
            <p
              className="p"
              style={{
                opacity: 0.95,
                marginBottom: 18,
                fontSize: 12,
                color: 'var(--text-primary)',
                textAlign: 'center',
              }}
            >
              Номер вашого замовлення: <strong>#{orderId}</strong>
            </p>
          )}

          {status === 'checking' && (
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
              Не закривайте цю сторінку, поки йде перевірка.
            </p>
          )}

          {error && (
            <p
              className="p"
              style={{
                color: 'var(--accent-pink)',
                fontSize: 11,
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 8,
            }}
          >
            <Link
              to="/"
              className="btn btn-green"
              style={primaryCta({ compact: true })}
            >
              На головну
            </Link>
            <Link to="/profile/orders" className="btn" style={ghostPill()}>
              Мої замовлення
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ----- Локальні стилі (щоб не тягнути з Cart.js) ----- */

function glassPanel({ p = 20, center = false } = {}) {
  return {
    padding: p,
    boxShadow:
      '0 0 0 1px rgba(255,255,255,0.16), 0 18px 45px rgba(0,0,0,0.32)',
    border: '1px solid var(--border-primary)',
    backdropFilter: 'blur(22px)',
    position: 'relative',
    overflow: 'visible',
    borderRadius: 20,
    background:
      'linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))',
    ...(center
      ? { display: 'grid', placeItems: 'center', textAlign: 'center' }
      : {}),
  };
}

function glassGradientOverlay() {
  return {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(0,0,0,0.06))',
    pointerEvents: 'none',
    borderRadius: 'inherit',
  };
}

function primaryCta({ compact = false } = {}) {
  return {
    padding: compact ? '10px 16px' : '12px 20px',
    fontSize: compact ? 12 : 13,
    background:
      'linear-gradient(180deg, var(--accent-green), var(--accent-green-dark))',
    border: 'none',
    boxShadow:
      '0 0 0 1px rgba(255,255,255,0.16), 0 16px 40px rgba(0,0,0,0.32)',
    color: 'var(--text-on-accent-light)',
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
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
    textDecoration: 'none',
  };
}
