// src/components/ProductCard.jsx

import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/cartSlice';
import { toggleWishlistItem } from '../redux/wishlistSlice';
import { selectWishlistItems } from '../redux/wishlistSlice';
import { selectCartItems } from '../redux/cartSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const wishlistItems = useSelector(selectWishlistItems);
  const cartItems = useSelector(selectCartItems);

  // Стабільні обчислення для уникнення зайвих ререндерів
  const isInWishlist = useMemo(() => wishlistItems.some(item => item.id === product._id), [wishlistItems, product._id]);
  const isInCart = useMemo(() => cartItems.some(item => item.id === product._id), [cartItems, product._id]);
  const hasStock = useMemo(() => product.stock === undefined || product.stock > 0, [product.stock]);

  const addToCartHandler = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInCart && hasStock) {
      console.log('Adding to cart:', product._id); // Дебаг для перевірки в консолі
      dispatch(addToCart({
        id: product._id,
        name: product.name,
        price: Number(product.price) || 0, // Безпечне приведення до number
        image: product.images ? product.images[0] : product.image,
        qty: 1 // Явно встановлюємо qty для стабільності в Redux
      }));
    }
  }, [dispatch, isInCart, hasStock, product]);

  const toggleWishlistHandler = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggling wishlist:', product._id); // Дебаг
    dispatch(toggleWishlistItem({
      id: product._id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.images ? product.images[0] : product.image
    }));
  }, [dispatch, product]);

  // Анімації картки (тільки для загального hover, кнопки окремо)
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4, ease: 'easeOut' } 
    },
    hover: { 
      scale: 1.02, 
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      transition: { duration: 0.2, ease: 'easeInOut' }
    }
  };

  // Анімація успіху для кошика (пульс з неоновим glow)
  const successPulse = {
    scale: [1, 1.1, 1],
    boxShadow: [
      '0 4px 8px rgba(0,0,0,0.2)',
      '0 0 20px var(--green), 0 0 30px var(--green)',
      '0 4px 8px rgba(0,0,0,0.2)'
    ],
    transition: { duration: 0.4, ease: 'easeInOut' }
  };

  // Анімація для бажаного (ротація + glow з pixelated ефектом)
  const wishlistPulse = {
    scale: [1, 1.2, 1],
    rotate: [0, 180, 360],
    boxShadow: [
      '0 2px 8px rgba(255,0,127,0.3)',
      '0 0 25px var(--pink), 0 0 35px var(--pink)',
      '0 2px 8px rgba(255,0,127,0.3)'
    ],
    transition: { duration: 0.6, ease: 'easeInOut' }
  };

  // Візуальні іконки: мінімальні символи для чистоти (без смайликів, як у профі UI)
  const CartIcon = isInCart ? '✓' : (hasStock ? '+' : '✗');
  const HeartIcon = isInWishlist ? '♥' : '♡'; // ♥ filled (червоний, але з білим glow), ♡ outline (сірий)

  // Badge для condition: текстовий, без заливки, top-right, малий шрифт
  const ConditionBadge = () => (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'transparent',
        color: product.condition === 'new' ? 'var(--green)' : '#ff9800', // Змінений колір для вживаного
        fontSize: 8, // Малий шрифт
        fontWeight: 'bold',
        textShadow: '0 0 3px currentColor', // Легкий glow без заливки
        padding: 0,
        zIndex: 5
      }}
    >
      {product.condition === 'new' ? 'Новий' : 'Б/В'}
    </motion.span>
  );

  return (
    <motion.div 
      className="card surface shimmer"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{ 
        height: 'auto', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--radius)',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Badge з анімацією входу/виходу — прибрано RETRO */}
      <AnimatePresence>
        {!hasStock && (
          <motion.span 
            className="badge" 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{ 
              background: 'linear-gradient(180deg, #666, #444)',
              color: 'var(--white)',
              fontSize: 10,
              padding: '6px 10px',
              top: 12,
              left: 12,
              zIndex: 5
            }}
          >
            Out of Stock
          </motion.span>
        )}
        {product.condition && <ConditionBadge />}
      </AnimatePresence>

      {/* Image з анімацією hover тільки на img */}
      <div 
        className="card-img" 
        style={{ 
          height: 200, 
          position: 'relative',
          background: 'linear-gradient(180deg, #211733, #0B0B0B)',
          borderBottom: '1px dashed rgba(255,255,255,.03)'
        }}
      >
        <Link 
          to={`/product/${product._id}`}
          style={{ display: 'block', height: '100%', pointerEvents: 'auto' }}
        >
          <motion.img 
            src={product.images ? product.images[0] : product.image} 
            alt={product.name}
            initial={{ scale: 0.95, opacity: 0.8 }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0 6px 16px rgba(0,0,0,.3))',
              display: 'block',
              pointerEvents: 'none' // Вимикаємо events на img, щоб не конфліктувати з карткою
            }}
          />
        </Link>
      </div>

      {/* Body */}
      <div 
        className="card-body" 
        style={{ 
          padding: '16px 16px 20px', 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 8,
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Name з hover тільки на h3 */}
        <Link 
          to={`/product/${product._id}`}
          style={{ textDecoration: 'none' }}
        >
          <motion.h3 
            className="h2 mono" 
            whileHover={{ color: 'var(--turquoise)' }}
            style={{ 
              fontSize: '14px', 
              margin: 0, 
              color: 'var(--yellow)', 
              lineHeight: 1.3,
              transition: 'color 0.2s ease',
              textShadow: 'none',
              pointerEvents: 'auto'
            }}
          >
            {product.name}
          </motion.h3>
        </Link>

        {/* Additional Info */}
        <div style={{ display: 'grid', gap: 4, fontSize: 10, opacity: 0.8 }}>
          {product.category && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--pink)' }}>Категорія:</span>
              <span>{product.category.toUpperCase()}</span>
            </div>
          )}
          {product.genre && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--turquoise)' }}>Жанр:</span>
              <span>{product.genre.charAt(0).toUpperCase() + product.genre.slice(1)}</span>
            </div>
          )}
          {product.stock !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--green)' }}>Наявність:</span>
              <span>{product.stock > 0 ? `${product.stock} шт.` : 'Немає'}</span>
            </div>
          )}
        </div>

        {/* Price з легким hover */}
        <motion.div 
          className="p" 
          whileHover={{ scale: 1.02 }}
          style={{ 
            fontSize: 14, 
            fontWeight: 'bold', 
            color: 'var(--yellow)', 
            margin: '8px 0 0 0',
            textAlign: 'center',
            textShadow: 'none'
          }}
        >
          {formatPrice(Number(product.price) || 0)} {/* Безпечне форматування */}
        </motion.div>

        {/* Buttons — ізольовані від hover картки, з рівномірним gap */}
        <div style={{ 
          display: 'flex', 
          gap: 12, // Збільшений gap для рівномірності (було 8, тепер 12 — красиво на всіх картках)
          marginTop: 'auto',
          justifyContent: 'center',
          zIndex: 20, // Кнопки завжди на верху
          pointerEvents: 'auto'
        }}>
          {/* Кнопка кошика — доповнено 3D inset тінню та pixelated glow */}
          <motion.button
            className={`btn btn-green ${isInCart ? 'in-cart' : ''}`}
            onClick={addToCartHandler}
            variants={hasStock && !isInCart ? { 
              hover: { 
                scale: 1.05, 
                boxShadow: '0 6px 12px rgba(76,175,80,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' // Додано inset для 3D
              }, 
              tap: { scale: 0.95 } 
            } : {}}
            animate={isInCart ? {} : successPulse}
            disabled={!hasStock || isInCart}
            style={{ 
              flex: 1, 
              padding: '8px 12px', 
              fontSize: 10,
              minHeight: 32,
              opacity: (!hasStock || isInCart) ? 0.6 : 1,
              background: (!hasStock || isInCart) ? 'linear-gradient(180deg, #666, #444)' : 'linear-gradient(180deg, var(--green), var(--green-2))',
              borderColor: (!hasStock || isInCart) ? '#666' : 'var(--green)',
              cursor: (!hasStock || isInCart) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: (!hasStock || isInCart) ? '0 2px 4px rgba(0,0,0,0.2)' : '0 4px 8px rgba(76,175,80,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              pointerEvents: 'auto',
              zIndex: 20,
              fontWeight: 'bold',
              borderRadius: '8px', // Легке заокруглення для сучасності
              imageRendering: 'pixelated', // Додано для піксельного ефекту на градієнті
              textShadow: (!hasStock || isInCart) ? 'none' : '0 0 3px rgba(255,255,255,0.8)' // Glow для тексту
            }}
          >
            {CartIcon}
            <span style={{ marginLeft: 2 }}>{isInCart ? 'У кошику' : (!hasStock ? 'Немає' : 'В кошик')}</span>
          </motion.button>

          {/* Кнопка бажаного — доповнено ротацією на hover та сильнішим glow */}
          <motion.button
            className={`btn btn-wish ${isInWishlist ? 'active' : ''}`}
            onClick={toggleWishlistHandler}
            variants={{ 
              hover: { 
                scale: 1.05, 
                rotate: 360, 
                boxShadow: '0 0 20px var(--pink), 0 4px 12px rgba(255,0,127,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' // Посилено glow + inset
              }, 
              tap: { scale: 0.95 } 
            }}
            animate={isInWishlist ? wishlistPulse : {}}
            style={{ 
              width: 32,
              height: 32,
              padding: 0,
              minHeight: 32,
              background: isInWishlist ? 'linear-gradient(180deg, var(--pink), var(--pink-2))' : 'linear-gradient(180deg, #666, #888)',
              borderColor: isInWishlist ? 'var(--pink)' : '#666',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isInWishlist ? '0 0 15px rgba(255,0,127,0.6), 0 2px 8px rgba(255,0,127,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 2px 4px rgba(0,0,0,0.2)',
              color: isInWishlist ? 'var(--white)' : '#ccc', // Білий для filled (контраст на рожевому), сірий для unfilled
              textShadow: isInWishlist ? '0 0 3px rgba(255,255,255,0.8)' : 'none', // Білий glow для видимості серця
              pointerEvents: 'auto',
              zIndex: 20,
              fontSize: 16, // Більший розмір для чіткості
              fontWeight: 'bold',
              imageRendering: 'pixelated', // Додано для піксельного серця
              transition: 'all 0.3s ease' // Плавний перехід для ротації
            }}
          >
            {HeartIcon}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;