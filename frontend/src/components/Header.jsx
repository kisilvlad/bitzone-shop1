// src/components/Header.jsx — !!! ФІНАЛЬНА ВЕРСІЯ: ПЛАВНА АНІМАЦІЯ + ПРАВИЛЬНИЙ Z-INDEX !!!

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartQty } from '../redux/cartSlice';
import { selectWishlistQty } from '../redux/wishlistSlice';
import { logout } from '../redux/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../hooks/useTheme';

export default function Header() {
  const cartQty = useSelector(selectCartQty);
  const wishlistQty = useSelector(selectWishlistQty);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  
  // ——— Плавне приховування/поява хедера під час скролу
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const headerRef = useRef(null); // <--- 1. Реф для хедера
  const [headerHeight, setHeaderHeight] = useState(80); // <--- 2. Стан для висоти хедера

  useEffect(() => {
    // 3. Вимірюємо висоту хедера
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
    
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScrollY && current > 60) setShowHeader(false);
      else setShowHeader(true);
      setLastScrollY(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  // ——— Закривати мобільне меню при зміні маршруту
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  
  // ——— Закривати по ESC
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  
  // ——— Видимість назви на мобільних/ПК через matchMedia
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  
  // ——— Desktop breakpoint (>=1024px)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  
  // ——— Тема (dark/light) через хук
  const [theme, toggleTheme] = useTheme();
  
  // ——— Обробники
  const handleLogout = () => {
    dispatch(logout());
    setOpen(false);
    nav('/');
  };
  const onSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/products?search=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };
  
  // ——— Дані меню
  const menuItems = [
    { label: 'Playstation', subItems: [
      { label: 'Playstation 5', link: '/products?search=Playstation 5&types=consoles' },
      { label: 'Playstation 4', link: '/products?search=Playstation 4&types=consoles' },
      { label: 'PSP / PS Vita', link: '/products?search=PSP&types=consoles' },
      { label: 'Аксесуари', link: '/products?platforms=sony&types=accs' },
      { label: 'Ігри', link: '/products?platforms=sony&types=games' },
    ]},
    { label: 'Xbox', subItems: [
      { label: 'Xbox Series X/S', link: '/products?search=Xbox Series&types=consoles' },
      { label: 'Xbox One', link: '/products?search=Xbox One&types=consoles' },
      { label: 'Xbox 360', link: '/products?search=Xbox 360&types=consoles' },
      { label: 'Аксесуари', link: '/products?platforms=xbox&types=accs' },
      { label: 'Ігри', link: '/products?platforms=xbox&types=games' },
    ]},
    { label: 'Nintendo', subItems: [
      { label: 'Nintendo Switch', link: '/products?search=Nintendo Switch&types=consoles' },
      { label: 'DS/3DS', link: '/products?search=Nintendo 3DS&types=consoles' },
      { label: 'GameBoy', link: '/products?search=GameBoy&types=consoles' },
      { label: 'Аксесуари', link: '/products?platforms=nintendo&types=accs' },
      { label: 'Ігри', link: '/products?platforms=nintendo&types=games' },
    ]},
    { label: 'Steam Deck', compact: true, subItems: [
      { label: 'Консолі', link: '/products?platforms=steamdeck&types=consoles' },
      { label: 'Аксесуари', link: '/products?platforms=steamdeck&types=accs' },
    ]},
  ];
  
  // ——— Блокування скролу фону
  useEffect(() => {
    document.body.classList.toggle('menu-open', open && !isDesktop);
    document.body.style.overflow = open && !isDesktop ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; document.body.classList.remove('menu-open'); };
  }, [open, isDesktop]);
  
  // ——— Стиль назви
  const brandNameStyle = {
    fontFamily: 'Russo One, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    lineHeight: 1,
    fontSize: 'clamp(24px, 5vw, 44px)',
    letterSpacing: '0.5px',
    color: 'var(--brand-text)',
    textShadow: '0 1px 2px rgba(0,0,0,.25)',
    filter: 'drop-shadow(0 0 0.35px rgba(0,0,0,.25))',
  };

  // --- Анімація мобільного меню (плавна) ---
  const mobileMenuVariants = {
    closed: {
      y: '-100%', // Починаємо над екраном
      opacity: 0,
      transition: { duration: 0.3, ease: [0.32, 0, 0.67, 0] } // Ease-in
    },
    open: {
      y: '0%', // З'являємося на екрані
      opacity: 1,
      transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] } // Ease-out
    }
  };
  
  return (
    <>
      {/* Overlay для мобільного меню */}
      <AnimatePresence>
        {open && !isDesktop && (
          <motion.div
            className="menu-overlay" // z-index: 990
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* 4. Додаємо ref до хедера */}
      <header ref={headerRef} className={`header ${showHeader ? 'header-show' : 'header-hide'}`}>
        <div
          className="container nav"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginLeft: isDesktop ? 7 : 0 }}
        >
          {/* ——— Бренд: гіфка + назва */}
          <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
            <Link
              to="/"
              className="brand-link"
              aria-label="BitZone — на головну"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
            >
              <img
                src="/assets/bitzone-logo2.gif"
                alt="BitZone"
                className="brand-logo"
                style={{ height: 76, width: 'auto', imageRendering: 'pixelated' }}
              />
              <span className="brand-name" style={{ ...brandNameStyle, display: isMobile ? 'none' : 'inline' }}>
                BitZone
              </span>
            </Link>
          </div>

          {/* ——— Desktop меню */}
          <nav className="menu-desktop" aria-label="Головне меню" style={{ display: isMobile ? 'none' : 'block' }}>
            <ul style={{ display: 'flex', gap: 16, alignItems: 'center', listStyle: 'none', margin: 0, padding: 0 }}>
              {menuItems.map((item, index) => (
                <DesktopMenuItem key={index} item={item} addSep={index > 0} />
              ))}
            </ul>
          </nav>

          {/* ——— Правий блок: пошук / бажане / кошик / бургер */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 10 : 12, flexWrap: 'nowrap' }}>
            {!isMobile && (
              <form onSubmit={onSearch}>
                <input
                  className="input"
                  style={{ width: 260 }}
                  placeholder="Пошук..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Пошук по товарам"
                />
              </form>
            )}

            <Link
              to="/wishlist"
              className="btn btn-wish"
              style={{ position: 'relative', gap: 6, padding: '10px 16px', fontSize: 12, minWidth: 120, justifyContent: 'center' }}
            >
              Бажане
              <span className="badge cart-badge" style={{ position: 'absolute', top: -8, right: -8, display: 'inline-flex' }}>
                {wishlistQty}
              </span>
            </Link>

            <Link
              to="/cart"
              className="btn btn-green"
              style={{ position: 'relative', gap: 6, padding: '10px 16px', fontSize: 12, minWidth: 120, justifyContent: 'center' }}
            >
              Кошик
              <span className="badge cart-badge" style={{ position: 'absolute', top: -8, right: -8, display: 'inline-flex' }}>
                {cartQty}
              </span>
            </Link>

            {isDesktop && (
              <>
                <Link
                  to={isAuthenticated ? "/account" : "/login"}
                  className="btn-profile"
                  aria-label={isAuthenticated ? "Перейти в профіль" : "Увійти"}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: 2,
                      borderRadius: '9999px',
                      background: 'linear-gradient(135deg, var(--accent-turquoise), var(--accent-purple))',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '9999px',
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-input)',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 2.91-8 6.5 0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5 0-3.59-3.582-6.5-8-6.5z"
                        />
                      </svg>
                    </span>
                  </span>
                </Link>
                <ThemeToggle theme={theme} onToggle={toggleTheme} variant="desktop" />
              </>
            )}

            {/* Кнопка-бургер тепер має zIndex 992 (вище за меню) */}
            <motion.button
              className="btn-outline pixel-menu-button"
              style={{ 
                display: isDesktop ? 'none' : 'inline-flex', 
                zIndex: 992, // <--- НАЙВИЩИЙ Z-INDEX
                color: 'var(--header-icon-stroke)' 
              }}
              onClick={() => setOpen((v) => !v)}
              initial={false}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Відкрити меню"
              aria-expanded={open}
              aria-controls="mobile-menu-panel"
            >
              <svg width="30" height="30" viewBox="0 0 30 30" role="img" aria-hidden="true">
                <Path variants={{ closed: { d: 'M 2 8 L 28 8' }, open: { d: 'M 5 25 L 25 5' } }} animate={open ? 'open' : 'closed'} />
                <Path
                  d="M 2 15 L 28 15"
                  variants={{ closed: { opacity: 1 }, open: { opacity: 0 } }}
                  animate={open ? 'open' : 'closed'}
                  transition={{ duration: 0.12 }}
                />
                <Path variants={{ closed: { d: 'M 2 22 L 28 22' }, open: { d: 'M 5 5 L 25 25' } }} animate={open ? 'open' : 'closed'} />
              </svg>
            </motion.button>
          </div>
        </div>
        
        {/* !!! МЕНЮ БУЛО ТУТ, АЛЕ МИ ЙОГО ВИНЕСЛИ !!! */}
        
      </header>

      {/* !!! МЕНЮ ТЕПЕР ТУТ, ПІСЛЯ ХЕДЕРА !!! */}
      <AnimatePresence>
        {open && !isDesktop && (
          <motion.div
            id="mobile-menu-panel"
            className="mobile-menu" // Цей клас додає 'position: fixed' та z-index: 991
            key="mobile-menu"
            initial="closed"
            animate="open"
            exit="closed"
            variants={mobileMenuVariants}
            style={{
              overflow: 'hidden',
              // 5. Динамічно встановлюємо 'top' рівним висоті хедера
              top: `${headerHeight}px`, 
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              display: isDesktop ? 'none' : 'block',
              // zIndex: 991 (прийде з .mobile-menu в index.css)
            }}
            aria-hidden={!open}
          >
            {/* Обгортка для скролу */}
            <div 
              style={{ 
                // 6. Висота тепер 'auto', але не більше ніж висота екрану мінус хедер
                maxHeight: `calc(100vh - ${headerHeight}px)`, 
                overflowY: 'auto',
                // paddingTop: '80px', // <--- БІЛЬШЕ НЕ ПОТРІБЕН
              }}
              className="no-scrollbar"
            >
              <div className="container" style={{ padding: '12px 0' }}>
                
                <form onSubmit={onSearch} style={{ marginBottom: 12 }}>
                  <input className="input" placeholder="Пошук..." value={q} onChange={(e) => setQ(e.target.value)} />
                </form>

                <motion.ul
                  style={{ listStyle: 'none', display: 'grid', gap: 10, margin: 0, padding: 0 }}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {menuItems.map((item, index) => (
                    <motion.li key={index} custom={index} variants={subItemVariants}>
                      <MobileMenuItem item={item} />
                    </motion.li>
                  ))}
                </motion.ul>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-primary)',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Тема</span>
                  <ThemeToggle theme={theme} onToggle={toggleTheme} variant="mobile" />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginTop: 16,
                    paddingBottom: 12,
                    borderTop: '1px solid var(--border-primary)',
                    paddingTop: 16,
                  }}
                >
                  {isAuthenticated ? (
                    <>
                      <Link to="/account" className="btn-account" style={{ fontSize: 12, padding: 8 }}>
                        👤 Профіль
                      </Link>
                      <button onClick={handleLogout} className="btn-logout" style={{ fontSize: 12, padding: 8 }}>
                        Вийти
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="btn-login" style={{ fontSize: 12, padding: 8 }}>
                        Вхід
                      </Link>
                      <Link to="/register" className="btn-register" style={{ fontSize: 12, padding: 8 }}>
                        Реєстрація
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ... (DesktopMenuItem, MobileMenuItem, ThemeToggle, subItemVariants, Path - БЕЗ ЗМІН) ...
function DesktopMenuItem({ item, addSep = false }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <li
      className="menu-item"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{
        position: 'relative',
        paddingLeft: addSep ? 12 : 0,
        marginLeft: addSep ? 10 : 0,
        borderLeft: addSep ? '1px solid var(--border-input)' : 'none',
      }}
    >
      <span
        className="menu-label" // Стилі для .menu-label будуть в index.css
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: item.compact ? 'nowrap' : undefined, fontSize: item.compact ? 13 : undefined }}
      >
        {item.label}
      </span>
      {isOpen && (
        <ul
          className="submenu" // Стилі для .submenu будуть в index.css
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            listStyle: 'none',
            margin: 0,
            padding: '10px 12px',
            background: 'var(--surface-primary)', // Використовує CSS змінну
            borderRadius: 12,
            boxShadow: 'var(--shadow-card-hover)', // Використовує CSS змінну
            display: 'grid',
            gap: 6,
            minWidth: 220,
            zIndex: 50,
          }}
        >
          {item.subItems.map((sub, subIndex) => (
            <li key={subIndex}>
              <Link to={sub.link} className="submenu-link"> {/* Додамо клас для CSS */}
                {sub.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function MobileMenuItem({ item }) {
  const [subOpen, setSubOpen] = useState(false);
  return (
    <li>
      <motion.div
        className="menu-label-mobile" // Стилі для .menu-label-mobile будуть в index.css
        onClick={() => setSubOpen(!subOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ cursor: 'pointer', fontWeight: 700 }}
      >
        {item.label} {subOpen ? '▲' : '▼'}
      </motion.div>
      <AnimatePresence>
        {subOpen && (
          <motion.ul
            style={{ listStyle: 'none', paddingLeft: 20, gap: 8, display: 'grid', margin: 0 }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {item.subItems.map((sub, subIndex) => (
              <li key={subIndex}>
                <Link
                  to={sub.link}
                  style={{
                    color: 'var(--accent-yellow)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: 4,
                    display: 'block',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {sub.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function ThemeToggle({ theme, onToggle, variant = 'desktop' }) {
  const isDark = theme === 'dark';
  
  const dims = variant === 'mobile'
    ? { trackW: 62, trackH: 30, pad: 3, knob: 24, decoPad: 9 }
    : { trackW: 74, trackH: 34, pad: 4, knob: 26, decoPad: 10 };

  const colors = {
    trackBg: 'var(--surface-input)',
    trackBorder: 'var(--border-input)',
    knobBg: 'var(--surface-primary)',
    knobIcon: 'var(--text-primary)',
  };

  const knobX = isDark ? dims.trackW - 2 * dims.pad - dims.knob : 0;
  
  return (
    <div
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      role="switch"
      aria-checked={isDark}
      tabIndex={0}
      aria-label="Перемикач теми"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: variant === 'mobile' ? 8 : 10,
        marginLeft: variant === 'mobile' ? 6 : 10,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title={isDark ? 'Темна тема' : 'Світла тема'}
    >
      <motion.div
        className="theme-toggle-track"
        style={{
          position: 'relative',
          width: dims.trackW,
          height: dims.trackH,
          borderRadius: 9999,
          padding: dims.pad,
          background: colors.trackBg,
          border: `1px solid ${colors.trackBorder}`,
          boxShadow: `inset 0 2px 10px rgba(0,0,0,.06)`,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Декор: сонце ліворуч, місяць праворуч */}
        <div style={{ position: 'absolute', left: dims.decoPad, top: '50%', transform: 'translateY(-50%)', opacity: isDark ? 0.5 : 0.9 }}>
          <svg width="12" height="12" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" fill={colors.knobIcon} />
          </svg>
        </div>
        <div style={{ position: 'absolute', right: dims.decoPad, top: '50%', transform: 'translateY(-50%)', opacity: isDark ? 0.9 : 0.55 }}>
          <svg width="12" height="12" viewBox="0 0 24 24">
            <path fill={colors.knobIcon} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>

        {/* Рухомий повзунок */}
        <motion.div
          style={{
            position: 'absolute',
            top: dims.pad,
            left: dims.pad,
            width: dims.knob,
            height: dims.knob,
            borderRadius: 9999,
            display: 'grid',
            placeItems: 'center',
            background: colors.knobBg,
            color: colors.knobIcon,
            boxShadow: `0 8px 18px rgba(0,0,0,.18)`,
            border: `1px solid ${colors.trackBorder}`,
          }}
          animate={{ x: knobX }}
          transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="1.6">
                <line x1="12" y1="1" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="1" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="23" y2="12" />
                <line x1="4.2" y1="4.2" x2="6.9" y2="6.9" />
                <line x1="17.1" y1="17.1" x2="19.8" y2="19.8" />
                <line x1="17.1" y1="6.9" x2="19.8" y2="4.2" />
                <line x1="4.2" y1="19.8" x2="6.9" y2="17.1" />
              </g>
            </svg>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

const subItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.25, ease: 'easeOut' } }),
  exit: { opacity: 0, y: 5, transition: { duration: 0.15, ease: 'easeIn' } },
};
const Path = (props) => (
  <motion.path
    fill="transparent"
    strokeWidth="3"
    stroke="var(--header-icon-stroke, currentColor)"
    strokeLinecap="round"
    {...props}
  />
);