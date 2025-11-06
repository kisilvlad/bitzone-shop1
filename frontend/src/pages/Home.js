// frontend/src/pages/Home.js
// Оновлена версія, яка робить точкові запити до бекенду для кожної категорії.
// ТАКОЖ ОНОВЛЕНО СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ
import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import CarouselRow from '../components/CarouselRow';

export default function Home() {
  // Окремий стан для кожної каруселі
  const [consoles, setConsoles] = useState([]);
  const [games, setGames] = useState([]);
  const [accessories, setAccessories] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // ---------- Адаптивність ----------
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  
  // ---------- Завантаження даних для каруселей з бекенду ----------
  useEffect(() => {
    const fetchHomeProducts = async () => {
      setIsLoading(true);
      try {
        // Робимо три паралельні запити до нашого розумного API
        const [consolesRes, gamesRes, accessoriesRes] = await Promise.all([
          axios.get('/api/products?types=consoles&limit=10'),
          axios.get('/api/products?types=games&limit=10'),
          axios.get('/api/products?types=accs&limit=10')
        ]);

        setConsoles(consolesRes.data.products || []);
        setGames(gamesRes.data.products || []);
        setAccessories(accessoriesRes.data.products || []);

      } catch (err) {
        console.error('Помилка завантаження товарів для головної сторінки:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomeProducts();
  }, []);
  
  // ---------- Швидкі категорії (HERO) ----------
  const quickCategories = [
    { label: 'PlayStation', to: '/products?platforms=sony', accent: 'var(--accent-yellow)',    img: '/assets/categories/playstation.png', alt: 'PlayStation' },
    { label: 'Xbox',        to: '/products?platforms=xbox', accent: 'var(--accent-green)',     img: '/assets/categories/xbox.png',        alt: 'Xbox' },
    { label: 'Nintendo',    to: '/products?platforms=nintendo', accent: 'var(--accent-pink)',      img: '/assets/categories/nintendo.png',    alt: 'Nintendo' },
    { label: 'Steam Deck',  to: '/products?platforms=steamdeck', accent: 'var(--accent-turquoise)', img: '/assets/categories/steamdeck.png',   alt: 'Steam Deck' },
  ];
  
  return (
    <>
      {/* HERO SECTION (ОНОВЛЕНО) */}
      <section>
        <div className="container">
          <div
            className="surface shimmer"
            style={{ 
              padding: isMobile ? '18px' : '24px', 
              borderRadius: 'var(--radius)', 
              boxShadow: 'var(--shadow-neon)', // Це тінь лише для темної теми
              position: 'relative', 
              overflow: 'hidden',
              // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
              '[data-theme="light"] &': {
                boxShadow: 'var(--shadow-card)', // Використовуємо звичайну тінь
              }
            }}
          >
            <div
              className="grid"
              style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(330px, 400px) 1fr', alignItems: 'start', gap: isMobile ? 14 : 18 }}
            >
              {/* Ліва колонка */}
              <div>
                <h1 className="h1 retro" style={{ color: 'var(--accent-yellow)', textShadow: '0 0 2px var(--accent-yellow)', marginTop: 0, marginBottom: 12 }}>
                  BiTZone
                </h1>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: isMobile ? 10 : 12 }}>
                  {quickCategories.map((c) => (
                    <CategoryCard key={c.label} item={c} />
                  ))}
                </div>
                {!isMobile && (
                  <div style={{ marginTop: 20 }}>
                    <Link
                      to="/products"
                      className="btn btn-green" // <-- ЗМІНЕНО: Використовуємо клас
                      style={{
                        display: 'inline-flex', 
                        gap: 10, 
                        padding: '12px 18px', 
                        borderRadius: 14, 
                        textDecoration: 'none', 
                        fontWeight: 900,
                        letterSpacing: 0.3, 
                        fontSize: 15,
                        // Всі стилі кольору/тіні тепер йдуть з .btn-green
                      }}
                    >
                      <span>Перейти в каталог</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Права колонка (ОНОВЛЕНО) */}
              <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src="/assets/bitzone-logo1.png"
                  alt="BitZone"
                  style={{ 
                    width: isMobile ? '88%' : '82%', 
                    imageRendering: 'pixelated', 
                    filter: 'drop-shadow(0 0 16px var(--accent-turquoise))', // <-- ЗМІНЕНО
                    animation: 'pulse 2s infinite',
                    // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
                    '[data-theme="light"] &': {
                      filter: 'drop-shadow(0 0 16px var(--accent-turquoise))', // Можна залишити, або прибрати
                    }
                  }}
                />
                <div style={{ marginTop: isMobile ? 8 : 10, textAlign: 'center' }}>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: isMobile ? 8 : 10, 
                    padding: isMobile ? '6px 10px' : '8px 14px', 
                    borderRadius: 9999, 
                    background: 'var(--surface-input)', // <-- ЗМІНЕНО
                    border: '1px solid var(--border-primary)', // <-- ЗМІНЕНО
                    backdropFilter: 'blur(4px)', 
                    boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,.06)', // <-- ЗМІНЕНО
                     // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
                    '[data-theme="light"] &': {
                       boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(0,0,0,.04)',
                       backdropFilter: 'none',
                    }
                  }}>
                    <span className="mono" style={{ fontWeight: 900, letterSpacing: 0.4, fontSize: isMobile ? 14 : 16, color: 'var(--accent-yellow)' }}>Придбай</span>
                    <span aria-hidden style={{ opacity: .7 }}>•</span>
                    <span className="mono" style={{ fontWeight: 900, letterSpacing: 0.4, fontSize: isMobile ? 14 : 16, color: 'var(--accent-turquoise)' }}>грай</span>
                    <span aria-hidden style={{ opacity: .7 }}>•</span>
                    <span className="mono" style={{ fontWeight: 900, letterSpacing: 0.4, fontSize: isMobile ? 14 : 16, color: 'var(--accent-pink)' }}>продавай!</span>
                  </div>
                </div>
                {isMobile && (
                  <div style={{ marginTop: 14 }}>
                    <Link
                      to="/products"
                      className="btn btn-green" // <-- ЗМІНЕНО: Використовуємо клас
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: '11px 16px', 
                        borderRadius: 14, 
                        textDecoration: 'none', 
                        fontWeight: 900, 
                        letterSpacing: 0.3, 
                        fontSize: 14,
                      }}
                    >
                      <span>Перейти в каталог</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ОНОВЛЕНІ СЕКЦІЇ КАРУСЕЛЕЙ */}
      <section style={{ marginTop: 40 }}>
        <div className="container">
          <CarouselRow
            title="Консолі"
            products={consoles}
            viewAllTo="/products?types=consoles"
            isMobile={isMobile}
            accentColor="var(--accent-yellow)" // <-- ЗМІНЕНО
            isLoading={isLoading}
          />
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="container">
          <CarouselRow
            title="Ігри"
            products={games}
            viewAllTo="/products?types=games"
            isMobile={isMobile}
            accentColor="var(--accent-turquoise)" // <-- ЗМІНЕНО
            isLoading={isLoading}
          />
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="container">
          <CarouselRow
            title="Аксесуари"
            products={accessories}
            viewAllTo="/products?types=accs"
            isMobile={isMobile}
            accentColor="var(--accent-green)" // <-- ЗМІНЕНО
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Відгуки (ОНОВЛЕНО) */}
      <section style={{ marginTop: 40, marginBottom: 40 }}>
        <div className="container">
          <h2 className="h2 mono" style={{ color: 'var(--accent-turquoise)', textAlign: 'center', marginBottom: 20 }}>
            Відгуки Наших Геймерів
          </h2>
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16 }}>
            {[
              { name: 'Олександр', text: 'Купив NES – ностальгія на повну! Доставка швидка.', rating: 5 },
              { name: 'Марія', text: 'PS5 з аксесуарами – все супер, рекомендую!', rating: 5 },
              { name: 'Іван', text: 'Ретро картриджі в ідеальному стані.', rating: 4 },
            ].map((rev, i) => (
              <div key={i} className="surface shimmer" style={{ padding: 20, borderRadius: 'var(--radius)' }}>
                <p className="p">{rev.text}</p>
                <div style={{ marginTop: 12, color: 'var(--accent-yellow)' }}>{'★'.repeat(rev.rating)}</div> {/* <-- ЗМІНЕНО */}
                <div className="mono" style={{ fontSize: 12, opacity: 0.8, marginTop: 8, color: 'var(--text-secondary)' }}>- {rev.name}</div> {/* <-- ЗМІНЕНО */}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// Плитка категорії (HERO) (ОНОВЛЕНО СТИЛІ)
function CategoryCard({ item }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setPos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  };

  const tiltX = (pos.y - 0.5) * -6;
  const tiltY = (pos.x - 0.5) * 6;

  // --- ДИНАМІЧНІ СТИЛІ ДЛЯ ТЕМ ---
  const [styles, setStyles] = useState({});
  
  useEffect(() => {
    // Цей код виконається при монтуванні та при зміні hover/pos
    // Він генерує стилі на основі поточного стану
    const highlight = `radial-gradient(${hover ? '140px 140px' : '0 0'} at ${Math.round(pos.x * 100)}% ${Math.round(pos.y * 100)}%, var(--highlight-color), transparent 60%)`;
    const borderGrad = `linear-gradient(var(--card-bg), var(--card-bg)) padding-box, linear-gradient(135deg, var(--highlight-border), ${item.accent}) border-box`;

    setStyles({
      '--highlight-color': hover ? 'rgba(255,255,255,.16)' : 'transparent',
      '--highlight-border': 'rgba(255,255,255,.26)',
      '--card-bg': 'var(--surface-primary)', // Використовуємо --surface-primary
      '--inset-shadow': 'inset 0 1px 0 rgba(255,255,255,.08), inset 0 -10px 22px rgba(0,0,0,.45)',
      '--overlay-bg': 'linear-gradient(55deg, rgba(255,255,255,.10), rgba(255,255,255,0) 38%)',
      '--overlay-opacity': hover ? 0.35 : 0.18,
      '--box-shadow': hover 
        ? `0 24px 44px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.05), 0 0 24px ${item.accent}26` 
        : '0 14px 28px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.05)',
      '--transform': hover ? `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(0) scale(1.01)` : 'scale(1)',
      backgroundImage: `${highlight}, ${borderGrad}`,
    });

  }, [hover, pos, item.accent, tiltX, tiltY]);

  return (
    <Link
      to={item.to}
      className="cat-card"
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, willChange: 'transform, box-shadow' }}
    >
      <div style={{ perspective: 800, width: '100%' }}>
        <div
          ref={ref}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onMouseMove={onMove}
          style={{
            ...styles, // Застосовуємо динамічні стилі
            width: '100%', 
            aspectRatio: '1 / 1', 
            borderRadius: 20, 
            overflow: 'hidden', 
            border: '1.5px solid transparent',
            backgroundOrigin: 'border-box',
            boxShadow: 'var(--box-shadow)',
            transform: 'var(--transform)',
            transition: 'transform .16s ease, box-shadow .2s ease, background-image .2s ease',
            position: 'relative', 
            display: 'grid', 
            placeItems: 'center',
            
            // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ (перевизначаємо змінні) ---
            '[data-theme="light"] &': {
              '--highlight-color': hover ? 'rgba(0,0,0,.06)' : 'transparent',
              '--highlight-border': 'rgba(0,0,0,.1)',
              '--card-bg': 'var(--surface-primary)', // Вже --surface-primary
              '--inset-shadow': 'inset 0 1px 0 rgba(0,0,0,.04), inset 0 -10px 22px rgba(0,0,0,.05)',
              '--overlay-bg': 'linear-gradient(55deg, rgba(0,0,0,.05), rgba(0,0,0,0) 38%)',
              '--overlay-opacity': hover ? 0.6 : 0.4,
              '--box-shadow': hover 
                ? `0 24px 44px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.05), 0 0 24px ${item.accent}30` 
                : '0 14px 28px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.05)',
            }
          }}
        >
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'var(--inset-shadow)' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'var(--overlay-bg)', opacity: 'var(--overlay-opacity)', mixBlendMode: 'soft-light', transition: 'opacity .2s ease' }} />
          <img
            src={item.img}
            alt={item.alt}
            style={{ 
              width: '66%', 
              height: '66%', 
              objectFit: 'contain', 
              imageRendering: 'auto', 
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35))', 
              transform: hover ? 'translateZ(0.01px)' : undefined,
              // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
              '[data-theme="light"] &': {
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.15))',
              }
            }}
          />
        </div>
      </div>
      <span
        className="mono"
        style={{ 
          fontWeight: 950, 
          color: 'var(--text-primary)', // <-- ЗМІНЕНО
          textShadow: '0 1px 2px rgba(0,0,0,.25)', 
          letterSpacing: 0.35, 
          fontSize: 'clamp(13px, 1.6vw, 15px)', 
          lineHeight: 1.1 
        }}
      >
        {item.label}
      </span>
    </Link>
  );
}