// src/pages/ProductDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ProductCard from '../components/ProductCard'; // Додано імпорт ProductCard (виправлення помилки 'ProductCard is not defined')
import {
  selectCartItems,
  addToCart,
  increaseQty,
  decreaseQty
} from '../redux/cartSlice';
import { toggleWishlistItem } from '../redux/wishlistSlice';
import formatPrice from '../utils/formatPrice';
import { testProducts } from '../utils/testData';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems);

  const [product, setProduct] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Виправлення: використовувати _id для перевірки в кошику (замість id, бо в testProducts _id)
  const isInCart = cartItems.some(item => item.id === product?._id);
  const cartItemQuantity = cartItems.find(item => item.id === product?._id)?.qty || 0; // Використовуємо qty з cartSlice

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      const foundProduct = testProducts.find(p => p._id === id);
      if (foundProduct) {
        setProduct(foundProduct);
        setRelatedProducts(testProducts.filter(p => p.category === foundProduct.category && p._id !== foundProduct._id).slice(0, 4));
      } else {
        navigate('/products');
      }
    }, 500);
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (product) {
      // Виправлення: додати id: product._id для сумісності з cartSlice
      dispatch(addToCart({ 
        id: product._id, 
        name: product.name, 
        price: product.price, 
        image: product.images ? product.images[0] : product.image, 
        qty: quantity 
      }));
    }
  };

  const handleQuantityChange = (delta) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const handleWishlistToggle = () => {
    if (product) {
      // Виправлення: додати id: product._id для сумісності з wishlistSlice
      dispatch(toggleWishlistItem({
        id: product._id,
        name: product.name,
        price: product.price,
        image: product.images ? product.images[0] : product.image
      }));
    }
  };

  // Анімації
  const stepVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.3 } }
  };

  const buttonVariants = {
    hover: { scale: 1.02, boxShadow: '0 0 20px currentColor', y: -2 },
    tap: { scale: 0.98, y: 0 }
  };

  const imageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  // Додано визначення itemVariants (виправлення помилки 'itemVariants is not defined')
  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }
  };

  if (!product) {
    return (
      <section className="container center">
        <motion.div
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          style={{ padding: 48, minHeight: '50vh' }}
        >
          <div className="mono" style={{ color: 'var(--yellow)', fontSize: 18, textShadow: '0 0 10px var(--yellow)' }}>
            Товар не знайдено 😔
          </div>
          <Link to="/products" className="btn btn-green" style={{ marginTop: 16 }}>
            ← Назад до каталогу
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="container">
      <motion.div
        variants={stepVariants}
        initial="hidden"
        animate="visible"
        style={{ position: 'relative' }}
      >
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 0.8 }}>
          <Link to="/products" style={{ color: 'var(--turquoise)', textDecoration: 'none' }}>Каталог</Link>
          <span> → </span>
          <span>{product.category}</span>
          <span> → </span>
          <span style={{ color: 'var(--yellow)' }}>{product.name}</span>
        </div>

        <div className="grid grid-2" style={{ gap: 32, alignItems: 'start' }}>
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ position: 'relative' }}
          >
            <div className="carousel" style={{ borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  src={product.images[currentImage]}
                  alt={product.name}
                  variants={imageVariants}
                  initial="hidden"
                  animate="visible"
                  style={{
                    width: '100%',
                    height: 400,
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    background: 'linear-gradient(45deg, rgba(255,215,0,0.1), rgba(0,245,255,0.1))',
                    padding: 20
                  }}
                />
              </AnimatePresence>
              {product.images.length > 1 && (
                <div className="carousel-thumbs" style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {product.images.map((img, idx) => (
                    <motion.button
                      key={idx}
                      className={`thumb-btn ${currentImage === idx ? 'active' : ''}`}
                      onClick={() => setCurrentImage(idx)}
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        border: currentImage === idx ? '2px solid var(--turquoise)' : '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          imageRendering: 'pixelated'
                        }}
                      />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: 20,
              background: 'linear-gradient(180deg, rgba(26,26,26,0.95), rgba(12,12,12,0.95))',
              borderRadius: 'var(--radius)',
              border: '1px solid rgba(255,215,0,0.2)',
              boxShadow: 'var(--shadow-card), 0 0 15px rgba(255,215,0,0.1)'
            }}
          >
            <h1 className="h1 retro" style={{ color: 'var(--yellow)', margin: 0, textShadow: '0 0 8px var(--yellow)' }}>
              {product.name}
            </h1>
            <div className="p" style={{ color: 'var(--turquoise)', fontSize: 14, textShadow: '0 0 6px var(--turquoise)' }}>
              Категорія: <strong>{product.category}</strong> {product.isRetro ? '🎮 (Ретро)' : ''}
            </div>
            <div className="h2" style={{ color: 'var(--green)', fontSize: 20, textShadow: '0 0 10px var(--green)' }}>
              {formatPrice(product.price)}
              {product.stock === 0 && <span style={{ color: 'var(--pink)', marginLeft: 8 }}>🔴 Закінчується</span>}
            </div>

            {/* Quantity & Add to Cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                <motion.button
                  onClick={() => handleQuantityChange(-1)}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(180deg, var(--pink), var(--pink-2))',
                    border: 'none',
                    color: 'var(--white)',
                    fontSize: 16,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(255,0,127,0.3)'
                  }}
                  disabled={quantity <= 1}
                >
                  −
                </motion.button>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--white)', minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                <motion.button
                  onClick={() => handleQuantityChange(1)}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(180deg, var(--green), var(--green-2))',
                    border: 'none',
                    color: 'var(--white)',
                    fontSize: 16,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(76,175,80,0.3)'
                  }}
                >
                  +
                </motion.button>
              </div>
              <motion.button
                className={`btn ${isInCart ? 'btn-outline' : 'btn-green'}`}
                onClick={handleAddToCart}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                disabled={product.stock === 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: 12,
                  background: isInCart ? 'rgba(76,175,80,0.1)' : 'linear-gradient(180deg, var(--green), var(--green-2))',
                  border: isInCart ? '1px solid var(--green)' : 'none',
                  color: isInCart ? 'var(--green)' : 'var(--white)',
                  boxShadow: isInCart ? '0 2px 8px rgba(76,175,80,0.2)' : '0 4px 12px rgba(76,175,80,0.4)'
                }}
              >
                {isInCart ? `В кошику (${cartItemQuantity})` : '🛒 Додати в кошик'}
              </motion.button>
              <motion.button
                className="btn btn-wish"
                onClick={handleWishlistToggle}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                style={{
                  padding: '12px',
                  fontSize: 12,
                  background: 'linear-gradient(180deg, var(--pink), var(--pink-2))',
                  border: 'none',
                  color: 'var(--white)',
                  boxShadow: '0 4px 12px rgba(255,0,127,0.4)'
                }}
              >
                💖 В бажане
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {['description', 'specs', 'reviews'].map(tab => (
                <motion.button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: activeTab === tab ? 'var(--turquoise)' : 'transparent',
                    border: '1px solid var(--turquoise)',
                    color: activeTab === tab ? 'var(--black)' : 'var(--white)',
                    fontSize: 10,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {tab === 'description' && '📝 Опис'}
                  {tab === 'specs' && '⚙️ Характеристики'}
                  {tab === 'reviews' && '⭐ Відгуки'}
                </motion.button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <p className="p" style={{ opacity: 0.9, lineHeight: 1.6 }}>
                    {product.description || 'Опис товару відсутній. Це ретро-шедевр для колекціонерів! Додайте ностальгію до своєї колекції.'}
                  </p>
                </motion.div>
              )}

              {activeTab === 'specs' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <ul className="specs-list" style={{ listStyle: 'none', padding: 0 }}>
                    {/* Виправлення помилки map на undefined: (product.specs || []).map */}
                    {(product.specs || []).map((spec, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ color: 'var(--yellow)', fontSize: 11 }}>{spec.key}:</span>
                        <span style={{ color: 'var(--turquoise)', fontSize: 11 }}>{spec.value}</span>
                      </li>
                    ))}
                    {/* Fallback, якщо specs відсутні */}
                    {(!product.specs || product.specs.length === 0) && (
                      <li style={{ padding: '8px 0', opacity: 0.7, fontStyle: 'italic' }}>
                        Характеристики скоро з'являться. Базова інфо: {product.category} консоль/аксесуар.
                      </li>
                    )}
                  </ul>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <p className="p" style={{ opacity: 0.8, textAlign: 'center', fontStyle: 'italic' }}>Відгуки скоро з'являться! Будьте першими 😊</p>
                  {/* Review form placeholder */}
                  <div style={{ marginTop: 16, padding: 12, background: 'rgba(0,245,255,0.05)', borderRadius: 8, border: '1px solid var(--turquoise)' }}>
                    <h4 style={{ color: 'var(--turquoise)', marginBottom: 8 }}>Додати відгук</h4>
                    <textarea
                      placeholder="Ваш відгук..."
                      style={{ width: '100%', height: 80, padding: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--turquoise)', borderRadius: 4, color: 'var(--white)', fontSize: 10 }}
                    />
                    <motion.button
                      className="btn btn-green"
                      variants={buttonVariants}
                      whileHover="hover"
                      whileTap="tap"
                      style={{ marginTop: 8, width: '100%', padding: '8px', fontSize: 10 }}
                    >
                      📤 Надіслати
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ marginTop: 48 }}
          >
            <h2 className="h2 retro" style={{ color: 'var(--pink)', marginBottom: 24, textAlign: 'center', textShadow: '0 0 8px var(--pink)' }}>
              🔥 Рекомендовані товари
            </h2>
            <div className="grid grid-4" style={{ gap: 20 }}>
              {relatedProducts.map((rel, idx) => (
                <motion.div
                  key={rel._id}
                  variants={itemVariants} // Тепер визначено
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(255,0,127,0.2)' }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <ProductCard product={rel} /> {/* Тепер імпортовано */}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}