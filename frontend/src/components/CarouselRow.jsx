// frontend/src/components/CarouselRow.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';

function CarouselRow({ title, products, viewAllTo, isMobile, accentColor = 'var(--turquoise)', isLoading }) {
  const ref = React.useRef(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(true);

  // Компактніша картка на мобільних, більша — на ПК
  const itemWidth = isMobile ? '172px' : '240px';

  const updateNav = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 10);
    setCanNext(el.scrollLeft < maxScrollLeft - 10);
  }, []);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (!el) return;
    const delta = el.clientWidth * 0.8;
    el.scrollBy({ left: delta * dir, behavior: 'smooth' });
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => updateNav();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateNav);
    const t = setTimeout(updateNav, 150);
    return () => {
      clearTimeout(t);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateNav);
    };
  }, [products, isMobile, updateNav]);

  const itemsCount = products?.length || 0;
  const showArrows = !isMobile && itemsCount > 4;

  return (
    <div className="carousel-row">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 className="h2 mono" style={{ margin: 0, color: accentColor, textShadow: 'none' }}>
          {title}
        </h2>
        <Link to={viewAllTo} className="p" style={{ color: 'var(--turquoise)' }}>
          Переглянути всі →
        </Link>
      </div>

      <div style={{ position: 'relative' }}>
        {showArrows && (
          <>
            <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: '0 auto 0 0', width: 40, background: 'linear-gradient(90deg, rgba(10,10,10,0.9), transparent)', zIndex: 1, borderRadius: '8px 0 0 8px' }}/>
            <div aria-hidden style={{ pointerEvents: 'none', position: 'absolute', inset: '0 0 0 auto', width: 40, background: 'linear-gradient(270deg, rgba(10,10,10,0.9), transparent)', zIndex: 1, borderRadius: '0 8px 8px 0' }}/>
          </>
        )}

        <div
          ref={ref}
          className="no-scrollbar carousel-scroller"
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 12,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollPadding: '4px',
            padding: '4px 2px 10px'
          }}
        >
          {isLoading ? (
            <div className="p" style={{ opacity: 0.8, padding: '20px' }}>Завантаження товарів...</div>
          ) : itemsCount > 0 ? (
            <>
              {products.map((p) => (
                <div
                  key={p._id || p.id}
                  className={`carousel-card-wrap ${isMobile ? 'is-mobile' : 'is-desktop'}`}
                  data-variant="carousel"
                  style={{
                    flex: `0 0 ${itemWidth}`,
                    minWidth: 0,
                    scrollSnapAlign: 'start',
                    scrollSnapStop: 'always'
                  }}
                >
                  {/* ВАЖЛИВО: передаємо variant="carousel" і compact, плюс isMobile */}
                  <ProductCard product={p} variant="carousel" compact={isMobile} isMobile={isMobile} />
                </div>
              ))}

              <div
                className="carousel-card-wrap more-tile"
                style={{ flex: `0 0 ${itemWidth}`, minWidth: 0, scrollSnapAlign: 'start' }}
              >
                <Link
                  to={viewAllTo}
                  className="surface"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    textDecoration: 'none',
                    borderStyle: 'dashed',
                    borderColor: 'rgba(255,255,255,.2)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01))',
                    transition: 'all .2s ease',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--turquoise)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <span style={{ fontSize: 40, color: 'var(--turquoise)', lineHeight: 1 }}>→</span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--turquoise)',
                      fontSize: 13,
                      textAlign: 'center',
                      paddingTop: 8
                    }}
                  >
                    Більше товарів
                  </span>
                </Link>
              </div>
            </>
          ) : (
            <div className="p" style={{ opacity: 0.8, padding: '20px' }}>
              Поки що немає товарів у цій категорії.
            </div>
          )}
        </div>

        {showArrows && (
          <>
            <button
              aria-label="Назад"
              disabled={!canPrev}
              onClick={() => scrollBy(-1)}
              className="btn carousel-arrow"
              style={{
                position: 'absolute',
                top: '50%',
                left: -16,
                transform: 'translateY(-50%)',
                opacity: canPrev ? 1 : 0.3,
                zIndex: 2,
                width: 36,
                height: 36,
                minWidth: 'auto',
                padding: 0,
                cursor: canPrev ? 'pointer' : 'default'
              }}
            >
              ‹
            </button>
            <button
              aria-label="Вперед"
              disabled={!canNext}
              onClick={() => scrollBy(1)}
              className="btn carousel-arrow"
              style={{
                position: 'absolute',
                top: '50%',
                right: -16,
                transform: 'translateY(-50%)',
                opacity: canNext ? 1 : 0.3,
                zIndex: 2,
                width: 36,
                height: 36,
                minWidth: 'auto',
                padding: 0,
                cursor: canNext ? 'pointer' : 'default'
              }}
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CarouselRow;