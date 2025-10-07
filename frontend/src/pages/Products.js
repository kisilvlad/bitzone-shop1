// src/pages/Products.js

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import { testProducts } from '../utils/testData';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [newOnly, setNewOnly] = useState(false);
  const [usedOnly, setUsedOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name:asc');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [selectedGenres, setSelectedGenres] = useState(new Set());
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isGenresOpen, setIsGenresOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const categoryButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const perPage = 12;

  // Variants for dropdown animation
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  // Variants for filters panel animation
  const filtersPanelVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  // Variants for genres accordion
  const genresVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { height: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  useEffect(() => {
    // Імітація завантаження
    setTimeout(() => {
      const adaptedProducts = testProducts.map(p => ({
        ...p,
        category: ['playstation', 'xbox', 'nintendo', 'steamdeck', 'retro'].includes(p.category) ? p.category : 'retro',
        condition: p.condition || (Math.random() > 0.5 ? 'new' : 'used'),
        genre: p.name.includes('Mario') ? 'platformer' : 
               p.name.includes('Kart') ? 'racing' : 
               p.name.includes('Sonic') ? 'platformer' : 
               p.name.includes('Zelda') ? 'adventure' : 
               p.name.includes('Spider') ? 'action' : 
               Math.random() > 0.8 ? 'rpg' : 'shooter' // Демо жанри для інших
      }));
      setProducts(adaptedProducts);
    }, 500);
  }, []);

  const categories = useMemo(() => [
    { value: 'all', label: 'Всі Категорії' },
    { value: 'playstation', label: 'Playstation' },
    { value: 'xbox', label: 'Xbox' },
    { value: 'nintendo', label: 'Nintendo' },
    { value: 'steamdeck', label: 'Steamdeck' },
    { value: 'retro', label: 'Retro' }
  ], []);

  const sortOptions = useMemo(() => [
    { value: 'name:asc', label: 'Назва (A-Z)' },
    { value: 'name:desc', label: 'Назва (Z-A)' },
    { value: 'price:asc', label: 'Ціна (зростання)' },
    { value: 'price:desc', label: 'Ціна (зменшення)' }
  ], []);

  const genres = useMemo(() => [
    { key: 'action', label: 'Екшн' },
    { key: 'adventure', label: 'Пригоди' },
    { key: 'rpg', label: 'Рольова гра (RPG)' },
    { key: 'shooter', label: 'Шутер' },
    { key: 'sports', label: 'Спорт' },
    { key: 'simulation', label: 'Симулятор' },
    { key: 'strategy', label: 'Стратегія' },
    { key: 'battle_royale', label: 'Батл-рояль' },
    { key: 'fighting', label: 'Бойовик' },
    { key: 'platformer', label: 'Платформер' },
    { key: 'racing', label: 'Гонки' },
    { key: 'horror', label: 'Хорор' },
    { key: 'puzzle', label: 'Головоломка' },
    { key: 'sandbox', label: 'Пісочниця' },
    { key: 'mmo', label: 'ММО' },
    { key: 'stealth', label: 'Стелс' },
    { key: 'turn_based_strategy', label: 'Пошагова стратегія' },
    { key: 'open_world', label: 'Відкритий світ' },
    { key: 'music_rhythm', label: 'Музичний/Ритм' },
    { key: 'card_games', label: 'Карти' },
    { key: 'tower_defense', label: 'Захист веж' },
    { key: 'moba', label: 'МОБА' },
    { key: 'survival', label: 'Виживання' },
    { key: 'hack_and_slash', label: 'Хак-енд-слэш' },
    { key: 'visual_novel', label: 'Візуальна новела' }
  ], []);

  const filtered = useMemo(() => {
    let list = products
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter(p => newOnly ? p.condition === 'new' : true)
      .filter(p => usedOnly ? p.condition === 'used' : true)
      .filter(p => category === 'all' ? true : p.category === category)
      .filter(p => inStockOnly ? (p.stock > 0 || p.stock === undefined) : true) // Фікс для undefined stock
      .filter(p => priceMin ? p.price >= parseInt(priceMin) || 0 : true) // Фікс NaN
      .filter(p => priceMax ? p.price <= parseInt(priceMax) || Infinity : true) // Фікс NaN
      .filter(p => selectedGenres.size === 0 || selectedGenres.has(p.genre));

    const [field, dir] = sort.split(':');
    list.sort((a, b) => {
      if (field === 'price') return dir === 'asc' ? a.price - b.price : b.price - a.price;
      if (field === 'name') return dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      return 0;
    });

    return list;
  }, [products, search, newOnly, usedOnly, category, inStockOnly, sort, priceMin, priceMax, selectedGenres]);

  const totalPages = Math.ceil(filtered.length / perPage) || 1; // Фікс NaN

  // Динамічне позиціонування меню
  const getDropdownPosition = (buttonRef) => {
    if (!buttonRef.current) return { top: 0, left: 0 };
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      maxHeight: window.innerHeight - rect.bottom - 20,
      overflowY: 'auto'
    };
  };

  // Закрити фільтри при кліку поза ними
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isFiltersOpen && !event.target.closest('.filters-panel')) {
        setIsFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFiltersOpen]);

  // Фікс скролу: блокувати body scroll коли фільтри відкриті
  useEffect(() => {
    if (isFiltersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFiltersOpen]);

  const toggleGenre = (genreKey) => {
    const newSet = new Set(selectedGenres);
    if (newSet.has(genreKey)) {
      newSet.delete(genreKey);
    } else {
      newSet.add(genreKey);
    }
    setSelectedGenres(newSet);
  };

  return (
    <div className="container" style={{ marginTop: 24, position: 'relative', zIndex: 1 }}>
      {/* Кнопка Фільтри */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
        <motion.button
          className="btn btn-outline shimmer"
          onClick={() => setIsFiltersOpen(true)}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px var(--turquoise)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            borderRadius: '999px',
            padding: '12px 24px',
            fontFamily: 'Press Start 2P, cursive',
            fontSize: 12,
            textShadow: '0 0 5px var(--pink)',
            background: 'linear-gradient(180deg, rgba(0,245,255,0.1), rgba(0,245,255,0.05))' // Glow ефект
          }}
        >
          Фільтри ▼
        </motion.button>
      </div>

      {/* Панель Фільтрів */}
      <AnimatePresence>
        {isFiltersOpen && (
          <>
            {/* Оверлей — з вищим z-index */}
            <motion.div
              className="surface"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(5px)',
                zIndex: 999, // Високий, щоб футер не накладався
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFiltersOpen(false)}
            />
            {/* Бокова панель — з вищим z-index і overflow auto */}
            <motion.div
              className="surface filters-panel"
              variants={filtersPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'fixed',
                top: '80px',
                left: 0,
                width: 'min(500px, 85%)',
                height: 'calc(100vh - 80px)',
                padding: 24,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                zIndex: 1000, // Вище оверлея і футера
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                boxShadow: 'var(--shadow-card), 10px 0 30px rgba(0,0,0,0.5)',
                background: 'linear-gradient(180deg, rgba(26,26,26,0.98), rgba(12,12,12,0.98))' // Шиммер ефект
              }}
            >
              <style jsx>{`
                .filters-panel::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="h2 mono" style={{ color: 'var(--yellow)', margin: 0, textShadow: '0 0 5px var(--pink)' }}>Фільтри Каталогу</h2>
                <motion.button
                  className="btn-outline"
                  onClick={() => setIsFiltersOpen(false)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ padding: '8px 12px', fontSize: 10, borderRadius: '50%', background: 'rgba(255,0,127,0.1)' }}
                >
                  ×
                </motion.button>
              </div>

              {/* Пошук */}
              <input
                className="input"
                placeholder="Пошук по назвах..."
                onChange={e => setSearch(e.target.value)}
                style={{ borderRadius: '999px', fontFamily: 'Press Start 2P, cursive', fontSize: 12, textShadow: '0 0 5px var(--pink)' }}
              />

              {/* Категорії */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  ref={categoryButtonRef}
                  className="input"
                  onClick={() => {
                    setCategoryDropdownOpen(prev => !prev);
                    if (categoryDropdownOpen) setCategory('all');
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px var(--turquoise)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    borderRadius: '999px',
                    fontFamily: 'Press Start 2P, cursive',
                    fontSize: 12,
                    textShadow: '0 0 5px var(--pink)',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'var(--yellow)',
                  }}
                >
                  {categories.find(c => c.value === category)?.label} ▼
                </motion.button>
                <AnimatePresence>
                  {categoryDropdownOpen && (
                    <motion.ul
                      style={{
                        listStyle: 'none',
                        padding: 12,
                        background: 'linear-gradient(180deg, rgba(26,26,26,.95), rgba(12,12,12,.95))',
                        border: '2px solid var(--yellow)',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 0 20px var(--yellow), var(--shadow-card)',
                        position: 'absolute',
                        width: '100%',
                        zIndex: 1001,
                        top: '100%',
                        left: 0,
                      }}
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      {categories.map(cat => (
                        <motion.li
                          key={cat.value}
                          whileHover={{ background: 'rgba(255,215,0,.15)', translateX: 5 }}
                          style={{ marginBottom: 4 }}
                        >
                          <button
                            onClick={() => {
                              setCategory(cat.value);
                              setCategoryDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: category === cat.value ? 'rgba(255,215,0,.15)' : 'transparent',
                              color: 'var(--yellow)',
                              textAlign: 'left',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'Press Start 2P, cursive !important',
                              fontSize: 12,
                              textShadow: '0 0 5px var(--pink)',
                            }}
                          >
                            {cat.label}
                          </button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Сортування */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  ref={sortButtonRef}
                  className="input"
                  onClick={() => {
                    setSortDropdownOpen(prev => !prev);
                    if (sortDropdownOpen) setSort('name:asc');
                  }}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px var(--turquoise)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    borderRadius: '999px',
                    fontFamily: 'Press Start 2P, cursive',
                    fontSize: 12,
                    textShadow: '0 0 5px var(--pink)',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'var(--yellow)',
                  }}
                >
                  {sortOptions.find(s => s.value === sort)?.label} ▼
                </motion.button>
                <AnimatePresence>
                  {sortDropdownOpen && (
                    <motion.ul
                      style={{
                        listStyle: 'none',
                        padding: 12,
                        background: 'linear-gradient(180deg, rgba(26,26,26,.95), rgba(12,12,12,.95))',
                        border: '2px solid var(--yellow)',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 0 20px var(--yellow), var(--shadow-card)',
                        position: 'absolute',
                        width: '100%',
                        zIndex: 1001,
                        top: '100%',
                        left: 0,
                      }}
                      variants={dropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      {sortOptions.map(s => (
                        <motion.li
                          key={s.value}
                          whileHover={{ background: 'rgba(255,215,0,.15)', translateX: 5 }}
                          style={{ marginBottom: 4 }}
                        >
                          <button
                            onClick={() => {
                              setSort(s.value);
                              setSortDropdownOpen(false);
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: sort === s.value ? 'rgba(255,215,0,.15)' : 'transparent',
                              color: 'var(--yellow)',
                              textAlign: 'left',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'Press Start 2P, cursive !important',
                              fontSize: 12,
                              textShadow: '0 0 5px var(--pink)',
                            }}
                          >
                            {s.label}
                          </button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Ціна */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  className="input"
                  type="number"
                  placeholder="Ціна від..."
                  onChange={e => setPriceMin(e.target.value)}
                  style={{ borderRadius: '999px', fontFamily: 'Press Start 2P, cursive', fontSize: 12, textShadow: '0 0 5px var(--pink)' }}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Ціна до..."
                  onChange={e => setPriceMax(e.target.value)}
                  style={{ borderRadius: '999px', fontFamily: 'Press Start 2P, cursive', fontSize: 12, textShadow: '0 0 5px var(--pink)' }}
                />
              </div>

              {/* Чекбокси */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <label className="center" style={{ gap: 8, background: 'rgba(255,255,255,.04)', padding: '10px 20px', borderRadius: '999px' }}>
                  <input type="checkbox" checked={newOnly} onChange={e => setNewOnly(e.target.checked)} />
                  <span className="p" style={{ fontFamily: 'Press Start 2P, cursive', textShadow: '0 0 5px var(--pink)' }}>Нові (Новинки)</span>
                </label>
                <label className="center" style={{ gap: 8, background: 'rgba(255,255,255,.04)', padding: '10px 20px', borderRadius: '999px' }}>
                  <input type="checkbox" checked={usedOnly} onChange={e => setUsedOnly(e.target.checked)} />
                  <span className="p" style={{ fontFamily: 'Press Start 2P, cursive', textShadow: '0 0 5px var(--pink)' }}>Вживані</span>
                </label>
                <label className="center" style={{ gap: 8, background: 'rgba(255,255,255,.04)', padding: '10px 20px', borderRadius: '999px' }}>
                  <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} />
                  <span className="p" style={{ fontFamily: 'Press Start 2P, cursive', textShadow: '0 0 5px var(--pink)' }}>Лише в Наявності</span>
                </label>
              </div>

              {/* Жанри - окрема вкладка/секція з accordion */}
              <div>
                <motion.button
                  className="input"
                  onClick={() => setIsGenresOpen(!isGenresOpen)}
                  whileHover={{ scale: 1.02, boxShadow: '0 0 10px var(--turquoise)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    borderRadius: '999px',
                    fontFamily: 'Press Start 2P, cursive',
                    fontSize: 12,
                    textShadow: '0 0 5px var(--pink)',
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid rgba(255,255,255,.12)',
                    color: 'var(--turquoise)',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Жанри {isGenresOpen ? '▲' : '▼'}</span>
                </motion.button>
                <AnimatePresence>
                  {isGenresOpen && (
                    <motion.div
                      variants={genresVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 300, overflowY: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                        <style jsx>{`
                          div[style*="maxHeight"]::-webkit-scrollbar {
                            display: none;
                          }
                        `}</style>
                        {genres.map(genre => (
                          <label key={genre.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', padding: '8px 12px', borderRadius: '999px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedGenres.has(genre.key)}
                              onChange={() => toggleGenre(genre.key)}
                              style={{ cursor: 'pointer' }}
                            /> 
                            <span className="p" style={{ fontSize: 10, textShadow: '0 0 3px var(--pink)' }}>
                              {genre.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                className="btn shimmer"
                onClick={() => setIsFiltersOpen(false)}
                style={{ width: '100%', marginTop: 10 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Застосувати Фільтри
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Каталог — з shimmer і анімацією */}
      <div className="grid grid-4 shimmer" style={{ gap: 24 }}>
        {filtered.slice((page - 1) * perPage, page * perPage).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
      {filtered.length === 0 && (
        <div className="p center" style={{ padding: 40, fontFamily: 'Press Start 2P, cursive', textShadow: '0 0 5px var(--pink)' }}>
          Нічого не знайдено. Спробуйте інші фільтри!
        </div>
      )}

      {/* Пагінація — з disabled стилем */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32, marginBottom: 40 }}>
        <button
          className="btn-outline shimmer"
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          style={{ borderRadius: '999px', padding: '12px 24px', fontFamily: 'Press Start 2P, cursive', fontSize: 12, textShadow: '0 0 5px var(--pink)', opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
        >
          ← Попередня
        </button>
        <span className="p" style={{ alignSelf: 'center', fontFamily: 'Press Start 2P, cursive', textShadow: '0 0 5px var(--pink)' }}>
          Сторінка {page} з {totalPages}
        </span>
        <button
          className="btn-outline shimmer"
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
          style={{ borderRadius: '999px', padding: '12px 24px', fontFamily: 'Press Start 2P, cursive', fontSize: 12, textShadow: '0 0 5px var(--pink)', opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
        >
          Наступна →
        </button>
      </div>
    </div>
  );
}