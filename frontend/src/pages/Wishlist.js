// src/pages/Wishlist.js

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectWishlistItems, removeFromWishlist, clearWishlist } from '../redux/wishlistSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Wishlist() {
  const items = useSelector(selectWishlistItems);
  const dispatch = useDispatch();

  const hasItems = items.length > 0;

  // Стабілізований handler для видалення
  const handleRemove = useCallback((id, e) => {
    e.stopPropagation();
    if (window.confirm('Видалити товар з бажань?')) {
      dispatch(removeFromWishlist(id));
    }
  }, [dispatch]);

  // Стабілізований handler для очищення
  const handleClear = useCallback(() => {
    if (window.confirm('Очистити весь список бажань?')) {
      dispatch(clearWishlist());
    }
  }, [dispatch]);

  // Анімації (аналогічно Cart: slide-in, hover glow)
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }
  };

  const stepVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } }
  };

  const buttonVariants = {
    hover: { scale: 1.02, boxShadow: '0 0 20px currentColor', y: -2 },
    tap: { scale: 0.98, y: 0 }
  };

  if (!hasItems) {
    return (
      <section className="container">
        <motion.div
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          className="surface center"
          style={{ 
            padding: 48, 
            minHeight: '50vh', 
            borderRadius: 'var(--radius)', 
            boxShadow: 'var(--shadow-card), 0 0 30px rgba(255,0,127,0.1)',
            background: 'linear-gradient(180deg, rgba(26,26,26,0.8), rgba(12,12,12,0.8))',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(45deg, rgba(255,0,127,0.05), rgba(255,215,0,0.05))', pointerEvents: 'none' }} />
          <motion.div 
            className="mono" 
            style={{ color: 'var(--pink)', fontSize: 18, marginBottom: 16, textShadow: '0 0 10px var(--pink)', position: 'relative', zIndex: 1 }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Список бажань порожній 💔
          </motion.div>
          <p className="p" style={{ opacity: 0.8, marginBottom: 24, fontSize: 12, position: 'relative', zIndex: 1 }}>Додайте товари з каталогу, щоб створити свою мрію!</p>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <Link to="/products" className="btn btn-wish" style={{ padding: '12px 24px', fontSize: 12, position: 'relative', zIndex: 1 }}>
              ✨ Перейти до каталогу
            </Link>
          </motion.div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="container">
      <motion.h1 
        className="h1 retro" 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          marginBottom: 24, 
          background: 'linear-gradient(45deg, var(--pink), var(--yellow))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(255,0,127,0.5)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        💖 Список бажань ({items.length} товарів)
      </motion.h1>

      <motion.div
        variants={stepVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ position: 'relative' }}
      >
        <div className="grid grid-4" style={{ gap: 20 }}>
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                whileHover={{ y: -4, rotateY: 2, boxShadow: '0 8px 25px rgba(255,0,127,0.2)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, rgba(26,26,26,0.95), rgba(12,12,12,0.95))',
                  border: '1px solid rgba(255,0,127,0.2)',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-card), 0 0 10px rgba(255,0,127,0.05)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.3s ease',
                  zIndex: 1
                }}
              >
                {/* Badge для низької ціни або ретро (якщо є) */}
                {item.isRetro && (
                  <motion.span 
                    className="badge" 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ 
                      background: 'linear-gradient(180deg, var(--pink), var(--pink-2))',
                      color: 'var(--white)',
                      fontSize: 9,
                      padding: '4px 8px',
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 5
                    }}
                  >
                    RETRO
                  </motion.span>
                )}

                {/* Link на деталь товару */}
                <Link 
                  to={`/product/${item.id}`}
                  style={{ 
                    textDecoration: 'none', 
                    color: 'inherit', 
                    display: 'block', 
                    flex: 1,
                    pointerEvents: 'auto'
                  }}
                >
                  <div 
                    style={{ 
                      borderRadius: 12, 
                      overflow: 'hidden', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      background: 'linear-gradient(45deg, rgba(255,0,127,0.1), rgba(255,215,0,0.1))',
                      aspectRatio: '1/1',
                      transition: 'transform 0.3s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        imageRendering: 'pixelated',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  </div>
                  <motion.h3 className="h2 mono" style={{ fontSize: 12, margin: '8px 0 0 0', color: 'var(--yellow)', textShadow: '0 0 6px var(--yellow)', textAlign: 'center' }} whileHover={{ color: 'var(--turquoise)' }}>
                    {item.name}
                  </motion.h3>
                  <motion.div className="p" style={{ opacity: 0.9, fontSize: 11, textAlign: 'center', color: 'var(--turquoise)', fontWeight: 'bold', textShadow: '0 0 4px var(--turquoise)' }} whileHover={{ scale: 1.02 }}>
                    {formatPrice(Number(item.price) || 0)}
                  </motion.div>
                </Link>

                {/* Кнопка видалення */}
                <motion.button 
                  className="btn btn-outline" 
                  onClick={(e) => handleRemove(item.id, e)}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    fontSize: 10, 
                    background: 'rgba(255,0,127,0.1)', 
                    border: '1px solid var(--pink)',
                    borderRadius: '999px',
                    color: 'var(--pink)',
                    boxShadow: '0 2px 8px rgba(255,0,127,0.3)',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    zIndex: 10,
                    pointerEvents: 'auto'
                  }}
                >
                  ❤️ Видалити з бажань
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <motion.button
          className="btn btn-wish"
          onClick={handleClear}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          style={{ 
            width: '100%', 
            marginTop: 24, 
            padding: '12px', 
            fontSize: 12, 
            background: 'linear-gradient(180deg, var(--pink), var(--pink-2))',
            border: 'none',
            boxShadow: '0 4px 12px rgba(255,0,127,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            color: 'var(--white)',
            fontWeight: 'bold',
            borderRadius: '999px',
            zIndex: 10
          }}
        >
          🗑️ Очистити список бажань
        </motion.button>
      </motion.div>
    </section>
  );
}