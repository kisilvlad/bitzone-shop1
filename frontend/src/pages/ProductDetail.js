// src/pages/ProductDetail.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { addToCart } from '../redux/cartSlice';
import { toggleWishlistItem, selectWishlistItems } from '../redux/wishlistSlice';
import formatPrice from '../utils/formatPrice';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

/* =========================
   Liquid Glass + Tokens (ОНОВЛЕНО)
   ========================= */
const Glass = styled.div`
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  box-shadow: var(--shadow-card-hover); /* <-- ЗМІНЕНО */
  backdrop-filter: blur(8px);
  
  [data-theme="light"] & {
    backdrop-filter: none; /* Вимикаємо блюр на світлій */
  }
`;
const Panel = styled(Glass)`
  padding: clamp(16px, 3.2vw, 22px);
`;

const TitleXL = styled.h1`
  margin: 0 0 8px 0;
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  font-family: var(--font-display);
  letter-spacing: .4px;
  font-size: clamp(22px, 4.6vw, 34px);
  line-height: 1.16;
  [data-theme="dark"] & {
    text-shadow: 0 0 10px rgba(255,215,0,.12);
  }
`;
/* =========================
   Layout (без змін)
   ========================= */
const Page = styled.section`
  &.container { overflow: hidden; }
`;
const Breadcrumbs = styled.nav`
  margin-bottom: 16px;
  font-size: clamp(10px, 2.4vw, 12px);
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  a { color: var(--accent-turquoise); text-decoration: none; }
  .sep { margin: 0 6px; opacity: .55; }
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(16px, 3vw, 28px);

  @media (min-width: 1100px) {
    grid-template-columns: 1.2fr .8fr;
  }
`;
/* =========================
   Desktop / Mobile switches (без змін)
   ========================= */
const DesktopOnly = styled.div`
  display: none;
  @media (min-width: 721px) { display: block; }
`;
const MobileOnly = styled.div`
  display: block;
  @media (min-width: 721px) { display: none; }
`;

/* =========================
   Desktop GALLERY (ОНОВЛЕНО)
   ========================= */
const GalleryWrap = styled(Glass)`
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  padding: clamp(10px, 1.4vw, 14px);
`;

const ThumbsCol = styled.div`
  display: grid;
  grid-auto-rows: 76px;
  gap: 8px;
  overflow: auto;
  max-height: min(68vh, 540px);
  padding-right: 2px;
  -webkit-overflow-scrolling: touch;
`;

const Thumb = styled.button`
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  border: 1px solid ${({active}) => active ? 'var(--accent-turquoise)' : 'var(--border-input)'}; /* <-- ЗМІНЕНО */
  border-radius: 10px;
  width: 100%; height: 110%;
  display: grid; place-items: center;
  cursor: pointer; padding: 8px;
  transition: border-color .15s ease, transform .12s ease, background .15s ease;
  &:hover { 
    background: var(--surface-input); /* <-- ЗМІНЕНО */
    opacity: 0.8;
  }
  &:active { transform: scale(.98); }

  img {
    width: 70%;
    height: 100%;
    object-fit: contain;
    image-rendering: auto;
    filter: drop-shadow(0 6px 14px rgba(0,0,0,.25));
    [data-theme="light"] & {
      filter: drop-shadow(0 6px 14px rgba(0,0,0,.15));
    }
  }
`;

/* --- ОСНОВНЕ ВИПРАВЛЕННЯ ТУТ --- */
const Viewport = styled.div`
  position: relative;
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background:
    radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.08), rgba(255,255,255,.02) 60%),
    linear-gradient(180deg, rgba(26,26,26,.92), rgba(10,10,10,.9));
  
  [data-theme="light"] & {
    background:
      radial-gradient(60% 60% at 30% 20%, rgba(0,0,0,.04), rgba(0,0,0,.01) 60%),
      var(--surface-primary);
  }
  
  /* 1. Робимо контейнер ідеально квадратним */
  aspect-ratio: 1 / 1;
  width: 100%;
  /* 2. Обмежуємо максимальний розмір і центруємо */
  max-width: 520px;
  margin: 0 auto;

  overflow: hidden;
  display: grid;
  place-items: center;
`;

const Frame = styled.div`
  position: absolute; inset: 10px;
  border-radius: calc(var(--radius) - 10px);
  overflow: hidden;
  display: grid;
  place-items: center;
  contain: paint;
`;

const SafeZone = styled.div`
  width: 80%; height: 100%;
  display: grid;
  place-items: center;
`;
const MainImg = styled(motion.img)`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: auto;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,.28));
  [data-theme="light"] & {
    filter: drop-shadow(0 8px 18px rgba(0,0,0,.15));
  }
  transition: opacity .18s ease;
  will-change: opacity;
`;

const NavBtn = styled.button`
  position: absolute; top: 50%; transform: translateY(-50%);
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  background: var(--surface-header-bg); /* <-- ЗМІНЕНО */
  border-radius: 999px;
  width: 36px; height: 36px;
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  display: grid; place-items: center;
  backdrop-filter: blur(4px);
  cursor: pointer;
  transition: transform .12s ease, opacity .12s ease;
  &:active { transform: translateY(-50%) scale(.98); }
  &.prev { left: 10px; }
  &.next { right: 10px; }
`;

/* =========================
   Mobile GALLERY (ОНОВЛЕНО)
   ========================= */
const MobileRailWrap = styled(Glass)`
  padding: 10px;
`;
const MobileRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  gap: 8px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--radius);
`;
const RailItem = styled.div`
  position: relative;
  scroll-snap-align: center;
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  border-radius: var(--radius);
  background:
    radial-gradient(60% 60% at 30% 20%, rgba(255,255,255,.08), rgba(255,255,255,.02) 60%),
    linear-gradient(180deg, rgba(26,26,26,.92), rgba(10,10,10,.9));
  [data-theme="light"] & {
    background:
      radial-gradient(60% 60% at 30% 20%, rgba(0,0,0,.04), rgba(0,0,0,.01) 60%),
      var(--surface-primary);
  }
  aspect-ratio: 1/1;
  max-height: clamp(240px, 56vh, 440px);
  padding: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;

  img {
    width: 80%;
    height: 90%;
    object-fit: contain !important;
    image-rendering: auto;
    filter: none;
    transform: none !important;
  }
`;
const Dots = styled.div`
  display: flex;
  justify-content: center; gap: 6px; margin-top: 8px;
  button {
    width: 8px; height: 8px; border-radius: 50%;
    border: none;
    background: var(--border-input); /* <-- ЗМІНЕНО */
  }
  button[aria-current="true"] { background: var(--accent-turquoise); }
`;
const LightboxBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0; z-index: 80;
  background: rgba(0,0,0,.75);
  [data-theme="light"] & {
    background: rgba(255,255,255,.75);
  }
  display: grid; place-items: center;
  backdrop-filter: blur(2px);
`;
const LightboxInner = styled(Glass)`
  max-width: min(92vw, 1200px);
  max-height: 88vh;
  width: 100%;
  padding: 12px;
  display: grid; place-items: center; position: relative;
`;
const LightboxImg = styled.img`
  max-width: 100%; max-height: 82vh;
  object-fit: contain; image-rendering: auto;
`;
const CloseX = styled.button`
  position: absolute; top: 10px; right: 10px;
  width: 36px; height: 36px;
  border-radius: 999px;
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  background: var(--surface-header-bg); /* <-- ЗМІНЕНО */
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  display: grid; place-items: center; cursor: pointer;
`;
/* =========================
   Buy Sticky (ОНОВЛЕНО)
   ========================= */
const BuySticky = styled.div`
  position: sticky; top: 16px;
  display: grid; gap: 14px;
`;
const Chips = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px;
  .chip {
    padding: 6px 10px;
    border-radius: 999px;
    background: var(--surface-input); /* <-- ЗМІНЕНО */
    border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
    font-size: 11px; color: var(--text-secondary); /* <-- ЗМІНЕНО */
    font-weight: 800;
  }
`;
const Price = styled.div`
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  font-size: clamp(22px, 4.4vw, 30px);
  font-weight: 1000; letter-spacing: .4px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  .amount { 
    color: var(--accent-yellow); 
    [data-theme="dark"] & {
      text-shadow: 0 0 10px rgba(255,215,0,.25); 
    }
  }
`;
const CTAwrap = styled.div`
  width: 100%;
  max-width: 520px;
`;
const CTArow = styled.div`
  display: grid; grid-template-columns: 1fr .6fr; gap: 10px;
  @media (max-width: 540px) { grid-template-columns: 1fr; }
`;
const PrimaryBtn = styled.button`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.15); /* <-- ЗМІНЕНО */
  background: linear-gradient(180deg, var(--accent-green), var(--accent-green-dark)); /* <-- ЗМІНЕНО */
  color: var(--text-on-accent-light); /* <-- ЗМІНЕНО */
  font-weight: 1000; letter-spacing: .35px;
  font-size: clamp(12px, 3vw, 14px);
  box-shadow: 0 14px 26px var(--shadow-btn-green); /* <-- ЗМІНЕНО */
  cursor: pointer;
  transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
  &:hover { filter: brightness(1.04); }
  &:active { transform: translateY(1px) scale(.99); }
  &.secondary { 
    background: var(--surface-input); /* <-- ЗМІНЕНО */
    border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
    color: var(--text-secondary); /* <-- ЗМІНЕНО */
    box-shadow: none;
  }
`;
const WishBtn = styled.button`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid ${p=>p.active?'var(--accent-pink)':'var(--border-input)'}; /* <-- ЗМІНЕНО */
  background: ${p=>p.active?'linear-gradient(180deg,var(--accent-pink),var(--accent-pink-dark))':'var(--surface-input)'}; /* <-- ЗМІНЕНО */
  color: ${p=>p.active?'var(--text-on-accent-light)':'var(--text-secondary)'}; /* <-- ЗМІНЕНО */
  font-weight: 900; letter-spacing: .3px;
  font-size: clamp(12px, 3vw, 14px);
  cursor: pointer; transition: transform .12s ease, filter .12s ease, background .2s ease;
  &:hover { filter: brightness(1.04); }
  &:active { transform: translateY(1px) scale(.99); }
`;
const TrustRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px;
  @media (max-width: 540px) { grid-template-columns: 1fr; }
  .trust { 
    padding: 12px 14px;
    border-radius: 10px; 
    background: var(--surface-input); /* <-- ЗМІНЕНО */
    border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
    font-size: 12px; 
    color: var(--text-secondary); /* <-- ЗМІНЕНО */
  }
`;
const Tabs = styled.div`
  margin-top: 12px;
  display: flex;
  gap: 8px; flex-wrap: wrap;
`;
const TabBtn = styled.button`
  padding: 8px 14px; border-radius: 999px;
  border: 1px solid ${p=>p.active?'var(--accent-turquoise)':'var(--border-input)'}; /* <-- ЗМІНЕНО */
  background: ${p=>p.active?'linear-gradient(180deg, rgba(0,245,255,.12), rgba(0,245,255,.06))':'var(--surface-input)'}; /* <-- ЗМІНЕНО */
  color: ${p=>p.active?'var(--accent-turquoise)':'var(--text-secondary)'}; /* <-- ЗМІНЕНО */
  font-weight: 900; letter-spacing: .2px; cursor: pointer;
`;
const TabBody = styled(Panel)`
  margin-top: 10px;
  font-size: clamp(13px, 3vw, 15px);
  line-height: 1.8;
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  p { margin: 0 0 10px 0;
    font-weight: 800; letter-spacing: .2px;
    color: var(--text-primary); /* <-- ЗМІНЕНО */
  }
  ul { margin: 0 0 10px 20px; }
  li { margin: 0 6px;
    font-weight: 700; 
  }
`;
const ConditionTag = styled.div`
  position: absolute;
  top: 10px; left: 10px; z-index: 2;
  padding: 8px 14px; border-radius: 12px; text-transform: uppercase;
  border: 1px solid rgba(0,0,0,.15); /* <-- ЗМІНЕНО */
  font-weight: 1000;
  font-size: 13px; letter-spacing: .4px;
  color: var(--text-on-accent-dark); /* <-- ЗМІНЕНО */
  background: ${({type}) => type==='new'
    ? 'linear-gradient(180deg, var(--accent-yellow), var(--accent-yellow-dark))'
    : 'linear-gradient(180deg, #78F39A, #34C759)'}; /* TODO: Замінити зелений на змінну */
  box-shadow: 0 14px 30px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.22); /* <-- ЗМІНЕНО */
`;
const OOSTag = styled.div`
  position: absolute; top: 10px;
  right: 10px; z-index: 2;
  padding: 8px 14px; border-radius: 12px; text-transform: uppercase;
  border: 1px solid rgba(0,0,0,.15); /* <-- ЗМІНЕНО */
  font-weight: 1000; font-size: 13px;
  letter-spacing: .4px;
  color: var(--text-on-accent-light); /* <-- ЗМІНЕНО */
  background: linear-gradient(180deg, var(--accent-red), var(--accent-red-dark)); /* <-- ЗМІНЕНО */
  box-shadow: 0 14px 30px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.22); /* <-- ЗМІНЕНО */
`;
const ReviewsWrap = styled.section`
  margin-top: clamp(26px, 5vw, 46px);
  display: grid;
  gap: 14px;
`;
const Review = styled(Panel)`
  border-left: 3px solid var(--accent-turquoise);
`;

/* =========================
   Helpers (без змін)
   ========================= */
function parseConditionFromName(name = '') {
  const lower = String(name).toLowerCase();
  const isNew  = /(нова|new|brand\s*new)/i.test(lower);
  const isUsed = /(вживана|бу|б\/в|used|pre[-\s]*owned)/i.test(lower);
  return { isNew, isUsed };
}

function renderDescription(desc) {
  const text = String(desc || '').trim();
  if (!text) return <p>Опис для цього товару буде додано найближчим часом.</p>;
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const blocks = [];
  let buf = [], list = [];
  const flushP = () => { if (buf.length) { blocks.push(<p key={`p-${blocks.length}`}>{buf.join(' ')}</p>); buf = []; } };
  const flushL = () => { if (list.length) { blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((t,i)=><li key={i}>{t}</li>)}</ul>); list=[]; } };
  for (const l of lines) {
    if (/^[-•*]\s+/.test(l)) { flushP(); list.push(l.replace(/^[-•*]\s+/,'')); }
    else if (l === '') { flushP(); flushL(); }
    else { buf.push(l); }
  }
  flushP(); flushL();
  return <>{blocks}</>;
}

/* =========================
   Component (ОНОВЛЕНО)
   ========================= */
export default function ProductDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [current, setCurrent] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [lightbox, setLightbox] = useState(false);

  const { isAuthenticated, token } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart.items);
  const wishlistItems = useSelector(selectWishlistItems);

  const isInCart = cartItems.some(i => i.id === product?.id);
  const isInWishlist = wishlistItems.some(i => i.id === product?.id);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setError(null);
        const [p, r] = await Promise.all([
          axios.get(`http://localhost:5000/api/products/${id}`),
          axios.get(`http://localhost:5000/api/products/${id}/reviews`)
        ]);
        setProduct(p.data);
        setReviews(r.data);
        setCurrent(0);
        setActiveTab('description');
      } catch (e) {
        console.error(e);
        setError('Не вдалося завантажити товар або відгуки');
      } finally { setLoading(false); }
    })();
  }, [id]);

  const getImg = (url, w=2000, q=95) =>
    url ? `http://localhost:5000/api/images?url=${encodeURIComponent(url)}&w=${w}&q=${q}` : '/assets/bitzone-logo1.png';

  const images = useMemo(() => {
    if (!product) return [];
    const arr = Array.isArray(product.images) && product.images.length ? product.images : (product.image ? [product.image] : []);
    return arr.filter(Boolean);
  }, [product]);

  const isAvailable = useMemo(() =>
    product && product.stock > 0 && Number(product.price) > 0
  , [product]);
  
  const condition = useMemo(() => parseConditionFromName(product?.name), [product?.name]);

  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);
  
  const addCart = () => {
    if (!product) return;
    if (isInCart) return navigate('/cart');
    dispatch(addToCart({ id: product.id, name: product.name, price: Number(product.price)||0, image: images[0], qty: 1 }));
  };
  
  const toggleWish = () => {
    if (!product) return;
    dispatch(toggleWishlistItem({ id: product.id, name: product.name, price: Number(product.price)||0, image: images[0] }));
  };

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  
  const submitReview = async (e) => {
    e.preventDefault();
    setReviewError(''); setReviewSuccess('');
    if (rating === 0 || text.trim() === '') { setReviewError('Будь ласка, поставте оцінку та напишіть текст відгуку.'); return; }
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`http://localhost:5000/api/products/${id}/reviews`, { rating, text }, config);
      const r = await axios.get(`http://localhost:5000/api/products/${id}/reviews`);
      setReviews(r.data);
      setReviewSuccess('Дякуємо! Ваш відгук було опубліковано.');
      setRating(0); setText('');
    } catch (err) { setReviewError(err.response?.data?.message || 'Не вдалося додати відгук.'); }
  };

  const railRef = useRef(null);
  
  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== current) setCurrent(Math.min(Math.max(i,0), images.length-1));
  };
  
  const goToSlide = (i) => {
    const el = railRef.current;
    if (!el) return;
    const clamped = Math.min(Math.max(i,0), images.length-1);
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setCurrent(clamped);
  };
  
  if (loading) return <p className="p center" style={{ color: 'var(--text-secondary)' }}>Завантаження товару...</p>; /* <-- ЗМІНЕНО */
  if (error)   return <p className="p center" style={{ color: 'var(--accent-pink)' }}>{error}</p>; /* <-- ЗМІНЕНО */
  if (!product) return <p className="p center" style={{ color: 'var(--text-secondary)' }}>Товар не знайдено.</p>; /* <-- ЗМІНЕНО */

  return (
    <>
      <Page className="container">
        <Breadcrumbs aria-label="Breadcrumb">
          <Link to="/products">Каталог</Link>
          <span className="sep">→</span>
          <span style={{ color: 'var(--accent-yellow)' }}>{product.name}</span> {/* <-- ЗМІНЕНО */}
        </Breadcrumbs>

        <Shell>
          <div>
            <DesktopOnly>
              <GalleryWrap>
                <ThumbsCol className="no-scrollbar">
                  {images.length ? images.map((src, i) => (
                    <Thumb key={i} active={i===current} onClick={()=>setCurrent(i)} aria-label={`Фото ${i+1}`}>
                      <img className="product-media" src={getImg(src, 300, 80)} alt={`${product.name} thumbnail ${i+1}`} loading="lazy" decoding="async" />
                    </Thumb>
                  )) : (
                    <Thumb active>
                      <img className="product-media" src="/assets/bitzone-logo1.png" alt="no image" />
                    </Thumb>
                  )}
                </ThumbsCol>

                <Viewport>
                  {condition.isNew  && <ConditionTag type="new">НОВА</ConditionTag>}
                  {condition.isUsed && !condition.isNew && <ConditionTag type="used">Б/В</ConditionTag>}
                  {!isAvailable && <OOSTag>Немає в наявності</OOSTag>}

                  <Frame>
                    <SafeZone>
                      <AnimatePresence mode="wait">
                       {!!images.length && (
                          <MainImg
                            className="product-media"
                            key={images[current]}
                            src={getImg(images[current])}
                            alt={product.name}
                            loading="eager"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: .25 }}
                            onClick={() => setLightbox(true)}
                            style={{ cursor: 'zoom-in' }}
                          />
                        )}
                      </AnimatePresence>
                    </SafeZone>
                  </Frame>

                  {images.length > 1 && (
                    <>
                      <NavBtn className="prev" onClick={prev} aria-label="Попереднє фото">‹</NavBtn>
                      <NavBtn className="next" onClick={next} aria-label="Наступне фото">›</NavBtn>
                    </>
                  )}
                </Viewport>
              </GalleryWrap>

              <div style={{ marginTop: 12 }}>
                <Tabs role="tablist" aria-label="Деталі товару">
                  <TabBtn active={activeTab==='description'} onClick={()=>setActiveTab('description')} role="tab" aria-selected={activeTab==='description'}>📝 Опис</TabBtn>
                  <TabBtn active={activeTab==='specs'} onClick={()=>setActiveTab('specs')} role="tab" aria-selected={activeTab==='specs'}>⚙️ Характеристики</TabBtn>
                  <TabBtn active={activeTab==='shipping'} onClick={()=>setActiveTab('shipping')} role="tab" aria-selected={activeTab==='shipping'}>🚚 Доставка/Оплата</TabBtn>
                </Tabs>

                <AnimatePresence mode="wait">
                  {activeTab==='description' && (
                    <TabBody key="desc" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      {renderDescription(product.description)}
                    </TabBody>
                  )}
                  {activeTab==='specs' && (
                    <TabBody key="specs" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      {Array.isArray(product.specs) && product.specs.length ? (
                        <ul>
                          {product.specs.map((s,i)=>(
                            <li key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                              <span style={{color:'var(--accent-turquoise)'}}>{s.key}:</span> {/* TODO: specs не об'єкт */}
                              <span style={{textAlign:'right'}}>{s.value}</span> {/* TODO: specs не об'єкт */}
                            </li>
                          ))}
                        </ul>
                      ) : <p>Характеристики відсутні.</p>}
                    </TabBody>
                  )}
                  {activeTab==='shipping' && (
                    <TabBody key="shipping" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      <p>🚚 Доставка: Нова Пошта / Укрпошта по всій Україні. Відправка протягом 24 годин.</p>
                      <p>💳 Оплата: готівка при отриманні, банківська карта, переказ на рахунок.</p>
                      <p>📦 Упаковка: захисна, для безпеки під час транспортування.</p>
                    </TabBody>
                  )}
                </AnimatePresence>
              </div>
            </DesktopOnly>

            <MobileOnly>
              <MobileRailWrap>
                <div style={{ position:'relative' }}>
                  {condition.isNew  && <ConditionTag style={{position:'absolute',left:14,top:14}} type="new">НОВА</ConditionTag>}
                  {condition.isUsed && !condition.isNew && <ConditionTag style={{position:'absolute',left:14,top:14}} type="used">Б/В</ConditionTag>}
                  {!isAvailable && <OOSTag style={{position:'absolute',right:14,top:14}}>Немає в наявності</OOSTag>}

                  <MobileRail ref={railRef} onScroll={onRailScroll} className="no-scrollbar">
                    {(images.length?images:['/assets/bitzone-logo1.png']).map((src,i)=>(
                      <RailItem key={i} onClick={()=>setLightbox(true)}>
                        <img className="product-media" src={getImg(src, 1200, 95)} alt={`${product.name} ${i+1}`} loading="lazy" decoding="async" />
                      </RailItem>
                    ))}
                  </MobileRail>
                 </div>
                {images.length > 1 && (
                  <Dots>
                    {images.map((_,i)=>(
                      <button key={i} aria-current={i===current} onClick={()=>goToSlide(i)} />
                    ))}
                  </Dots>
                )}
              </MobileRailWrap>
            </MobileOnly>
          </div>

          <BuySticky>
            <Panel style={{ marginBottom: 22 }}>
              <TitleXL className="retro">{product.name}</TitleXL>

              <Chips>
                <span className="chip">Категорія: <strong>{product.category || '—'}</strong></span>
                {condition.isNew  && <span className="chip">✨ НОВА</span>}
                {condition.isUsed && <span className="chip">♻️ Б/В</span>}
                {!isAvailable && (
                  <span className="chip" style={{color:'var(--accent-red)',borderColor:'var(--accent-red)',background:'linear-gradient(180deg,rgba(255,122,136,.12),rgba(255,77,109,.10))'}}>Немає в наявності</span>
                )}
              </Chips>

              <Price><span className="amount">{formatPrice(product.price)}</span></Price>

              <CTAwrap>
                <CTArow>
                  <PrimaryBtn onClick={addCart} className={isInCart ? 'secondary' : ''}>
                    {isInCart ? 'Переглянути кошик' : 'Додати в кошик'}
                  </PrimaryBtn>
                  <WishBtn active={isInWishlist} onClick={toggleWish}>
                    {isInWishlist ? '♥ Вже в бажаному' : '♡ Додати в бажане'}
                  </WishBtn>
                </CTArow>
              </CTAwrap>

              <TrustRow>
                <div className="trust">⚡ Швидка відправка</div>
                <div className="trust">💬 Повернення - 14 днів</div>
              </TrustRow>
            </Panel>

            <MobileOnly>
              <div style={{ marginTop: 6 }}>
                <Tabs role="tablist" aria-label="Деталі товару">
                  <TabBtn active={activeTab==='description'} onClick={()=>setActiveTab('description')} role="tab" aria-selected={activeTab==='description'}>📝 Опис</TabBtn>
                  <TabBtn active={activeTab==='specs'} onClick={()=>setActiveTab('specs')} role="tab" aria-selected={activeTab==='specs'}>⚙️ Характеристики</TabBtn>
                  <TabBtn active={activeTab==='shipping'} onClick={()=>setActiveTab('shipping')} role="tab" aria-selected={activeTab==='shipping'}>🚚 Доставка/Оплата</TabBtn>
                </Tabs>

                <AnimatePresence mode="wait">
                  {activeTab==='description' && (
                    <TabBody key="m-desc" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      {renderDescription(product.description)}
                    </TabBody>
                  )}
                  {activeTab==='specs' && (
                    <TabBody key="m-specs" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      {Array.isArray(product.specs) && product.specs.length ? (
                        <ul>
                          {product.specs.map((s,i)=>(
                            <li key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                              <span style={{color:'var(--accent-turquoise)'}}>{s.key}:</span> {/* TODO: specs не об'єкт */}
                              <span style={{textAlign:'right'}}>{s.value}</span> {/* TODO: specs не об'єкт */}
                            </li>
                          ))}
                        </ul>
                      ) : <p>Характеристики відсутні.</p>}
                    </TabBody>
                  )}
                  {activeTab==='shipping' && (
                    <TabBody key="m-ship" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                      <p>🚚 Доставка: Нова Пошта / Укрпошта по всій Україні. Відправка протягом 24 годин.</p>
                      <p>💳 Оплата: готівка при отриманні, банківська карта, переказ на рахунок.</p>
                      <p>📦 Упаковка: захисна, для безпеки під час транспортування.</p>
                    </TabBody>
                  )}
                </AnimatePresence>
              </div>
            </MobileOnly>
          </BuySticky>
        </Shell>
      </Page>

      <div className="container">
        <ReviewsWrap>
          <h2 className="h2 mono" style={{ color: 'var(--accent-turquoise)', margin: 0 }}>
            Відгуки про товар ({reviews.length})
          </h2>

          {isAuthenticated ? (
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
              <Panel style={{marginTop:12}}>
                <h3 className="h2 mono" style={{ color: 'var(--accent-yellow)', marginTop: 0, marginBottom: 12 }}>
                  Залишити свій відгук
                </h3>
                <form onSubmit={submitReview}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>Ваша оцінка:</label> {/* <-- ЗМІНЕНО */}
                    <div style={{ display:'flex', gap:6, fontSize:'20px', color:'var(--accent-yellow)', userSelect:'none' }}>
                      {[1,2,3,4,5].map(star => (
                        <span key={star} style={{ cursor: 'pointer' }} onClick={() => setRating(star)}>
                          {star <= rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)' }}>Ваш коментар:</label> {/* <-- ЗМІНЕНО */}
                    <textarea
                      className="input"
                      rows="4"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Поділіться своїми враженнями..."
                    />
                  </div>
                  
                  {reviewError && <p style={{ color: 'var(--accent-pink)', fontSize: 11 }}>{reviewError}</p>}
                  {reviewSuccess && <p style={{ color: 'var(--accent-green)', fontSize: 11 }}>{reviewSuccess}</p>}
                  <PrimaryBtn type="submit">Відправити відгук</PrimaryBtn>
                </form>
              </Panel>
            </motion.div>
          ) : (
            <Panel style={{ textAlign: 'center' }}>
              <p className="p" style={{ margin: 0 }}>
                Щоб залишити відгук, будь ласка, <Link to="/login" style={{color: 'var(--accent-turquoise)'}}>увійдіть в акаунт</Link>.
              </p>
            </Panel>
          )}

          {reviews.length ?
            reviews.map(rv => (
            <Review key={rv.id}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <p className="p mono" style={{ margin:0, color:'var(--accent-yellow)', fontSize:14 }}>{rv.author}</p>
                <div style={{ display:'flex', gap:4, color:'var(--accent-yellow)', fontSize:18 }}>
                  {[1,2,3,4,5].map(n => <span key={n}>{n <= rv.rating ? '★' : '☆'}</span>)}
                </div>
              </div>
              <p className="p" style={{ marginTop: 12, opacity: .95, color: 'var(--text-primary)' }}>{rv.text}</p> {/* <-- ЗМІНЕНО */}
              <p style={{ fontSize:10, opacity:.6, marginTop:12, textAlign:'right', color: 'var(--text-secondary)' }}>
                {new Date(rv.createdAt).toLocaleDateString()}
              </p>
            </Review>
          )) : (
            <p className="p center" style={{ color: 'var(--text-secondary)' }}>Для цього товару ще немає відгуків. Будьте першим!</p> /* <-- ЗМІНЕНО */
          )}
        </ReviewsWrap>
      </div>

      <AnimatePresence>
         {lightbox && images[current] && (
          <LightboxBackdrop
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={()=>setLightbox(false)}
          >
            <LightboxInner onClick={(e)=>e.stopPropagation()}>
              <CloseX onClick={()=>setLightbox(false)} aria-label="Закрити">✕</CloseX>
              <LightboxImg src={getImg(images[current], 2000, 92)} alt={product.name} />
            </LightboxInner>
          </LightboxBackdrop>
        )}
      </AnimatePresence>
    </>
  );
}