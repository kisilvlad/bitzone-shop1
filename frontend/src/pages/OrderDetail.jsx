// src/pages/OrderDetail.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { motion } from 'framer-motion';
import formatPrice from '../utils/formatPrice';

const mapStatus = (statusRaw) => {
  const s = (statusRaw ?? '').toString().toLowerCase();

  if (s.includes('робот') || s.includes('processing')) return { label: 'В роботі', color: '#28a745' };
  if (s.includes('оплач')) return { label: 'Оплачено', color: '#00CED1' };
  if (s.includes('достав') || s.includes('complete')) return { label: 'Доставлено', color: '#1fbf64' };
  if (s.includes('скас')) return { label: 'Скасовано', color: '#dc3545' };
  if (s.includes('нове') || s.includes('new')) return { label: 'Нове', color: '#1973E1' };

  return { label: statusRaw || 'Статус', color: '#999' };
};

export default function OrderDetail() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, user, isAuthenticated } = useSelector((s) => s.auth);

  const [order, setOrder] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });

  // захист: якщо не залогінений
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!token) return;

    const rawParamId = params.orderId || params.id;
    const pathname = location.pathname;
    const fromPath = pathname.split('/').filter(Boolean).pop();
    const finalOrderId = rawParamId || fromPath;

    console.log('[OrderDetail] params =', params);
    console.log('[OrderDetail] pathname =', pathname);
    console.log('[OrderDetail] final orderId =', finalOrderId);

    if (!finalOrderId) {
      setState({
        loading: false,
        error: 'Невірний ідентифікатор замовлення.'
      });
      return;
    }

    const load = async () => {
      setState({ loading: true, error: '' });

      try {
        console.log('[OrderDetail] Завантажуємо замовлення з id =', finalOrderId);
        const { data } = await axios.get(`/api/orders/${finalOrderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('[OrderDetail] Отримали дані замовлення з бекенда:', data);
        setOrder(data);
        setState({ loading: false, error: '' });
      } catch (err) {
        console.error('[OrderDetail] Помилка завантаження:', err);
        setState({
          loading: false,
          error: 'Не вдалося завантажити замовлення.'
        });
      }
    };

    load();
  }, [params, location.pathname, token]);

  if (state.loading) {
    return (
      <div className="container" style={{ padding: '30px 0' }}>
        <div className="surface" style={{ padding: 20 }}>
          Завантаження замовлення...
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container" style={{ padding: '30px 0' }}>
        <div className="surface" style={{ padding: 20 }}>{state.error}</div>
      </div>
    );
  }

  if (!order) return null;

  const items = order.items || [];
  const statusInfo = mapStatus(order.status);
  const total = order.total ?? items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );

  const customerName =
    `${user?.firstName || user?.name || ''} ${user?.lastName || ''}`.trim() || 'Клієнт';

  return (
    <motion.div
      className="page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '20px 0 40px' }}
    >
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Навігація */}
        <Link to="/account" style={{ color: 'var(--turquoise-2)', fontSize: 14 }}>
          ← назад до акаунта
        </Link>

        {/* Хедер замовлення */}
        <div className="surface" style={{ padding: 20, borderRadius: 18 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--yellow)' }}>
                Замовлення #{order.id}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 4 }}>
                {customerName}
              </div>
              {order.createdAt && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  від{' '}
                  {new Date(order.createdAt).toLocaleString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', minWidth: 140 }}>
              <span
                style={{
                  padding: '5px 14px',
                  borderRadius: 999,
                  border: `1px solid ${statusInfo.color}`,
                  color: statusInfo.color,
                  fontSize: 12,
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {statusInfo.label}
              </span>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                {formatPrice(total)}
              </div>
            </div>
          </div>
        </div>

        {/* Склад замовлення */}
        <div className="surface" style={{ padding: 20, borderRadius: 18 }}>
          <h2
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 18,
              fontWeight: 800
            }}
          >
            Склад замовлення
          </h2>

          {!items.length && (
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginTop: 8 }}>
              Товари цього замовлення зараз недоступні або ще не підтягуються з CRM.
            </p>
          )}

          {items.map((item) => {
            const lineTotal =
              (Number(item.price) || 0) * (Number(item.quantity) || 1);

            const imgSrc =
              item.image ||
              '/assets/images/placeholder-product.png';

            return (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {/* Фото */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background: 'var(--surface-2)'
                  }}
                >
                  <img
                    src={imgSrc}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt={item.name || 'Товар'}
                  />
                </div>

                {/* Назва + кількість */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {item.name || 'Товар'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
                    {item.quantity || 1} шт × {formatPrice(item.price || 0)}
                  </div>
                </div>

                {/* Сума по позиції */}
                <div style={{ fontWeight: 700 }}>
                  {formatPrice(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
