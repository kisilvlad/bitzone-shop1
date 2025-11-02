// src/components/ProductCard.jsx
// !!! ФІНАЛЬНА ВЕРСІЯ З УСІМА ВИПРАВЛЕННЯМИ !!!

import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, selectCartItems } from '../redux/cartSlice';
import { toggleWishlistItem, selectWishlistItems } from '../redux/wishlistSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

/* ====================== helpers (без змін) ====================== */
const norm = (s) => (s ?? '').toString().trim().toLowerCase();
const looksGame = (p) => {
  const name = norm(p?.name);
  const cat  = norm(p?.category);
  return (
    cat.includes('гра') || cat.includes('game') || cat.includes('игра') ||
    name.includes('гра') || name.includes('game') || name.includes('игра')
  );
};

const deriveConditionFromName = (name = '') => {
  const s = norm(name);
  if (/(вживан|б\/?\s?в|бу|б\.в|б у|б\su|б\sy|бывш|подерж|used|pre[-\s]?owned|second hand)/i.test(s)) {
    return 'used';
  }
  if (/(нова(я|ий|е|і)?|новий|нове|new(?!\s?balance)|sealed|запакован|запечатан)/i.test(s)) {
    return 'new';
  }
  return null;
};

const looksAccessory = (p) => {
  const cat  = norm(p?.category);
  const name = norm(p?.name);
  return (
    cat.includes('аксес') || cat.includes('accessor') ||
    name.includes('аксес') || name.includes('accessor')
  );
};

/* ====================== Glassy square image box (ОНОВЛЕНО ДЛЯ ТЕМ) ====================== */
const GlassImageBox = ({ product, src, alt, lqip }) => {
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ w: 1, h: 1 });

  const isGame = looksGame(product);
  const isPortrait  = natural.h > natural.w * 1.06;
  const isLandscape = natural.w > natural.h * 1.06;
  
  let maxW = '88%';
  let maxH = '88%';

  if (isGame) {
    maxW = '72%';
    maxH = '94%';
  } else if (isPortrait) {
    maxW = '76%';
    maxH = '92%';
  } else if (isLandscape) {
    maxW = '94%';
    maxH = '78%';
  }

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid var(--border-primary)', 
        background: 'linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.035))', 
        boxShadow: '0 16px 32px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.09)', 
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        
        // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
        '[data-theme="light"] &': {
          background: 'linear-gradient(180deg, #FFFFFF, #FAFAFA)',
          boxShadow: '0 10px 25px rgba(0,0,0,.1), inset 0 1px 0 rgba(0,0,0,.04)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }
      }}
    >
      {lqip && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `url(${lqip}) center/cover no-repeat`,
            filter: 'blur(7px) saturate(1.08)',
            transform: 'scale(1.08)',
            opacity: 0.35
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(55deg, rgba(255,255,255,.10), rgba(255,255,255,0) 38%)',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
          '[data-theme="light"] &': {
            background: 'linear-gradient(55deg, rgba(0,0,0,.05), rgba(0,0,0,0) 38%)',
          }
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 10,
          borderRadius: 14,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0,0,0,.10)',
          '[data-theme="light"] &': {
            background: 'rgba(0,0,0,.03)',
          }
        }}
      >
        {/* !!! ОПТИМІЗАЦІЯ ЗОБРАЖЕНЬ !!! */}
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"     /* <--- 1. LAZY LOADING */
          decoding="async"   /* <--- 2. АСИНХРОННЕ ДЕКОДУВАННЯ */
          onLoad={(e) => {
            setLoaded(true);
            const img = e.currentTarget;
            if (img && img.naturalWidth && img.naturalHeight) {
              setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 0.985 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
          style={{
            maxWidth:  maxW,
            maxHeight: maxH,
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'center',
            imageRendering: 'auto',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.30))',
            '[data-theme="light"] &': {
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.15))',
            }
          }}
        />
      </div>
    </div>
  );
};

/* ====================== “Повідомити мене” (модалка) (ОНОВЛЕНО ДЛЯ ТЕМ) ====================== */
const NotifyModal = ({ product, onClose }) => {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone.trim() || status === 'sending') return;
    setStatus('sending');
    try {
      const cleaned = phone.replace(/\D/g, '');
      const normalizedPhone = cleaned.startsWith('0') ? `38${cleaned}` : cleaned;
      await axios.post('http://localhost:5000/api/orders/notify-me', {
        productId: product._id,
        productName: product.name,
        phone: normalizedPhone
      });
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
         // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
        '[data-theme="light"] &': {
          background: 'rgba(255,255,255,0.65)',
        }
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        className="surface"
        style={{
          padding: 22, width: 'min(420px, 92vw)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border-primary)', // <-- ЗМІНЕНО
          boxShadow: 'var(--shadow-card-hover)', // <-- ЗМІНЕНО
          background: 'var(--surface-gradient)', // <-- ЗМІНЕНО
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {status === 'success' ? (
          <>
            <h3 className="h2 mono" style={{ color: 'var(--text-primary)', margin: 0 }}>Дякуємо!</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{ marginTop: 10, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
              Повідомимо за номером <strong>{phone}</strong>, коли товар зʼявиться.
            </p>
            <button className="btn btn-green" style={{ marginTop: 18 }} onClick={onClose}>
              Закрити
            </button>
          </>
        ) : (
          <>
            <h3 className="h2 mono" style={{ color: 'var(--text-primary)', margin: 0 }}>Хочу цей товар</h3> {/* <-- ЗМІНЕНО */}
            <p className="p" style={{ marginTop: 10, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
              Вкажіть телефон — надішлемо сповіщення, як тільки буде в наявності.
            </p>
            <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
              <input
                type="tel"
                className="input"
                placeholder="380..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              {status === 'error' && (
                <p style={{ color: 'var(--accent-pink)', fontSize: 10, marginTop: 6 }}> {/* <-- ЗМІНЕНО */}
                  Сталася помилка. Спробуйте пізніше.
                </p>
              )}
              <motion.button
                type="submit"
                className="btn" // Використовує глобальний стиль .btn
                disabled={status === 'sending'}
                style={{ width: '100%', marginTop: 14 }}
                whileTap={{ scale: 0.97 }}
              >
                {status === 'sending' ? 'Надсилаємо…' : 'Повідомити мене'}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ====================== ProductCard (ОНОВЛЕНО) ====================== */
// !!! 3. ОБГОРТАЄМО В React.memo !!!
const ProductCard = React.memo(({ product, variant = 'grid', compact = false }) => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector(selectWishlistItems);
  const cartItems = useSelector(selectCartItems);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isCarousel = variant === 'carousel';
  const isCompact = compact || isCarousel;

  const isInWishlist = useMemo(
    () => wishlistItems.some((i) => i.id === product._id),
    [wishlistItems, product._id]
  );
  const isInCart = useMemo(
    () => cartItems.some((i) => i.id === product._id),
    [cartItems, product._id]
  );
  const isAvailable = useMemo(
    () => Number(product.stock) > 0 && Number(product.price) > 0,
    [product.stock, product.price]
  );
  const nameCond = deriveConditionFromName(product?.name);
  const condition = nameCond || (product?.condition === 'new' ? 'new' : product?.condition === 'used' ? 'used' : null);
  
  const getOptimizedImageUrl = (originalUrl, width = 800, quality = 82) => {
    if (!originalUrl) return '/assets/bitzone-logo1.png';
    return `http://localhost:5000/api/images?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}`;
  };

  const imgSrc = getOptimizedImageUrl(
    (product.images && product.images[0]) || product.image,
    800,
    82
  );
  
  const addToCartHandler = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    if (isAvailable && !isInCart) {
      dispatch(addToCart({
        id: product._id,
        name: product.name,
        price: Number(product.price) || 0,
        image: (product.images && product.images[0]) || product.image,
        qty: 1
      }));
    }
  }, [dispatch, isAvailable, isInCart, product]);
  
  const toggleWishlistHandler = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dispatch(toggleWishlistItem({
      id: product._id,
      name: product.name,
      price: Number(product.price) || 0,
      image: (product.images && product.images[0]) || product.image
    }));
  }, [dispatch, product]);
  
  // Анімації (ОНОВЛЕНО)
  const cardVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    hover:   { y: -2, boxShadow: 'var(--shadow-card-hover)', transition: { duration: 0.18, ease: 'easeInOut' } } 
  };
  
  // Стиль заголовку (ОНОВЛЕНО)
  const TITLE_STYLE = {
    fontSize: isCompact ? 'clamp(12px, 2.7vw, 13px)' : 'clamp(13px, 2.3vw, 15px)',
    lineHeight: 1.35,
    margin: 0,
    color: 'var(--text-primary)', // <-- ЗМІНЕНО
    textShadow: 'none',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  };
  
  // Чіп категорії (ОНОВЛЕНО)
  const categoryChip = product.category ? (
    <div
      style={{
        fontSize: isCompact ? 9.5 : 10.5,
        color: 'var(--text-secondary)', // <-- ЗМІНЕНО
        padding: isCompact ? '3px 7px' : '4px 8px',
        borderRadius: 999,
        border: '1px solid var(--border-primary)', // <-- ЗМІНЕНО
        background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))', 
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        maxWidth: isCompact ? 96 : 140,
        // --- СТИЛІ ДЛЯ СВІТЛОЇ ТЕМИ ---
        '[data-theme="light"] &': {
          background: 'var(--surface-input)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
        }
      }}
      title={product.category}
    >
      {String(product.category).toUpperCase()}
    </div>
  ) : null;

  return (
    <>
      <AnimatePresence>
        {isModalOpen && <NotifyModal product={product} onClose={() => setIsModalOpen(false)} />}
      </AnimatePresence>

      <motion.div
        className="card surface" // .card з index.css (має height: 100%, display: flex, flexDirection: column)
        data-variant={isCarousel ? 'carousel' : 'grid'}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        style={{
          // Всі основні стилі (.card, .surface) вже в index.css
          filter: !isAvailable ? 'grayscale(45%)' : 'none',
          opacity: !isAvailable ? 0.95 : 1
        }}
      >
        <AnimatePresence>
          {!isAvailable && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                position: 'absolute', top: 10, left: 10,
                padding: '6px 10px', fontSize: 10, fontWeight: 800,
                letterSpacing: 0.2, color: 'var(--text-on-accent-light)', 
                background: 'linear-gradient(180deg, var(--accent-red), var(--accent-red-dark))', 
                border: '1px solid var(--accent-red)', 
                borderRadius: 999,
                boxShadow: '0 6px 18px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.2)', 
                zIndex: 6
              }}
            >
              Немає в наявності
            </motion.span>
          )}
        </AnimatePresence>

        {condition && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute', top: 10, right: 10,
              padding: '6px 10px', fontSize: 10, fontWeight: 900,
              letterSpacing: 0.3, 
              borderRadius: 999,
              border: '1px solid rgba(0,0,0,.15)',
              boxShadow: '0 8px 18px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.35)',
              zIndex: 6,
              background: condition === 'used'
                ? 'linear-gradient(180deg, #7CFF7C, #42D742)' 
                : 'linear-gradient(180deg, var(--accent-yellow), var(--accent-yellow-dark))', 
              color: 'var(--text-on-accent-dark)'
            }}
          >
            {condition === 'used' ? 'Б/В' : 'НОВА'}
          </motion.span>
        )}

        {/* Квадратне фото-бокс */}
        <div style={{ padding: isCompact ? 10 : 12, paddingBottom: 0 }}>
          <Link
            to={isAvailable ? `/product/${product._id}` : '#'}
            style={{ display: 'block', pointerEvents: isAvailable ? 'auto' : 'none', cursor: isAvailable ? 'pointer' : 'default' }}
            aria-label={product.name}
          >
            <GlassImageBox product={product} src={imgSrc} alt={product.name} lqip={product.lqip} />
          </Link>
        </div>

        {/* !!! ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ (flexGrow: 1) !!! */}
        <div
          className="card-body"
          style={{
            padding: isCompact ? '10px 10px 12px' : '12px 12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: isCompact ? 8 : 10,
            flexGrow: 1 // <--- 4. Цей рядок змушує .card-body заповнити весь вільний простір
          }}
        >
          <Link
            to={isAvailable ? `/product/${product._id}` : '#'}
            style={{ textDecoration: 'none', pointerEvents: isAvailable ? 'auto' : 'none', cursor: isAvailable ? 'pointer' : 'default' }}
          >
            <h3 className="h2 mono" style={TITLE_STYLE}>{product.name}</h3>
          </Link>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: isCompact ? 6 : 8
            }}
          >
            <div
              style={{
                color: 'var(--text-primary)', 
                fontWeight: 800,
                fontSize: isCompact ? 'clamp(12px, 2.9vw, 13px)' : 'clamp(13px, 2.3vw, 14px)',
                textShadow: 'none'
              }}
            >
              {formatPrice(Number(product.price) || 0)}
            </div>
            {categoryChip}
          </div>

          {/* !!! ГОЛОВНЕ ВИПРАВЛЕННЯ ТУТ (marginTop: 'auto') !!! */}
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            {isAvailable ? (
              <>
                <motion.button
                  className={`btn btn-green ${isInCart ? 'in-cart' : ''}`}
                  onClick={addToCartHandler}
                  disabled={isInCart}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1,
                    padding: isCompact ? '8px 10px' : '10px 12px',
                    fontSize: isCompact ? 11.5 : 12,
                    minHeight: 34,
                    height: 34, 
                    opacity: isInCart ? 0.7 : 1,
                    cursor: isInCart ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isInCart ? '✓ У кошику' : 'В кошик'}
                </motion.button>

                <motion.button
                  className={`btn btn-wish ${isInWishlist ? 'active' : ''}`}
                  onClick={toggleWishlistHandler}
                  animate={isInWishlist ? { scale: [1, 1.08, 1] } : {}}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    width: 36,
                    height: 34,
                    minHeight: 34, 
                    padding: 0,
                    background: isInWishlist 
                      ? 'linear-gradient(180deg, var(--accent-pink), var(--accent-pink-dark))' 
                      : 'var(--surface-input)', 
                    borderColor: isInWishlist 
                      ? 'var(--accent-pink)' 
                      : 'var(--border-input)', 
                    borderRadius: 10,
                    fontWeight: 800,
                    color: isInWishlist ? 'var(--text-on-accent-light)' : 'var(--text-secondary)' 
                  }}
                  aria-label="Обране"
                >
                  {isInWishlist ? '♥' : '♡'}
                </motion.button>
              </>
            ) : (
              <motion.button
                className="btn btn-outline"
                style={{
                  width: '100%',
                  borderColor: 'var(--accent-yellow)', 
                  color: 'var(--accent-yellow)', 
                  padding: isCompact ? '8px 10px' : '10px 12px',
                  minHeight: 34,
                  height: 34, 
                  fontSize: isCompact ? 11.5 : 12,
                  fontWeight: 700
                }}
                onClick={() => setIsModalOpen(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                Повідомити
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
});

export default ProductCard;