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

const mapStatus = (statusRaw) => {
  const s = (statusRaw || '').toString().toLowerCase();

  if (/delivered|completed|викон|достав/i.test(s)) return { label: 'Доставлено', color: '#1fbf64' };
  if (/paid|оплач/i.test(s))                      return { label: 'Оплачено',   color: '#00CED1' };
  if (/processing|в оброб/i.test(s))             return { label: 'В обробці',  color: '#FFD700' };
  if (/canceled|cancelled|скас/i.test(s))        return { label: 'Скасовано',  color: '#dc3545' };
  if (/pending|очіку/i.test(s))                  return { label: 'Очікує',     color: '#8A2BE2' };

  return { label: statusRaw || 'Невідомо', color: 'var(--text-3)' };
};

const niceDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return d || '';
  }
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
        onClick?.();
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
        console.error('[OrdersTab] Помилка завантаження замовлень:', err);
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Не вдалося завантажити замовлення. Спробуйте пізніше.',
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
        <p style={{ margin: 0, color: 'var(--error)' }}>{state.error}</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-2)' }}>
          Ви ще не робили замовлень. Оберіть щось у каталозі!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {orders.map((order, i) => {
        const id = order.id || order._id || i + 1;
        const statusInfo = mapStatus(order.status);
        const items = order.items || [];

        const total =
          order.total ??
          items.reduce(
            (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
            0
          );

        const thumbs = items.slice(0, 4);
        const extraCount = items.length > 4 ? items.length - 4 : 0;

        // картка замовлення
        return (
          <Link
            key={id}
            to={`/account/orders/${id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <motion.div
              className="surface order-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{
                padding: isMobile ? 12 : 16,
                borderRadius: 18,
                borderLeft: `4px solid ${order.statusColor || statusInfo.color}`,
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'minmax(0, 1fr)'
                  : 'minmax(0, 2.1fr) minmax(0, 2.3fr) minmax(0, 1.6fr) auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              {/* номер + дата + статус у одному блоці */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
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
                      fontSize: 14,
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
                  {niceDate(order.createdAt)}
                </div>
              </div>

              {/* міні-фото товарів */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  overflow: 'hidden',
                }}
              >
                {thumbs.map((item, idx) => (
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
                      src={item.image || '/assets/images/placeholder-product.png'}
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
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.06,
                  }}
                >
                  Сума
                </span>
                <span
                  className="price"
                  style={{ fontWeight: 800, fontSize: isMobile ? 15 : 16 }}
                >
                  {formatPrice(total || 0)}
                </span>
              </div>

              {/* стрілочка справа (на десктопі) */}
              {!isMobile && (
                <div
                  style={{
                    justifySelf: 'end',
                    fontSize: 18,
                    color: 'var(--turquoise-2)',
                    opacity: 0.85,
                  }}
                >
                  →
                </div>
              )}
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};

/* ====================== Reviews Tab ====================== */

const ReviewsTab = ({ token }) => {
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: '' });
      try {
        const { data } = await axios.get('/api/users/reviews', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setReviews(Array.isArray(data) ? data : []);
          setState({ loading: false, error: '' });
        }
      } catch (err) {
        console.error('[ReviewsTab] Помилка завантаження відгуків:', err);
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Не вдалося завантажити відгуки.',
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
        <p style={{ margin: 0, color: 'var(--error)' }}>{state.error}</p>
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
        <motion.div
          key={rev.id || i}
          className="surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          style={{ padding: 14, display: 'grid', gap: 8 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>
              {rev.productName || rev.title || 'Товар'}
            </div>
            <StarRating rating={rev.rating || rev.stars || 0} />
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{rev.comment}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {niceDate(rev.createdAt || rev.date)}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ====================== Settings Tab ====================== */

const SettingsTab = ({ token }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthday: '',
  });
  const [state, setState] = useState({ loading: true, error: '', success: '' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      setState({ loading: true, error: '', success: '' });
      try {
        const { data } = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!cancelled) {
          setFormData({
            firstName: data.firstName || data.name || '',
            lastName: data.lastName || '',
            birthday: data.birthday || '',
          });
          setState({ loading: false, error: '', success: '' });
        }
      } catch (err) {
        console.error('[SettingsTab] Помилка завантаження профілю:', err);
        if (!cancelled) {
          setState({
            loading: false,
            error: 'Не вдалося завантажити профіль.',
            success: '',
          });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setState((s) => ({ ...s, error: '', success: '' }));

    try {
      await axios.put('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState({ loading: false, error: '', success: 'Зміни збережено.' });
    } catch (err) {
      console.error('[SettingsTab] Помилка збереження профілю:', err);
      setState({
        loading: false,
        error: 'Не вдалося зберегти зміни.',
        success: '',
      });
    }
  };

  return (
    <div className="surface" style={{ padding: 16 }}>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13, color: 'var(--text-3)' }}>Імʼя</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={onChange}
            className="input"
            placeholder="Ваше імʼя"
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13, color: 'var(--text-3)' }}>Прізвище</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={onChange}
            className="input"
            placeholder="Ваше прізвище"
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 13, color: 'var(--text-3)' }}>Дата народження</label>
          <input
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={onChange}
            className="input"
          />
        </div>

        {state.error && (
          <div style={{ fontSize: 13, color: 'var(--error)' }}>{state.error}</div>
        )}
        {state.success && (
          <div style={{ fontSize: 13, color: 'var(--green)' }}>{state.success}</div>
        )}

        <button type="submit" className="btn primary" disabled={state.loading}>
          Зберегти
        </button>
      </form>
    </div>
  );
};

/* ====================== MAIN ACCOUNT PAGE ====================== */

export default function Account() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useSelector((s) => s.auth);
  const isMobile = useIsMobile(820);

  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  if (!user) {
    return (
      <p className="p center" style={{ color: 'var(--text-3)' }}>
        Завантаження профілю…
      </p>
    );
  }

  const tabs = [
    { key: 'orders', label: 'Замовлення' },
    { key: 'reviews', label: 'Відгуки' },
    { key: 'settings', label: 'Налаштування' },
  ];

  return (
    <motion.div
      className="page account-page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ padding: isMobile ? '10px 0 32px' : '16px 0 40px' }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* HEADER */}
        <header
          className="surface"
          style={{
            padding: isMobile ? 12 : 16,
            borderRadius: 18,
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div
              style={{
                width: isMobile ? 42 : 50,
                height: isMobile ? 42 : 50,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 0 0, var(--turquoise), transparent 60%), var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: isMobile ? 18 : 20,
              }}
            >
              {(user.firstName || user.name || 'B')[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Мій акаунт</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
                {user.firstName || user.name || 'Користувач'}
              </div>
              {user.phone && (
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                  {user.phone}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn"
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid var(--surface-3)',
              background: 'transparent',
              color: 'var(--text-2)',
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Вийти
          </button>
        </header>

        {/* TABS */}
        <nav
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {tabs.map((t) => (
            <TabButton
              key={t.key}
              active={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
              ariaLabel={t.label}
            >
              {t.label}
            </TabButton>
          ))}
        </nav>

        {/* CONTENT */}
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
