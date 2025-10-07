// src/components/Header.jsx - Оновлений з покращеною мобільною адаптивністю

// src/components/Header.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCartQty } from '../redux/cartSlice';
import { selectWishlistQty } from '../redux/wishlistSlice';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const cartQty = useSelector(selectCartQty);
  const wishlistQty = useSelector(selectWishlistQty);
  console.log('Wishlist Qty:', wishlistQty); // Дебаг
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const loc = useLocation();

  const onSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav(`/products?search=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const menuItems = [
    {
      label: 'Playstation',
      subItems: [
        { label: 'Playstation 5', link: '/products?category=ps5' },
        { label: 'Playstation 4', link: '/products?category=ps4' },
        { label: 'Playstation 3', link: '/products?category=ps3' },
        { label: 'Playstation 2', link: '/products?category=ps2' },
        { label: 'Playstation 1', link: '/products?category=ps1' },
        { label: 'PSP', link: '/products?category=psp' },
        { label: 'PS Vita', link: '/products?category=psvita' },
        { label: 'Аксесуари', link: '/products?category=ps_accessories' },
        { label: 'Ігри', link: '/products?category=ps_games' },
      ]
    },
    {
      label: 'Xbox',
      subItems: [
        { label: 'Xbox Series X/S', link: '/products?category=xbox_series' },
        { label: 'Xbox One', link: '/products?category=xbox_one' },
        { label: 'Xbox 360', link: '/products?category=xbox_360' },
        { label: 'Xbox', link: '/products?category=xbox' },
        { label: 'Аксесуари', link: '/products?category=xbox_accessories' },
        { label: 'Ігри', link: '/products?category=xbox_games' },
      ]
    },
    {
      label: 'Nintendo',
      subItems: [
        { label: 'Nintendo Switch', link: '/products?category=switch' },
        { label: 'Wii U', link: '/products?category=wiiu' },
        { label: 'Wii', link: '/products?category=wii' },
        { label: 'GameCube', link: '/products?category=gamecube' },
        { label: 'N64', link: '/products?category=n64' },
        { label: 'SNES', link: '/products?category=snes' },
        { label: 'NES', link: '/products?category=nes' },
        { label: 'DS/3DS', link: '/products?category=ds_3ds' },
        { label: 'GameBoy', link: '/products?category=gameboy' },
        { label: 'Аксесуари', link: '/products?category=nintendo_accessories' },
        { label: 'Ігри', link: '/products?category=nintendo_games' },
      ]
    },
    {
      label: 'Steam Deck',
      subItems: [
        { label: 'Steam Deck', link: '/products?category=steam_deck' },
        { label: 'Аксесуари', link: '/products?category=steam_accessories' },
      ]
    },
    {
      label: 'Retro',
      subItems: [
        { label: 'NES', link: '/products?category=retro_nes' },
        { label: 'SNES', link: '/products?category=retro_snes' },
        { label: 'Sega Genesis', link: '/products?category=retro_sega' },
        { label: 'Atari', link: '/products?category=retro_atari' },
        { label: 'Інші ретро', link: '/products?category=retro_other' },
        { label: 'Аксесуари', link: '/products?category=retro_accessories' },
        { label: 'Ігри', link: '/products?category=retro_games' },
      ]
    },
  ];

  // Variants for animations
  const mobileMenuVariants = {
    hidden: { opacity: 0, x: '100%' }, // Slide from right
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: '100%' }
  };

  const subItemVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeInOut' } },
    exit: { opacity: 0, x: -5, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  return (
    <header className="header">
      <div className="container nav">
        <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/assets/bitzone-logo2.gif" alt="Bit Zone" style={{ height: 'clamp(40px, 8vw, 80px)', width: 'auto', imageRendering: 'pixelated' }} />
          </Link>
          <span className="retro" style={{ fontSize: 'clamp(10px, 2vw, 14px)', opacity: 0.85 }}>BiTZone - Рівень на якому все можливо!</span>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden md:block menu-desktop">
          <ul style={{ display: 'flex', gap: 16, alignItems: 'center', listStyle: 'none' }}>
            {menuItems.map((item, index) => (
              <DesktopMenuItem key={index} item={item} />
            ))}
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <form onSubmit={onSearch} className="hidden md:block">
            <input
              className="input"
              style={{ width: 'clamp(200px, 20vw, 260px)' }} // Адаптивна ширина пошуку
              placeholder="Пошук..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>

          <Link to="/wishlist" className="btn btn-wish" style={{ position: 'relative', gap: 6, padding: 'clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 16px)', fontSize: 'clamp(10px, 2vw, 12px)', minWidth: 'clamp(100px, 15vw, 120px)', justifyContent: 'center' }}>
            Бажане
            <span className="badge cart-badge" style={{ position: 'absolute', top: -8, right: -8, display: 'inline-flex' }}>
              {wishlistQty}
            </span>
          </Link>

          <Link to="/cart" className="btn btn-green" style={{ position: 'relative', gap: 6, padding: 'clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 16px)', fontSize: 'clamp(10px, 2vw, 12px)', minWidth: 'clamp(100px, 15vw, 120px)', justifyContent: 'center' }}>
            Кошик
            <span className="badge cart-badge" style={{ position: 'absolute', top: -8, right: -8, display: 'inline-flex' }}>
              {cartQty}
            </span>
          </Link>

          {/* Pixelated Menu Button */}
          <motion.button
            className="btn-outline md:hidden pixel-menu-button"
            onClick={() => setOpen((v) => !v)}
            initial={false}
            animate={open ? 'open' : 'closed'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg width="30" height="30" viewBox="0 0 30 30" style={{ imageRendering: 'pixelated' }}>
              <Path
                variants={{
                  closed: { d: 'M 2 8 L 28 8' },
                  open: { d: 'M 5 25 L 25 5' }
                }}
              />
              <Path
                d="M 2 15 L 28 15"
                variants={{
                  closed: { opacity: 1 },
                  open: { opacity: 0 }
                }}
                transition={{ duration: 0.1 }}
              />
              <Path
                variants={{
                  closed: { d: 'M 2 22 L 28 22' },
                  open: { d: 'M 5 5 L 25 25' }
                }}
              />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu - Повноекранний drawer без скролу body */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="mobile-menu-overlay"
            onClick={() => setOpen(false)} // Закрити по кліку поза
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              style={{
                width: '100vw',
                height: '100vh',
                background: 'linear-gradient(180deg, rgba(10,10,10,0.95), rgba(20,20,20,0.95))',
                borderLeft: 'none', // Повноекранний
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto', // Скрол тільки в меню, якщо довге
                padding: 'clamp(20px, 5vw, 40px)',
                gap: 20
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/assets/bitzone-logo2.gif" alt="Bit Zone" style={{ height: 'clamp(30px, 6vw, 50px)', width: 'auto', imageRendering: 'pixelated' }} />
                </Link>
                <motion.button
                  onClick={() => setOpen(false)}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    width: 'clamp(30px, 6vw, 40px)',
                    height: 'clamp(30px, 6vw, 40px)'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--pink)">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </motion.button>
              </div>

              <form onSubmit={onSearch} style={{ marginBottom: 20, width: '100%' }}>
                <input
                  className="input"
                  placeholder="Пошук..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ width: '100%' }}
                />
              </form>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                {menuItems.map((item, index) => (
                  <MobileMenuItem key={index} item={item} subItemVariants={subItemVariants} setOpen={setOpen} />
                ))}
              </ul>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Link
                  to="/"
                  className="btn-outline"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    textAlign: 'center',
                    minWidth: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Домашня
                </Link>
                <Link
                  to="/wishlist"
                  className="btn-outline"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    textAlign: 'center',
                    minWidth: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Бажане ({wishlistQty})
                </Link>
                <Link
                  to="/cart"
                  className="btn btn-green"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    textAlign: 'center',
                    minWidth: '100%',
                  }}
                >
                  Кошик ({cartQty})
                </Link>
                <Link
                  to="/login"
                  className="btn-outline"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    textAlign: 'center',
                    minWidth: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Вхід
                </Link>
                <Link
                  to="/register"
                  className="btn btn-green"
                  style={{
                    color: '#ffffff',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                    textAlign: 'center',
                    minWidth: '100%',
                  }}
                >
                  Реєстрація
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Desktop Menu Item with Hover Animation
function DesktopMenuItem({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li
      className="menu-item"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="menu-label">{item.label}</span>
      {isOpen && (
        <ul className="submenu">
          {item.subItems.map((sub, subIndex) => (
            <li key={subIndex}>
              <Link to={sub.link}>{sub.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Mobile Menu Item with Accordion Animation
function MobileMenuItem({ item, subItemVariants, setOpen }) {
  const [subOpen, setSubOpen] = useState(false);

  const handleItemClick = (link) => {
    setOpen(false); // Закрити меню після кліку
    // nav(link); // Якщо потрібно, додай navigate
  };

  return (
    <li style={{ width: '100%' }}>
      <motion.div
        className="menu-label-mobile"
        onClick={() => setSubOpen(!subOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        {item.label} {subOpen ? '▲' : '▼'}
      </motion.div>
      <AnimatePresence>
        {subOpen && (
          <motion.ul
            style={{ listStyle: 'none', paddingLeft: 20, gap: 8, display: 'grid' }}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={subItemVariants}
            transition={{ duration: 0.3, staggerChildren: 0.05 }}
          >
            {item.subItems.map((sub, subIndex) => (
              <motion.li key={subIndex} variants={subItemVariants}>
                <Link
                  to={sub.link}
                  onClick={() => handleItemClick(sub.link)}
                  style={{
                    color: 'var(--yellow, #FFD700)',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: 'clamp(4px, 1vw, 8px) clamp(8px, 2vw, 12px)',
                    borderRadius: '4px',
                    transition: 'all 0.3s ease',
                    display: 'block',
                    fontSize: 'clamp(10px, 2vw, 12px)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {sub.label}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

// Animated SVG Path for Hamburger
const Path = props => (
  <motion.path
    fill="transparent"
    strokeWidth="3"
    stroke="var(--white)"
    strokeLinecap="round"
    {...props}
  />
);