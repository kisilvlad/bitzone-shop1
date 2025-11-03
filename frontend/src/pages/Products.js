// frontend/src/pages/Products.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

/* ======================== Styled (ОНОВЛЕНО) ======================== */
const Page = styled.section`
  &.container { overflow-x: hidden; }
`;
const HeaderBar = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 14px;
`;
const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap; gap: 8px; justify-content: center;
  .tab-btn {
    padding: 8px 12px; border-radius: 12px; font-weight: 800; letter-spacing: .2px;
    border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
    [data-theme="light"] & {
      background: var(--surface-input);
    }
    color: var(--text-primary); /* <-- ЗМІНЕНО */
    text-decoration: none;
    transition: transform .12s ease, box-shadow .15s ease, border-color .15s ease;
  }
  .tab-btn:hover { 
    transform: translateY(-1px); 
    border-color: var(--accent-turquoise);
  }
  .tab-btn.active {
    border-color: var(--accent-turquoise);
    box-shadow: 0 10px 26px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,.08);
    [data-theme="light"] & {
       box-shadow: 0 10px 26px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(0,0,0,.04);
    }
    color: var(--accent-turquoise);
  }
`;
const Layout = styled.div`
  display: grid; gap: 18px;
  grid-template-columns: 280px 1fr;
  @media (max-width: 992px) { grid-template-columns: 1fr; }
`;
const Sidebar = styled.aside`
  display: none;
  @media (min-width: 993px) { display: block; }
  position: sticky;
  top: 84px;
  align-self: start;
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  border-radius: 16px;
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  box-shadow: var(--shadow-card); /* <-- ЗМІНЕНО */
  padding: 14px;
`;
const TopControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; gap: 10px;
  margin: 22px 0 16px; flex-wrap: wrap;
`;
const FilterBtn = styled.button`
  padding: 10px 14px; border-radius: 999px;
  font-weight: 900;
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255,255,255,.08);
  [data-theme="light"] & {
     box-shadow: var(--shadow-card), inset 0 1px 0 rgba(0,0,0,.04);
  }
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: transform .12s ease, box-shadow .15s ease;
  &:hover { transform: translateY(-1px); }
  @media (min-width: 993px) { display: none; }
`;
const SortRow = styled.div`
  display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;
  width: 100%;
  @media (min-width: 541px) { width: auto; }
`;
const SortBtn = styled.button`
  padding: 7px 10px; border-radius: 10px; font-weight: 800;
  letter-spacing: .2px;
  border: 1px solid ${({active})=>active?'var(--accent-turquoise)':'var(--border-input)'}; /* <-- ЗМІНЕНО */
  background: ${({active})=>active
    ? 'linear-gradient(180deg, rgba(0,245,255,.12), rgba(0,245,255,.06))' 
    : 'var(--surface-input)'}; /* <-- ЗМІНЕНО */
  color: ${({active})=>active?'var(--accent-turquoise)':'var(--text-primary)'}; /* <-- ЗМІНЕНО */
  transition: transform .12s ease, box-shadow .15s ease;
  &:hover { transform: translateY(-1px); }
`;
const GButton = styled.button`
  position: relative;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: .2px;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: transform .12s ease, box-shadow .15s ease, border-color .15s ease, opacity .2s ease;
  cursor: ${({disabled})=>disabled?'not-allowed':'pointer'};
  width: ${({full}) => full ? '100%' : 'auto'};
  &:hover { transform: ${({disabled})=>disabled?'none':'translateY(-1px)'}; }
  &:active { transform: ${({disabled})=>disabled?'none':'translateY(0) scale(.98)'}; }

  ${({variant}) => {
    switch (variant) {
      case 'primary':
        return `
          color: var(--text-primary);
          border: 1px solid var(--accent-turquoise); /* <-- ЗМІНЕНО */
          background: linear-gradient(180deg, rgba(0,245,255,.12), rgba(255,215,0,.10));
          [data-theme="light"] & {
             background: linear-gradient(180deg, rgba(0,245,255,.12), rgba(255,215,0,.10));
          }
          box-shadow: 0 12px 30px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,.08);
        `;
      case 'danger':
        return `
          color: var(--text-primary);
          border: 1px solid var(--accent-pink); /* <-- ЗМІНЕНО */
          background: linear-gradient(180deg, rgba(255,0,127,.12), rgba(255,0,127,.08));
          box-shadow: 0 12px 30px var(--shadow-btn-pink), inset 0 1px 0 rgba(255,255,255,.06);
        `;
      default: // 'outline'
        return `
          color: var(--text-primary);
          border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
          background: var(--surface-input); /* <-- ЗМІНЕНО */
          box-shadow: 0 10px 24px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.06);
          [data-theme="light"] & {
             box-shadow: 0 10px 24px rgba(0,0,0,.05), inset 0 1px 0 rgba(0,0,0,.02);
          }
        `;
    }
  }}
`;
const SheetOverlay = styled(motion.div)`
  position: fixed; inset: 0;
  z-index: 70;
  background: rgba(0,0,0,.45);
  backdrop-filter: blur(2px);
  [data-theme="light"] & {
    background: rgba(0,0,0,.25);
  }
`;
const SheetPanel = styled(motion.aside)`
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 71;
  border-bottom-left-radius: 18px; border-bottom-right-radius: 18px;
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  border-bottom: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  box-shadow: var(--shadow-card-hover); /* <-- ЗМІНЕНО */
  max-height: 86vh;
  display: flex; flex-direction: column; overflow: hidden;
  @media (min-width: 993px) { display: none; }
`;
const SheetHeader = styled.div`
  display: flex;
  align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
`;
const SheetBody = styled.div`
  padding: 14px 16px;
  overflow: auto; flex: 1;
  display: grid; gap: 14px;
`;
const SheetFooter = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  display: flex;
  gap: 10px; justify-content: space-between; align-items: center;
`;
const Group = styled.div``;
const GroupTitle = styled.div`
  font-size: 12px; text-transform: uppercase; letter-spacing: .6px;
  color: var(--accent-turquoise);
  margin-bottom: 8px;
`;
const Box = styled.div`
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  border-radius: 12px; padding: 10px;
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;
const SearchInput = styled.input`
  width: 100%; padding: 10px 12px; border-radius: 10px;
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  outline: none;
`;
const Row = styled.div` display:flex; gap:10px; align-items:center; `;
const NumberInput = styled.input`
  width: 100%; padding: 8px 10px; border-radius: 10px;
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  outline: none;
`;
const Check = styled.label`
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer;
  user-select: none;
  color: var(--text-primary); /* <-- ЗМІНЕНО */
  padding: 7px 8px; border-radius: 10px;
  transition: background .15s ease, border-color .15s ease, transform .08s ease;
  border: 1px solid transparent;
  &:hover { background: var(--surface-input); } /* <-- ЗМІНЕНО */
  input { appearance: none; width: 16px; height: 16px; border-radius: 4px;
    border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
    background: var(--surface-input); /* <-- ЗМІНЕНО */
    display: grid; place-items: center;
  }
  input:checked {
    border-color: var(--accent-yellow);
    background: linear-gradient(180deg, var(--accent-yellow), var(--accent-yellow-dark)); /* <-- ЗМІНЕНО */
    box-shadow: 0 4px 12px var(--shadow-neon); /* <-- ЗМІНЕНО */
  }
`;
const Chipbar = styled.div`
  display: flex; flex-wrap: wrap;
  gap: 8px; margin: 6px 0 18px;
`;
const Chip = styled.button`
  border: 1px solid var(--border-input); /* <-- ЗМІНЕНО */
  background: var(--surface-input); /* <-- ЗМІНЕНО */
  border-radius: 999px; padding: 6px 10px; font-size: 11px;
  color: var(--text-secondary); /* <-- ЗМІНЕНО */
  display: inline-flex; gap: 8px; align-items: center; cursor: pointer;
`;
const ProductsGrid = styled.div`
  display: grid; gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  @media (min-width: 541px) and (max-width: 1100px) {
    grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;
  }
  @media (min-width: 1101px) {
    grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px;
  }
`;
const ProductItem = styled(motion.div)`min-width: 0;`;
const fmItem = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const Pager = styled.div`
  display:flex; justify-content:center; align-items:center;
  gap: 12px; margin-top: 28px; flex-wrap: wrap;
`;
const PagerLabel = styled.span`
  font-size: 12px; opacity: .85;
  padding: 8px 10px; border-radius: 10px;
  border: 1px solid var(--border-primary); /* <-- ЗМІНЕНО */
  background: var(--surface-gradient); /* <-- ЗМІНЕНО */
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
`;
const PagerBtn = styled.button`
  position: relative;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 800; letter-spacing: .2px;
  color: ${({disabled})=>disabled?'var(--text-secondary)':'var(--text-primary)'}; /* <-- ЗМІНЕНО */
  border: 1px solid ${({disabled})=>disabled?'var(--border-input)':'var(--accent-turquoise)'}; /* <-- ЗМІНЕНО */
  background: ${({disabled})=>disabled
    ? 'var(--surface-input)'
    : 'linear-gradient(180deg, rgba(0,245,255,.10), rgba(255,215,0,.08))'}; /* <-- ЗМІНЕНО */
  box-shadow: ${({disabled})=>disabled?'none':'0 12px 30px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,.08)'}; /* <-- ЗМІНЕНО */
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: transform .12s ease, box-shadow .15s ease, border-color .15s ease, opacity .2s ease;
  cursor: ${({disabled})=>disabled?'not-allowed':'pointer'};
  &:hover { transform: ${({disabled})=>disabled?'none':'translateY(-1px)'}; }
  &:active { transform: ${({disabled})=>disabled?'none':'translateY(0) scale(.98)'}; }
`;
/* ======================== Helpers (без змін) ======================== */

function useQuery() {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search), [loc.search]);
}

/* ======================== Page (без змін в логіці) ======================== */

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const params = useQuery();
  const navigate = useNavigate();
  const loc = useLocation();
  
  // URL -> state
  const categoryId  = params.get('category') || '';
  const sortOption  = params.get('sort') || '';
  const page        = parseInt(params.get('page') || '1', 10);
  const minPrice    = params.get('minPrice') || '';
  const maxPrice    = params.get('maxPrice') || '';
  const searchParam = params.get('search') || '';
  const typesParam  = params.get('types')  || '';
  const platsParam  = params.get('platforms') || '';

  // UI state for filter inputs
  const [ui, setUi] = useState({
    search: searchParam,
    minPrice, maxPrice,
    category: categoryId,
    types: {
      consoles: typesParam.includes('consoles'),
      games:    typesParam.includes('games'),
      accs:     typesParam.includes('accs'),
    },
    platforms: {
      sony: platsParam.includes('sony'),
      xbox: platsParam.includes('xbox'),
      nintendo: platsParam.includes('nintendo'),
      steamdeck: platsParam.includes('steamdeck'),
    }
  });

  // Синхронізація UI state при зміні URL (напр. клік по табу категорії)
  useEffect(() => {
    setUi(s => ({
      ...s,
      search: searchParam,
      minPrice, maxPrice,
      category: categoryId,
      types: {
        consoles: typesParam.includes('consoles'),
        games:    typesParam.includes('games'),
        accs:     typesParam.includes('accs'),
      },
      platforms: {
        sony: platsParam.includes('sony'),
        xbox: platsParam.includes('xbox'),
        nintendo: platsParam.includes('nintendo'),
        steamdeck: platsParam.includes('steamdeck'),
      }
    }));
  }, [categoryId, minPrice, maxPrice, searchParam, typesParam, platsParam]);
  
  /* ---------- Fetch products ---------- */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = params.toString();
        const { data } = await axios.get(`http://bitzone-shop1.onrender.com/api/products?${qs}`);
        setProducts(data?.products || []);
        const total = data?.total ?? 0;
        setTotalPages(Math.max(1, Math.ceil(total / 20))); // limit=20
      } catch (err) {
        setError('Помилка завантаження товарів');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [params]);
  
  /* ---------- Fetch categories ---------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('http://bitzone-shop1.onrender.com/api/products/categories');
        setCategories(data || []);
      } catch (err) {
        console.error('Помилка завантаження категорій:', err);
      }
    };
    fetchCategories();
  }, []);
  
  /* ---------- URL helpers ---------- */
  const updateUrl = useCallback((entries) => {
    const p = new URLSearchParams(loc.search);
    Object.entries(entries).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') p.delete(k);
      else p.set(k, String(v));
    });
    p.set('page', '1'); // при зміні фільтрів — завжди на 1 сторінку
    navigate(`${loc.pathname}?${p.toString()}`, { replace: true });
  }, [loc.pathname, loc.search, navigate]);
  
  const applyFilters = (next = ui) => {
    const typesStr = Object.entries(next.types).filter(([,v])=>v).map(([k])=>k).join(',');
    const platsStr = Object.entries(next.platforms).filter(([,v])=>v).map(([k])=>k).join(',');
    updateUrl({
      category: next.category || '',
      minPrice: next.minPrice || '',
      maxPrice: next.maxPrice || '',
      search:   next.search || '',
      types:    typesStr || '',
      platforms: platsStr || ''
    });
  };

  const resetAll = () => {
    const blank = {
      search: '',
      minPrice: '', maxPrice: '',
      category: '',
      types: { consoles:false, games:false, accs:false },
      platforms: { sony:false, xbox:false, nintendo:false, steamdeck:false }
    };
    setUi(blank);
    // Скидаємо всі параметри в URL
    navigate(loc.pathname, { replace: true });
  };
  
  const setSort = (val) => {
    const p = new URLSearchParams(loc.search);
    p.set('page', '1');
    if (val) p.set('sort', val);
    else p.delete('sort');
    navigate(`${loc.pathname}?${p.toString()}`);
  };

  const handlePageChange = (newPage) => {
    const p = new URLSearchParams(loc.search);
    p.set('page', String(newPage));
    navigate(`${loc.pathname}?${p.toString()}`);
  };

  /* ---------- Active chips ---------- */
  const activeChips = [];
  if (categoryId) {
    const found = categories.find(c => String(c.id) === String(categoryId));
    activeChips.push({ key: 'category', label: found?.name || `Категорія #${categoryId}` });
  }
  if (minPrice) activeChips.push({ key: 'minPrice', label: `Від ${minPrice} грн` });
  if (maxPrice) activeChips.push({ key: 'maxPrice', label: `До ${maxPrice} грн` });
  if (typesParam) {
    const arr = [];
    if (typesParam.includes('consoles')) arr.push('Консолі');
    if (typesParam.includes('games'))    arr.push('Ігри');
    if (typesParam.includes('accs'))     arr.push('Аксесуари');
    if (arr.length) activeChips.push({ key: 'types', label: `Тип: ${arr.join(', ')}` });
  }
  if (platsParam) {
    const arr = [];
    if (platsParam.includes('sony'))     arr.push('Sony');
    if (platsParam.includes('xbox'))     arr.push('Xbox');
    if (platsParam.includes('nintendo')) arr.push('Nintendo');
    if (platsParam.includes('steamdeck'))arr.push('Steam Deck');
    if (arr.length) activeChips.push({ key: 'platforms', label: `Платформа: ${arr.join(', ')}` });
  }
  if (searchParam) activeChips.push({ key: 'search', label: `Пошук: "${searchParam}"` });
  
  const clearFilter = (key) => {
    updateUrl({ [key]: '' });
  };
  
  /* ======================== Render (ОНОВЛЕНО) ======================== */
  if (error) return <p className="p center" style={{ color: 'var(--accent-pink)' }}>{error}</p>; // <-- ЗМІНЕНО
  
  return (
    <Page className="container">
      <HeaderBar>
        <h1 className="h1 retro" style={{ textAlign: 'center', marginBottom: 4 }}>Каталог товарів</h1>
        {categories.length > 0 && (
          <Tabs>
            <Link to="/products" className={`tab-btn ${!categoryId ? 'active' : ''}`}>Всі категорії</Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/products?${new URLSearchParams({ category: String(cat.id) }).toString()}`}
                className={`tab-btn ${String(categoryId) === String(cat.id) ? 'active' : ''}`}
              >
                {cat.name}
              </Link>
            ))}
          </Tabs>
        )}
      </HeaderBar>

      <Layout>
        <Sidebar>
            <Group>
                <GroupTitle>Пошук</GroupTitle>
                <Box>
                    <SearchInput
                        placeholder="Назва товару..."
                        value={ui.search}
                        onChange={e => setUi(s => ({ ...s, search: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                    />
                </Box>
            </Group>
            <Group>
                <GroupTitle>Ціна, грн</GroupTitle>
                <Box>
                    <Row>
                        <NumberInput type="number" inputMode="numeric" placeholder="Від" value={ui.minPrice} onChange={e => setUi(s => ({ ...s, minPrice: e.target.value }))} />
                        <NumberInput type="number" inputMode="numeric" placeholder="До" value={ui.maxPrice} onChange={e => setUi(s => ({ ...s, maxPrice: e.target.value }))} />
                    </Row>
                </Box>
            </Group>
            <Group>
                <GroupTitle>Тип</GroupTitle>
                <Box>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <Check><input type="checkbox" checked={ui.types.consoles} onChange={() => setUi(s => ({ ...s, types: { ...s.types, consoles: !s.types.consoles } }))} />Консолі</Check>
                        <Check><input type="checkbox" checked={ui.types.games} onChange={() => setUi(s => ({ ...s, types: { ...s.types, games: !s.types.games } }))} />Ігри</Check>
                        <Check><input type="checkbox" checked={ui.types.accs} onChange={() => setUi(s => ({ ...s, types: { ...s.types, accs: !s.types.accs } }))} />Аксесуари</Check>
                    </div>
                </Box>
            </Group>
            <Group>
                <GroupTitle>Платформи</GroupTitle>
                <Box>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <Check><input type="checkbox" checked={ui.platforms.sony} onChange={() => setUi(s => ({ ...s, platforms: { ...s.platforms, sony: !s.platforms.sony } }))} />Sony / PlayStation</Check>
                        <Check><input type="checkbox" checked={ui.platforms.xbox} onChange={() => setUi(s => ({ ...s, platforms: { ...s.platforms, xbox: !s.platforms.xbox } }))} />Xbox</Check>
                        <Check><input type="checkbox" checked={ui.platforms.nintendo} onChange={() => setUi(s => ({ ...s, platforms: { ...s.platforms, nintendo: !s.platforms.nintendo } }))} />Nintendo</Check>
                        <Check><input type="checkbox" checked={ui.platforms.steamdeck} onChange={() => setUi(s => ({ ...s, platforms: { ...s.platforms, steamdeck: !s.platforms.steamdeck } }))} />Steam Deck</Check>
                    </div>
                </Box>
            </Group>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexDirection: 'column' }}>
                <GButton variant="primary" onClick={() => applyFilters()}>Застосувати</GButton>
                <GButton variant="danger" onClick={resetAll}>Очистити всі</GButton>
            </div>
        </Sidebar>

        <div>
            {activeChips.length > 0 && (
                <Chipbar>
                    {activeChips.map((c, i) => (
                        <Chip key={i} onClick={() => clearFilter(c.key)} title="Скинути">
                            <span>{c.label}</span><span aria-hidden>×</span>
                        </Chip>
                    ))}
                    <Chip onClick={resetAll} title="Очистити всі">Очистити всі ×</Chip>
                </Chipbar>
            )}

            <TopControls>
                <FilterBtn onClick={() => setSheetOpen(true)}>⚙️ Фільтри та сортування</FilterBtn>
                <SortRow>
                    <SortBtn active={sortOption === 'newest'} onClick={() => setSort('newest')}>Нові</SortBtn>
                    <SortBtn active={sortOption === 'price-asc'} onClick={() => setSort('price-asc')}>Дешевші</SortBtn>
                    <SortBtn active={sortOption === 'price-desc'} onClick={() => setSort('price-desc')}>Дорожчі</SortBtn>
                </SortRow>
            </TopControls>

            {loading ? (
                <p className="p center" style={{ marginTop: 20, color: 'var(--text-secondary)' }}>Завантаження товарів...</p> /* <-- ЗМІНЕНО */
            ) : (
                <>
                    <ProductsGrid>
                        <AnimatePresence>
                            {products.map((product) => (
                                <ProductItem key={product._id} variants={fmItem} initial="hidden" animate="visible" exit="hidden" layout>
                                    <ProductCard product={product} />
                                </ProductItem>
                            ))}
                        </AnimatePresence>
                    </ProductsGrid>
                    {products.length === 0 && !loading && (
                        <p className="p center" style={{ color: 'var(--text-secondary)', marginTop: 20 }}> {/* <-- ЗМІНЕНО */}
                            Товарів не знайдено. Спробуйте змінити фільтри.
                        </p>
                    )}
                </>
            )}

            {products.length > 0 && totalPages > 1 && (
                <Pager>
                    <PagerBtn disabled={page === 1} onClick={() => handlePageChange(page - 1)}>← Попередня</PagerBtn>
                    <PagerLabel>Сторінка {page} з {totalPages}</PagerLabel>
                    <PagerBtn disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Наступна →</PagerBtn>
                </Pager>
            )}
        </div>
    </Layout>
      
      {/* Mobile Top Sheet (Фільтри зверху) */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <SheetOverlay
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <SheetPanel
              initial={{ y: '-100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: .25 }}
              onClick={(e)=>e.stopPropagation()}
            >
              <SheetHeader>
                <div className="mono" style={{ color:'var(--accent-turquoise)' }}>Фільтри</div> {/* <-- ЗМІНЕНО */}
                <GButton variant="outline" onClick={() => setSheetOpen(false)}>Закрити ×</GButton>
              </SheetHeader>
              <SheetBody>
                {/* Вміст мобільних фільтрів аналогічний десктопним */}
                <Group>
                  <GroupTitle>Пошук</GroupTitle>
                  <Box>
                    <SearchInput placeholder="Назва товару..." value={ui.search} onChange={e=>setUi(s=>({ ...s, search: e.target.value }))} />
                  </Box>
                </Group>
                 <Group>
                    <GroupTitle>Ціна, грн</GroupTitle>
                    <Box>
                        <Row>
                            <NumberInput type="number" inputMode="numeric" placeholder="Від" value={ui.minPrice} onChange={e=>setUi(s=>({ ...s, minPrice: e.target.value }))} />
                            <NumberInput type="number" inputMode="numeric" placeholder="До" value={ui.maxPrice} onChange={e=>setUi(s=>({ ...s, maxPrice: e.target.value }))} />
                        </Row>
                    </Box>
                </Group>
                <Group>
                    <GroupTitle>Тип</GroupTitle>
                    <Box>
                        <div style={{ display:'grid', gap: 6 }}>
                            <Check><input type="checkbox" checked={ui.types.consoles} onChange={()=>setUi(s=>({ ...s, types:{...s.types, consoles:!s.types.consoles} }))} />Консолі</Check>
                            <Check><input type="checkbox" checked={ui.types.games}    onChange={()=>setUi(s=>({ ...s, types:{...s.types, games:!s.types.games} }))} />Ігри</Check>
                            <Check><input type="checkbox" checked={ui.types.accs}     onChange={()=>setUi(s=>({ ...s, types:{...s.types, accs:!s.types.accs} }))} />Аксесуари</Check>
                        </div>
                    </Box>
                </Group>
                <Group>
                  <GroupTitle>Платформи</GroupTitle>
                  <Box>
                    <div style={{ display:'grid', gap: 6 }}>
                        <Check><input type="checkbox" checked={ui.platforms.sony} onChange={()=>setUi(s=>({ ...s, platforms:{...s.platforms, sony:!s.platforms.sony} }))} />Sony / PlayStation</Check>
                        <Check><input type="checkbox" checked={ui.platforms.xbox} onChange={()=>setUi(s=>({ ...s, platforms:{...s.platforms, xbox:!s.platforms.xbox} }))} />Xbox</Check>
                        <Check><input type="checkbox" checked={ui.platforms.nintendo} onChange={()=>setUi(s=>({ ...s, platforms:{...s.platforms, nintendo:!s.platforms.nintendo} }))} />Nintendo</Check>
                        <Check><input type="checkbox" checked={ui.platforms.steamdeck} onChange={()=>setUi(s=>({ ...s, platforms:{...s.platforms, steamdeck:!s.platforms.steamdeck} }))} />Steam Deck</Check>
                    </div>
                  </Box>
                </Group>
              </SheetBody>
              <SheetFooter>
                <GButton variant="danger" onClick={resetAll}>Очистити</GButton>
                <GButton variant="primary" onClick={()=>{ applyFilters(); setSheetOpen(false); }} full>Застосувати</GButton>
              </SheetFooter>
            </SheetPanel>
          </>
        )}
      </AnimatePresence>
    </Page>
  );
}