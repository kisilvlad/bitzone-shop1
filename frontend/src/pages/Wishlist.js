// src/pages/Wishlist.jsx (або src/Wishlist.js)

import React, { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectWishlistItems, removeFromWishlist, clearWishlist } from '../redux/wishlistSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

// --- СТИЛІЗОВАНІ КОМПОНЕНТИ (ОНОВЛЕНО) ---

const WishlistGrid = styled(motion.div)`
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
  @media (min-width: 360px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (min-width: 820px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1100px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const WishlistCard = styled(motion.div)`
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  border: 1px solid var(--accent-pink); /* <-- ЗМІНЕНО: Було rgba(255,0,127,0.1) */
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  padding: 8px;
  display: flex;
  flex-direction: column;
`;

const CardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

const ImageContainer = styled.div`
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 1/1;
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  padding: 8px;
`;

const CardImage = styled(motion.img)`
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.1);
  }
`;

const CardTitle = styled.h3`
  font-family: 'Source Code Pro', monospace;
  font-size: 12px;
  text-align: center;
  margin-top: 8px;
  color: var(--accent-yellow); /* <-- ЗМІНЕНО */
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 34px;
`;

const CardPrice = styled.p`
  font-family: 'Source Code Pro', monospace;
  font-size: 13px;
  text-align: center;
  color: var(--accent-turquoise); /* <-- ЗМІНЕНО */
  font-weight: 700;
  margin-top: auto;
  padding-top: 4px;
`;

const DeleteButton = styled(motion.button)`
  width: 100%;
  padding: 8px;
  font-size: 10px;
  font-weight: 700;
  margin-top: 8px;
  background: rgba(255,0,127,0.1); // TODO: Замінити на змінну
  border: 1px solid var(--accent-pink); /* <-- ЗМІНЕНО */
  border-radius: 8px;
  color: var(--accent-pink); /* <-- ЗМІНЕНО */
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255,0,127,0.2); // TODO: Замінити на змінну
    color: var(--text-primary); /* <-- ЗМІНЕНО */
    box-shadow: 0 0 10px var(--shadow-btn-pink); /* <-- ЗМІНЕНО */
  }
`;
// --- ГОЛОВНИЙ КОМПОНЕНТ ---

export default function Wishlist() {
  const items = useSelector(selectWishlistItems);
  const dispatch = useDispatch();
  const hasItems = items.length > 0;

  const handleRemove = useCallback((id) => {
    if (window.confirm('Видалити товар з бажань?')) {
      dispatch(removeFromWishlist(id));
    }
  }, [dispatch]);
  
  const handleClear = useCallback(() => {
    if (window.confirm('Очистити весь список бажань?')) {
      dispatch(clearWishlist());
    }
  }, [dispatch]);
  
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 }
  };
  const stepVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } }
  };
  
  // --- 1. ПОВЕРТАЄМО СТАРИЙ ДИЗАЙН ДЛЯ "ПОРОЖНЬОЇ" СТОРІНКИ (ОНОВЛЕНО) ---
  if (!hasItems) {
    return (
        <section className="container">
            <motion.div
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              className="surface center" // <-- ЗМІНЕНО
              style={{
                padding: '48px 24px', // Адаптивний падінг
                minHeight: '50vh',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-card), 0 0 30px var(--shadow-btn-pink)', // <-- ЗМІНЕНО
                background: 'var(--surface-gradient)', // <-- ЗМІНЕНО
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'center'
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 0, left: 0, right: 0, height: '100%', 
                  background: 'linear-gradient(45deg, rgba(255,0,127,0.05), rgba(255,215,0,0.05))', 
                  pointerEvents: 'none',
                  '[data-theme="light"] &': {
                    background: 'linear-gradient(45deg, rgba(255,0,127,0.08), rgba(255,215,0,0.08))',
                  }
                }} 
              />
              <motion.div
                className="mono"
                style={{ 
                  fontFamily: "'Press Start 2P', cursive", 
                  color: 'var(--accent-pink)', /* <-- ЗМІНЕНО */
                  fontSize: 'clamp(1rem, 5vw, 1.2rem)', 
                  marginBottom: 16, 
                  textShadow: '0 0 10px var(--accent-pink)', /* <-- ЗМІНЕНО */
                  position: 'relative', 
                  zIndex: 1 
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Список бажань порожній 💔
              </motion.div>
              <p className="p" style={{ opacity: 0.8, marginBottom: 24, fontSize: 12, position: 'relative', zIndex: 1, color: 'var(--text-secondary)' }}> {/* <-- ЗМІНЕНО */}
                Додайте товари з каталогу, щоб створити свою мрію!
              </p>
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

  // --- 2. ЗАЛИШАЄМО НОВИЙ ДИЗАЙН ДЛЯ СТОРІНКИ З ТОВАРАМИ (ОНОВЛЕНО) ---
  return (
    <section className="container">
      <motion.h1
        className="h1 retro"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontSize: 'clamp(1.2rem, 5vw, 1.75rem)',
          marginBottom: 24,
          background: 'linear-gradient(45deg, var(--accent-pink), var(--accent-yellow))', /* <-- ЗМІНЕНО */
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px var(--shadow-btn-pink)', /* <-- ЗМІНЕНО */
          textAlign: 'center'
        }}
      >
        💖 Список бажань ({items.length})
      </motion.h1>

      <WishlistGrid
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {items.map((item) => (
            <WishlistCard
              key={item.id}
              variants={itemVariants}
              exit="exit"
              layout
            >
              <CardLink to={`/product/${item.id}`}>
                <ImageContainer>
                  <CardImage src={item.image} alt={item.name} />
                </ImageContainer>
                <CardTitle>{item.name}</CardTitle>
                <CardPrice>{formatPrice(Number(item.price) || 0)}</CardPrice>
              </CardLink>
              <DeleteButton
                onClick={() => handleRemove(item.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Видалити
              </DeleteButton>
            </WishlistCard>
          ))}
        </AnimatePresence>
      </WishlistGrid>

      <motion.button
        className="btn btn-outline" // Використовує глобальний стиль .btn-outline
        onClick={handleClear}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          width: '100%',
          maxWidth: '300px',
          margin: '32px auto 0',
          display: 'block'
        }}
      >
        🗑️ Очистити все
      </motion.button>
    </section>
  );
}