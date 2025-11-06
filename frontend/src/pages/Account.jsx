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
  if (/paid|оплач/i.test(s))                     return { label: 'Оплачено',   color: '#00CED1' };
  if (/processing|в оброб/i.test(s))             return { label: 'В обробці',  color: '#FFD700' };
  if (/canceled|cancelled|скас/i.test(s))        return { label: 'Скасовано',  color: '#dc3545' };
  if (/pending|очіку/i.test(s))                  return { label: 'Очікує',     color: '#8A2BE2' };
  return { label: statusRaw || 'Невідомо', color: 'var(--text-3)' };
};

const niceDate = (d) => {
  try { return new Date(d).toLocaleDateString('uk-UA'); } catch { return d || ''; }
};

/* ====================== Shared UI ====================== */
const StarRating = ({ rating = 0 }) => (
  <div style={{ display: 'flex', gap: 2, color: 'var(--yellow)' }}>
    {[1,2,3,4,5].map((i) => <span key={i} style={{ fontSize: 16 }}>{i <= rating ? '★' : '☆'}</span>)}
  </div>
);

/** Segmented/Tab button with solid contrast in both themes.
 * ВАЖЛИВО: фолбек активного тексту тепер var(--white) (не чорний),
 * тож у темній темі завжди читабельно, а у світлій керується --seg-active-fg.
 */
const TabButton = ({ active, onClick, children, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className="btn tab-btn"
    aria-pressed={active}
    aria-label={ariaLabel}
    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick?.())}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 10px',
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: .3,
      borderRadius: 12,
      border: '1px solid',
      background: active
        ? 'var(--seg-active-bg, var(--turquoise))'
        : 'var(--seg-inactive-bg, var(--surface-0))',
      // ФОЛБЕКИ ОНОВЛЕНО: у темній — стане білим, у світлій — з theme-light.css
      color: active
        ? 'var(--seg-active-fg, var(--white))'
        : 'var(--seg-inactive-fg, var(--text-2))',
      borderColor: active ? 'transparent' : 'var(--border)',
      boxShadow: active
        ? '0 6px 18px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.45)'
        : 'var(--shadow-xs)',
      textShadow: 'none',
      outline: 'none',
      cursor: 'pointer'
    }}
  >
    <span style={{ pointerEvents: 'none' }}>{children}</span>
  </button>
);

/* ====================== Tabs content ====================== */
const OrdersTab = ({ token, isMobile }) => {
  const [orders, setOrders] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) return;
      setState({ loading: true, error: '' });
      try {
        const { data } = await axios.get('/api/users/my-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : (data?.orders || []));
          setState({ loading: false, error: '' });
        }
      } catch {
        if (!cancelled) setState({ loading: false, error: 'Не вдалося завантажити історію замовлень.' });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  if (state.loading)  return <p className="p center" style={{ color: 'var(--text-3)' }}>Завантаження замовлень…</p>;
  if (state.error)    return <p className="p center" style={{ color: 'var(--pink)' }}>{state.error}</p>;
  if (!orders.length) return <p className="p center" style={{ color: 'var(--text-3)' }}>У вас ще немає замовлень.</p>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {orders.map((order, i) => {
        const id = order.id || order._id || i + 1;
        const statusInfo = mapStatus(order.status);
        return (
          <Link key={id} to={`/account/orders/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <motion.div
              className="surface order-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: 'grid',
                gap: 10,
                padding: 14,
                borderLeft: `4px solid ${order.statusColor || statusInfo.color}`,
                alignItems: 'center',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr auto'
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Номер</div>
                <div className="mono" style={{ color: 'var(--text-1)', fontWeight: 800 }}>#{id}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Дата</div>
                <div style={{ color: 'var(--text-2)' }}>{niceDate(order.createdAt)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Статус</div>
                <div
                  className="badge"
                  style={{
                    background: 'transparent',
                    borderColor: `${order.statusColor || statusInfo.color}55`,
                    color: order.statusColor || statusInfo.color,
                    fontWeight: 800,
                    padding: '6px 10px'
                  }}
                >
                  {statusInfo.label}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Сума</div>
                <div className="price" style={{ fontWeight: 800 }}>{formatPrice(order.total || 0)}</div>
              </div>
              {!isMobile && <div style={{ justifySelf: 'end', opacity: .9, color: 'var(--turquoise)' }}>→</div>}
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};

const SettingsTab = ({ token, isMobile }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', birthday: '' });
  const [state, setState] = useState({ loading: true, error: '', success: '' });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) return;
      setState({ loading: true, error: '', success: '' });
      try {
        const { data } = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          setFormData({
            firstName: data?.firstName || '',
            lastName:  data?.lastName  || '',
            birthday:  data?.birthday ? String(data.birthday).split('T')[0] : ''
          });
          setState({ loading: false, error: '', success: '' });
        }
      } catch {
        if (!cancelled) setState({ loading: false, error: 'Не вдалося завантажити дані профілю.', success: '' });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  const onChange = (e) => setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setState((s) => ({ ...s, error: '', success: '' }));
    try {
      await axios.put('/api/users/me', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setState((s) => ({ ...s, success: 'Профіль успішно оновлено!' }));
    } catch {
      setState((s) => ({ ...s, error: 'Помилка оновлення. Спробуйте ще раз.' }));
    }
  };

  if (state.loading) return <p className="p center" style={{ color: 'var(--text-3)' }}>Завантаження…</p>;
  if (state.error)   return <p className="p center" style={{ color: 'var(--pink)' }}>{state.error}</p>;

  return (
    <motion.form
      onSubmit={onSubmit}
      className="settings-form"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'grid', gap: 14 }}
    >
      <h3 className="h2 retro" style={{ marginBottom: 6 }}>Особисті дані</h3>

      <div
        className="form-group-pair"
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'
        }}
      >
        <div>
          <label style={{ color: 'var(--text-2)' }}>Ім&apos;я</label>
          <input name="firstName" value={formData.firstName} onChange={onChange} className="input" />
        </div>
        <div>
          <label style={{ color: 'var(--text-2)' }}>Прізвище</label>
          <input name="lastName" value={formData.lastName} onChange={onChange} className="input" />
        </div>
      </div>

      <div>
        <label style={{ color: 'var(--text-2)' }}>Дата народження</label>
        <input type="date" name="birthday" value={formData.birthday} onChange={onChange} className="input" />
      </div>

      {state.success && (
        <p className="p center" style={{ color: 'var(--green)', margin: 0 }}>{state.success}</p>
      )}

      <button
        type="submit"
        className="btn btn-green"
        style={{ justifySelf: isMobile ? 'stretch' : 'start' }}
      >
        Зберегти зміни
      </button>
    </motion.form>
  );
};

const ReviewsTab = ({ token, isMobile }) => {
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!token) return;
      setState({ loading: true, error: '' });
      try {
        const { data } = await axios.get('/api/users/me/reviews', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled) {
          setReviews(Array.isArray(data) ? data : (data?.reviews || []));
          setState({ loading: false, error: '' });
        }
      } catch {
        if (!cancelled) setState({ loading: false, error: 'Не вдалося завантажити відгуки користувача.' });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [token]);

  if (state.loading)  return <p className="p center" style={{ color: 'var(--text-3)' }}>Завантаження відгуків…</p>;
  if (state.error)    return <p className="p center" style={{ color: 'var(--pink)' }}>{state.error}</p>;
  if (!reviews.length) return <p className="p center" style={{ color: 'var(--text-3)' }}>Ви ще не залишили жодного відгуку.</p>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {reviews.map((rev, i) => (
        <motion.div
          key={rev.id || i}
          className="surface"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          style={{ padding: 14 }}
        >
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: isMobile ? '48px 1fr' : '60px 1fr', alignItems: 'center' }}>
            <Link to={`/product/${rev.product?.id || rev.product?._id || ''}`} style={{ display: 'inline-block' }}>
              <img
                src={rev.product?.image}
                alt={rev.product?.name || 'Товар'}
                style={{
                  width: isMobile ? 48 : 60,
                  height: isMobile ? 48 : 60,
                  objectFit: 'contain',
                  borderRadius: 10,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)'
                }}
              />
            </Link>
            <div style={{ minWidth: 0 }}>
              <Link to={`/product/${rev.product?.id || rev.product?._id || ''}`} style={{ textDecoration: 'none' }}>
                <p className="p mono" style={{ margin: 0, color: 'var(--turquoise)', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rev.product?.name || 'Товар'}
                </p>
              </Link>
              <div style={{ marginTop: 6 }}>
                <StarRating rating={rev.rating} />
              </div>
            </div>
          </div>

          <p
            className="p"
            style={{
              marginTop: 12,
              color: 'var(--text-1)',
              borderLeft: `3px solid var(--turquoise)`,
              paddingLeft: 10,
              fontStyle: 'italic'
            }}
          >
            {rev.text}
          </p>

          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 10, textAlign: 'right' }}>
            {niceDate(rev.createdAt)}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

/* ====================== Page ====================== */
export default function Account() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { user, token, isAuthenticated } = useSelector((s) => s.auth);
  const isMobile = useIsMobile(820);

  const [activeTab, setActiveTab] = useState('orders');
  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);

  const onLogout = () => { dispatch(logout()); navigate('/'); };

  if (!user) return <p className="p center" style={{ color: 'var(--text-3)' }}>Завантаження профілю…</p>;

  const tabs = [
    { key: 'orders',   label: 'Замовлення' },
    { key: 'reviews',  label: 'Відгуки' },
    { key: 'settings', label: 'Налаштування' },
  ];

  const TabsControl = (
    <div
      className="surface"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6,
        padding: 6,
        borderRadius: 'var(--radius)',
        position: 'sticky',
        top: isMobile ? 70 : 0,
        zIndex: 5
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
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="container" style={{ paddingTop: 14 }}>
      <div className="account-layout" style={{ display: 'grid', gap: 16, gridTemplateColumns: isMobile ? '1fr' : '280px 1fr' }}>
        {/* Sidebar (desktop) */}
        {!isMobile && (
          <aside className="surface account-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="account-user-info" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              <h2 className="h2 mono" style={{ margin: 0, color: 'var(--text-1)' }}>{user.name}</h2>
              <p className="p" style={{ marginTop: 6, color: 'var(--text-3)', fontSize: 12 }}>{user.email}</p>
            </div>

            <nav className="account-nav" style={{ display: 'grid', gap: 8 }}>
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

            <button onClick={onLogout} className="btn btn-outline" style={{ marginTop: 'auto' }}>
              Вийти
            </button>
          </aside>
        )}

        {/* Content */}
        <main className="account-content" style={{ display: 'grid', gap: 14 }}>
          {isMobile && (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="surface" style={{ padding: 12, borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="h2 mono" style={{ margin: 0, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.name}
                    </h2>
                    <p className="p" style={{ margin: 0, color: 'var(--text-3)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </p>
                  </div>
                  <button onClick={onLogout} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }}>Вийти</button>
                </div>
              </div>
              {TabsControl}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'orders'   && <OrdersTab   token={token} isMobile={isMobile} />}
              {activeTab === 'reviews'  && <ReviewsTab  token={token} isMobile={isMobile} />}
              {activeTab === 'settings' && <SettingsTab token={token} isMobile={isMobile} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </motion.div>
  );
}
