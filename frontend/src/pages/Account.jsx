// src/pages/Account.jsx
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '../redux/authSlice';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import formatPrice from '../utils/formatPrice';

/* ====================== helpers ====================== */

const useIsMobile = (bp = 820) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [bp]);

  return isMobile;
};

const formatDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d || '';
    return dt.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d || '';
  }
};

/* Optimized image url for order items (same logic as ProductCard) */
const getOptimizedOrderImageUrl = (originalUrl, width = 300, quality = 82) => {
  if (!originalUrl) return '/assets/bitzone-logo1.png';
  return `/api/images?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}`;
};

/* ====================== Shared UI ====================== */

const StarRating = ({ rating = 0 }) => (
  <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)' }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ fontSize: 16 }}>
        {i <= rating ? '★' : '☆'}
      </span>
    ))}
  </div>
);

const TabButton = ({ active, onClick, children, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className="btn tab-btn"
    aria-pressed={active}
    aria-label={ariaLabel}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: '8px 14px',
      borderRadius: 999,
      border: 'none',
      fontSize: 14,
      cursor: 'pointer',
      background: active ? 'var(--turquoise-2)' : 'var(--surface-2)',
      color: active ? 'var(--black)' : 'var(--text-2)',
      boxShadow: active ? '0 0 0 1px rgba(0,0,0,0.14)' : 'none',
      transition: 'background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease',
    }}
  >
    {children}
  </button>
);

/* ====================== Orders Tab ====================== */

const OrdersTab = ({ token, isMobile }) => {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: '' });

      try {
        // 1) базовий список замовлень
        const { data } = await axios.get('/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const baseOrders = Array.isArray(data) ? data : [];

        // 2) підтягнути items для кожного замовлення
        const withDetails = await Promise.all(
          baseOrders.map(async (order) => {
            const id = order.id || order._id;
            if (!id) return order;

            try {
              const { data: detail } = await axios.get(`/api/orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              const items = detail.items || [];
              const totalFromItems = items.reduce(
                (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
                0
              );

              return {
                ...order,
                items,
                total: order.total ?? detail.total ?? totalFromItems,
              };
            } catch (err) {
              console.error('[OrdersTab] Не вдалося завантажити деталі замовлення', id, err);
              return order;
            }
          })
        );

        if (!cancelled) {
          setOrders(withDetails);
          setState({ loading: false, error: '' });
        }
      } catch (err) {
        console.error('[OrdersTab] load error:', err?.response?.data || err.message);
        if (!cancelled) {
          setState({
            loading: false,
            error:
              err?.response?.data?.message ||
              err?.message ||
              'Не вдалося завантажити замовлення. Спробуйте пізніше.',
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.loading) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>Завантажуємо ваші замовлення…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--danger)', whiteSpace: 'pre-line' }}>{state.error}</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          Ви ще не оформлювали замовлення. Давайте виправимо це? 🙂
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((order, idx) => {
        const id = order.id || order._id || '—';
        const date = order.createdAt || order.created_at || order.date || '';
        const formattedDate = formatDate(date);

        const status = order.status || {};
        const statusTitle =
          status.title || status.name || order.statusTitle || order.statusText || 'В обробці';

        const total = order.total || 0;

        const isPaid =
          statusTitle === 'Оплачено' ||
          statusTitle === 'Виконано' ||
          statusTitle === 'Paid' ||
          statusTitle === 'Completed';

        const statusInfo = {
          label: statusTitle,
          color: isPaid ? 'var(--accent-green)' : 'var(--accent-yellow)',
        };

        const items = Array.isArray(order.items) ? order.items : [];
        const previewItems = items.slice(0, 3);
        const extraCount = Math.max(0, items.length - previewItems.length);

        return (
          <Link
            key={id || idx}
            to={`/orders/${id}`}
            style={{ textDecoration: 'none' }}
          >
            <motion.div
              className="surface"
              whileHover={{ y: -2, boxShadow: '0 14px 40px rgba(0,0,0,0.35)' }}
              transition={{ duration: 0.18 }}
              style={{
                borderRadius: 18,
                padding: isMobile ? 12 : 16,
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.5fr) minmax(0, 1.4fr) auto',
                gap: isMobile ? 10 : 18,
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {/* ліва частина: номер + дата + статус */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontWeight: 800,
                      color: 'var(--text-1)',
                      fontSize: isMobile ? 14 : 14,
                    }}
                  >
                    #{id}
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${order.statusColor || statusInfo.color}`,
                      color: order.statusColor || statusInfo.color,
                      textTransform: 'uppercase',
                      letterSpacing: 0.06,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                  }}
                >
                  {formattedDate && (
                    <span>
                      від <span className="mono">{formattedDate}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* середня колонка: превʼю товарів */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {previewItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      width: isMobile ? 40 : 42,
                      height: isMobile ? 40 : 42,
                      borderRadius: 10,
                      overflow: 'hidden',
                      flex: '0 0 auto',
                      background: 'var(--surface-2)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <img
                      src={
                        item.image
                          ? getOptimizedOrderImageUrl(item.image, 260, 82)
                          : '/assets/bitzone-logo1.png'
                      }
                      alt={item.name || 'Товар'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ))}
                {extraCount > 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-3)',
                      paddingLeft: 4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{extraCount} ще
                  </div>
                )}
              </div>

              {/* сума */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMobile ? 'flex-start' : 'flex-end',
                  gap: 4,
                }}
              >
                <span
                  className="price"
                  style={{ fontWeight: 800, fontSize: isMobile ? 15 : 16 }}
                >
                  {formatPrice(total || 0)}
                </span>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};

/* ====================== Reviews Tab ====================== */

const ReviewsTab = ({ token, isMobile }) => {
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: '' });

      try {
        const { data } = await axios.get('/api/reviews/my', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          setReviews(Array.isArray(data) ? data : []);
          setState({ loading: false, error: '' });
        }
      } catch (err) {
        console.error('[ReviewsTab] load error:', err?.response?.data || err.message);
        if (!cancelled) {
          setState({
            loading: false,
            error:
              err?.response?.data?.message ||
              err?.message ||
              'Не вдалося завантажити ваші відгуки.',
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.loading) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>Завантажуємо ваші відгуки…</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--danger)', whiteSpace: 'pre-line' }}>{state.error}</p>
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          Ви ще не залишали відгуків. Після покупки ви зможете оцінити товари.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {reviews.map((rev, i) => (
        <div key={rev.id || i} className="surface" style={{ padding: 16, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{rev.productName}</div>
            <StarRating rating={rev.rating || 0} />
          </div>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>{rev.comment}</p>
        </div>
      ))}
    </div>
  );
};

/* ====================== Settings Tab ====================== */

const SettingsTab = ({ token, isMobile }) => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="surface" style={{ padding: 16, borderRadius: 16 }}>
      <h3 className="h3 mono" style={{ marginBottom: 12, color: 'var(--text-1)' }}>
        Налаштування профілю
      </h3>
      <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>
        Тут згодом будуть налаштування акаунта, адрес доставки, підписки й інші штуки.
      </p>
      {user && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-3)' }}>
          <div>ID користувача: {user._id}</div>
          {user.email && <div>Email: {user.email}</div>}
          {user.phone && <div>Телефон: {user.phone}</div>}
        </div>
      )}
    </div>
  );
};

/* ====================== Account Page ====================== */

export default function Account() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('orders');
  const isMobile = useIsMobile(820);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <motion.div
      className="page account-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        {/* верхній блок із привітанням та кнопкою виходу */}
        <header
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 className="h1 mono" style={{ marginBottom: 4 }}>
              Мій профіль
            </h1>
            {user && (
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 14 }}>
                Привіт,{' '}
                <span style={{ fontWeight: 600 }}>
                  {user.firstName || user.name || 'користувач'}
                </span>
                !
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.01)',
              fontSize: 14,
            }}
          >
            Вийти з акаунта
          </button>
        </header>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <TabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            ariaLabel="Переглянути мої замовлення"
          >
            Замовлення
          </TabButton>
          <TabButton
            active={activeTab === 'reviews'}
            onClick={() => setActiveTab('reviews')}
            ariaLabel="Переглянути мої відгуки"
          >
            Відгуки
          </TabButton>
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            ariaLabel="Переглянути налаштування"
          >
            Налаштування
          </TabButton>
        </div>

        {/* Content */}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'orders' && <OrdersTab token={token} isMobile={isMobile} />}
              {activeTab === 'reviews' && <ReviewsTab token={token} isMobile={isMobile} />}
              {activeTab === 'settings' && <SettingsTab token={token} isMobile={isMobile} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
