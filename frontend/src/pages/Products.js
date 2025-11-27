// frontend/src/pages/Products.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';

/* ======================== Styled ======================== */
const Page = styled.section`
  &.container {
    overflow-x: hidden;
  }
`;

const HeaderBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  justify-content: space-between;
  align-items: center;
`;

const Layout = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: 280px 1fr;
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  display: none;
  @media (min-width: 993px) {
    display: block;
  }
  position: sticky;
  top: 84px;
  align-self: start;
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  background: var(--surface-gradient);
  box-shadow: var(--shadow-card);
  padding: 16px 14px 18px;

  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  font-size: 13px;
  line-height: 1.5;

  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);

  [data-theme='light'] & {
    background: rgba(255, 255, 255, 0.92);
  }
`;

const TopControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 22px 0 16px;
  flex-wrap: wrap;
`;

const FilterBtn = styled.button`
  padding: 10px 18px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid var(--border-input);
  background: rgba(20, 20, 30, 0.9);
  color: var(--text-primary);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  [data-theme='light'] & {
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(0, 0, 0, 0.03);
  }
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.12s ease, box-shadow 0.15s ease,
    border-color 0.15s ease, background 0.15s ease;
  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-turquoise);
  }
  &:active {
    transform: translateY(0) scale(0.98);
  }
  @media (min-width: 993px) {
    display: none;
  }
`;

const SortRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const SortBtn = styled.button`
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 600;
  letter-spacing: 0.15px;
  font-size: 13px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  border: 1px solid
    ${({ active }) =>
      active ? 'var(--accent-turquoise)' : 'var(--border-input)'};
  background: ${({ active }) =>
    active
      ? 'linear-gradient(180deg, rgba(0,245,255,.12), rgba(0,245,255,.05))'
      : 'var(--surface-input)'};
  color: ${({ active }) =>
    active ? 'var(--accent-turquoise)' : 'var(--text-primary)'};
  transition: transform 0.12s ease, box-shadow 0.15s ease,
    border-color 0.15s ease, background 0.15s ease;
  box-shadow: ${({ active }) =>
    active ? '0 10px 26px rgba(0,0,0,.35)' : 'none'};
  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-turquoise);
  }
  &:active {
    transform: translateY(0) scale(0.98);
  }
`;

const GButton = styled.button`
  position: relative;
  padding: 10px 14px;
  border-radius: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  font-size: 13px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform 0.12s ease, box-shadow 0.15s ease,
    border-color 0.15s ease, opacity 0.2s ease, background 0.15s ease;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  width: ${({ full }) => (full ? '100%' : 'auto')};
  &:hover {
    transform: ${({ disabled }) => (disabled ? 'none' : 'translateY(-1px)')};
  }
  &:active {
    transform: ${({ disabled }) =>
      disabled ? 'none' : 'translateY(0) scale(.98)'};
  }

  ${({ variant }) => {
    switch (variant) {
      case 'primary':
        return `
          color: var(--text-primary);
          border: 1px solid var(--accent-turquoise);
          background: linear-gradient(180deg, rgba(0,245,255,.12), rgba(0,245,255,.06));
          box-shadow: 0 12px 30px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,.08);
        `;
      case 'danger':
        return `
          color: var(--text-primary);
          border: 1px solid var(--accent-pink);
          background: linear-gradient(180deg, rgba(255,0,127,.10), rgba(255,0,127,.06));
          box-shadow: 0 12px 30px var(--shadow-btn-pink), inset 0 1px 0 rgba(255,255,255,.06);
        `;
      default:
        return `
          color: var(--text-primary);
          border: 1px solid var(--border-input);
          background: var(--surface-input);
          box-shadow: 0 10px 24px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04);
          [data-theme="light"] & {
             box-shadow: 0 10px 24px rgba(0,0,0,.06), inset 0 1px 0 rgba(0,0,0,.02);
          }
        `;
    }
  }}
`;

const SheetOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  [data-theme='light'] & {
    background: rgba(0, 0, 0, 0.25);
  }
`;

const SheetPanel = styled(motion.aside)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 71;
  border-bottom-left-radius: 22px;
  border-bottom-right-radius: 22px;
  background: var(--surface-gradient);
  border-bottom: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card-hover);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @media (min-width: 993px) {
    display: none;
  }

  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  font-size: 13px;

  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  [data-theme='light'] & {
    background: rgba(255, 255, 255, 0.96);
  }
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-primary);
`;

const SheetBody = styled.div`
  padding: 14px 16px;
  overflow: auto;
  flex: 1;
  display: grid;
  gap: 14px;
`;

const SheetFooter = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  display: flex;
  gap: 10px;
  justify-content: space-between;
  align-items: center;
`;

const Group = styled.div``;

const GroupTitle = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent-turquoise);
  margin-bottom: 8px;
  font-weight: 600;
  opacity: 0.9;
`;

const Box = styled.div`
  border: 1px solid var(--border-primary);
  border-radius: 18px;
  padding: 11px 11px 10px;
  background: rgba(10, 10, 20, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  [data-theme='light'] & {
    background: rgba(255, 255, 255, 0.9);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-input);
  border: 1px solid var(--border-input);
  color: var(--text-primary);
  outline: none;
  font-size: 13px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background 0.15s ease;
  &:focus {
    border-color: var(--accent-turquoise);
    box-shadow: 0 0 0 1px rgba(0, 245, 255, 0.35);
    background: rgba(0, 0, 0, 0.5);
    [data-theme='light'] & {
      background: rgba(255, 255, 255, 1);
    }
  }
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--surface-input);
  border: 1px solid var(--border-input);
  color: var(--text-primary);
  outline: none;
  font-size: 13px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background 0.15s ease;
  &:focus {
    border-color: var(--accent-turquoise);
    box-shadow: 0 0 0 1px rgba(0, 245, 255, 0.35);
    background: rgba(0, 0, 0, 0.5);
    [data-theme='light'] & {
      background: rgba(255, 255, 255, 1);
    }
  }
`;

const Chipbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 18px;
`;

const Chip = styled.button`
  border: 1px solid var(--border-input);
  background: var(--surface-input);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  display: inline-flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  transition: transform 0.12s ease, border-color 0.15s ease,
    background 0.15s ease, color 0.15s ease;
  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-turquoise);
    color: var(--accent-turquoise);
  }
`;

const ProductsGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  @media (min-width: 541px) and (max-width: 1100px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  @media (min-width: 1101px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 18px;
  }
`;

const ProductItem = styled(motion.div)`
  min-width: 0;
`;

const fmItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Pager = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  flex-wrap: wrap;
`;

const PagerLabel = styled.span`
  font-size: 12px;
  opacity: 0.85;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-primary);
  background: var(--surface-gradient);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
`;

const PagerBtn = styled.button`
  position: relative;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 0.2px;
  color: ${({ disabled }) =>
    disabled ? 'var(--text-secondary)' : 'var(--text-primary)'};
  border: 1px solid
    ${({ disabled }) =>
      disabled ? 'var(--border-input)' : 'var(--accent-turquoise)'};
  background: ${({ disabled }) =>
    disabled
      ? 'var(--surface-input)'
      : 'linear-gradient(180deg, rgba(0,245,255,.10), rgba(255,215,0,.08))'};
  box-shadow: ${({ disabled }) =>
    disabled
      ? 'none'
      : '0 12px 30px var(--shadow-btn-turquoise), inset 0 1px 0 rgba(255,255,255,.08)'};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform 0.12s ease, box-shadow 0.15s ease,
    border-color 0.15s ease, opacity 0.2s ease;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  &:hover {
    transform: ${({ disabled }) => (disabled ? 'none' : 'translateY(-1px)')};
  }
  &:active {
    transform: ${({ disabled }) =>
      disabled ? 'none' : 'translateY(0) scale(.98)'};
  }
`;

/* ---- Category Tree styles ---- */
const CatRow = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    sans-serif;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.08s ease, box-shadow 0.15s ease, color 0.15s ease;

  &[data-selected='true'] {
    border-color: var(--accent-turquoise);
    color: var(--accent-turquoise);
    background: rgba(0, 245, 255, 0.06);
    box-shadow: 0 8px 22px rgba(0, 245, 255, 0.16);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateY(-1px);
  }

  [data-theme='light'] & {
    background: rgba(255, 255, 255, 0.85);
    &:hover {
      background: rgba(255, 255, 255, 1);
    }
  }
`;

const CatArrow = styled.span`
  font-size: 12px;
  opacity: 0.7;
  flex-shrink: 0;
`;

const CatChildren = styled(motion.div)`
  margin-left: 16px;
  margin-top: 4px;
  overflow: hidden;
  display: grid;
  gap: 4px;
`;

/* ======================== Helpers ======================== */
function useQuery() {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.search), [loc.search]);
}

function flattenCategoryMap(tree) {
  const map = {};
  const walk = (nodes) => {
    nodes.forEach((n) => {
      map[String(n.id)] = n.name;
      if (Array.isArray(n.children) && n.children.length) {
        walk(n.children);
      }
    });
  };
  walk(tree);
  return map;
}

/** Один вузол дерева категорій */
function CategoryNode({ node, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  const isSelectedSelf = String(selectedId) === String(node.id);

  const handleRowClick = () => {
    if (hasChildren) {
      setOpen((o) => !o); // головні + будь-які з дітьми тільки відкривають/закривають
    } else {
      onSelect(node.id); // листова — одразу фільтр
    }
  };

  return (
    <div>
      <CatRow type="button" onClick={handleRowClick}>
        <CatArrow>{hasChildren ? (open ? '▾' : '▸') : '•'}</CatArrow>
        <span>{node.name}</span>
      </CatRow>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {open && (
            <CatChildren
              key="children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Весь асортимент цієї категорії */}
              <CatRow
                type="button"
                data-selected={isSelectedSelf}
                onClick={() => onSelect(node.id)}
              >
                <CatArrow style={{ visibility: 'hidden' }}>•</CatArrow>
                <span style={{ fontStyle: 'italic' }}>Весь асортимент</span>
              </CatRow>

              {node.children.map((child) => (
                <CategoryNode
                  key={child.id}
                  node={child}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </CatChildren>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ======================== Page ======================== */
export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // плоскі root для чіпів
  const [categoryTree, setCategoryTree] = useState([]); // дерево для фільтрів
  const [categoryMap, setCategoryMap] = useState({}); // id -> name
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const params = useQuery();
  const navigate = useNavigate();
  const loc = useLocation();

  // URL -> state
  const categoryId = params.get('category') || '';
  const sortOption = params.get('sort') || 'newest';
  const page = parseInt(params.get('page') || '1', 10);
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const searchParam = params.get('search') || '';
  const typesParam = params.get('types') || '';
  const platsParam = params.get('platforms') || '';

  const [ui, setUi] = useState({
    search: searchParam,
    minPrice,
    maxPrice,
    category: categoryId,
    types: {
      consoles: typesParam.includes('consoles'),
      games: typesParam.includes('games'),
      accs: typesParam.includes('accs'),
    },
    platforms: {
      sony: platsParam.includes('sony'),
      xbox: platsParam.includes('xbox'),
      nintendo: platsParam.includes('nintendo'),
      steamdeck: platsParam.includes('steamdeck'),
    },
  });

  useEffect(() => {
    setUi((s) => ({
      ...s,
      search: searchParam,
      minPrice,
      maxPrice,
      category: categoryId,
      types: {
        consoles: typesParam.includes('consoles'),
        games: typesParam.includes('games'),
        accs: typesParam.includes('accs'),
      },
      platforms: {
        sony: platsParam.includes('sony'),
        xbox: platsParam.includes('xbox'),
        nintendo: platsParam.includes('nintendo'),
        steamdeck: platsParam.includes('steamdeck'),
      },
    }));
  }, [categoryId, minPrice, maxPrice, searchParam, typesParam, platsParam]);

  /* ---------- Products ---------- */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = params.toString();
        const { data } = await axios.get(`/api/products?${qs}`);
        setProducts(data?.products || []);
        const total = data?.total ?? 0;
        setTotalPages(Math.max(1, Math.ceil(total / 20)));
      } catch (err) {
        setError('Помилка завантаження товарів');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [params]);

  /* ---------- Flat categories (для чіпів) ---------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/products/categories');
        setCategories(data || []);
      } catch (err) {
        console.error('Помилка завантаження категорій (flat):', err);
      }
    };
    fetchCategories();
  }, []);

  /* ---------- Tree categories (для фільтрів) ---------- */
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const { data } = await axios.get('/api/categories/tree?type=product');
        const tree = Array.isArray(data) ? data : [];
        setCategoryTree(tree);
        setCategoryMap(flattenCategoryMap(tree));
      } catch (err) {
        console.error('Помилка завантаження дерева категорій:', err);
      }
    };
    fetchTree();
  }, []);

  /* ---------- URL helpers ---------- */
  const updateUrl = useCallback(
    (entries) => {
      const p = new URLSearchParams(loc.search);
      Object.entries(entries).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') p.delete(k);
        else p.set(k, String(v));
      });
      p.set('page', '1');
      navigate(`${loc.pathname}?${p.toString()}`, { replace: true });
    },
    [loc.pathname, loc.search, navigate]
  );

  const applyFilters = (next = ui) => {
    const typesStr = Object.entries(next.types)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    const platsStr = Object.entries(next.platforms)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',');
    updateUrl({
      category: next.category || '',
      minPrice: next.minPrice || '',
      maxPrice: next.maxPrice || '',
      search: next.search || '',
      types: typesStr || '',
      platforms: platsStr || '',
      sort: sortOption || 'newest',
    });
  };

  const resetAll = () => {
    const blank = {
      search: '',
      minPrice: '',
      maxPrice: '',
      category: '',
      types: { consoles: false, games: false, accs: false },
      platforms: { sony: false, xbox: false, nintendo: false, steamdeck: false },
    };
    setUi(blank);
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
    const foundFlat = categories.find(
      (c) => String(c.id) === String(categoryId)
    );
    const fromTree = categoryMap[String(categoryId)];
    activeChips.push({
      key: 'category',
      label: foundFlat?.name || fromTree || `Категорія #${categoryId}`,
    });
  }
  if (minPrice) activeChips.push({ key: 'minPrice', label: `Від ${minPrice} грн` });
  if (maxPrice) activeChips.push({ key: 'maxPrice', label: `До ${maxPrice} грн` });
  if (typesParam) {
    const arr = [];
    if (typesParam.includes('consoles')) arr.push('Консолі');
    if (typesParam.includes('games')) arr.push('Ігри');
    if (typesParam.includes('accs')) arr.push('Аксесуари');
    if (arr.length) activeChips.push({ key: 'types', label: `Тип: ${arr.join(', ')}` });
  }
  if (platsParam) {
    const arr = [];
    if (platsParam.includes('sony')) arr.push('Sony');
    if (platsParam.includes('xbox')) arr.push('Xbox');
    if (platsParam.includes('nintendo')) arr.push('Nintendo');
    if (platsParam.includes('steamdeck')) arr.push('Steam Deck');
    if (arr.length) activeChips.push({ key: 'platforms', label: `Платформа: ${arr.join(', ')}` });
  }
  if (searchParam) activeChips.push({ key: 'search', label: `Пошук: "${searchParam}"` });

  const clearFilter = (key) => {
    updateUrl({ [key]: '' });
  };

  if (error) {
    return (
      <p className="p center" style={{ color: 'var(--accent-pink)' }}>
        {error}
      </p>
    );
  }

  return (
    <Page className="container">
      <HeaderBar>
        <h1 className="h1 retro" style={{ marginBottom: 4 }}>
          Каталог товарів
        </h1>
        <SortRow>
          <SortBtn
            active={sortOption === 'newest' || !sortOption}
            onClick={() => setSort('newest')}
          >
            Нові
          </SortBtn>
          <SortBtn
            active={sortOption === 'price-asc'}
            onClick={() => setSort('price-asc')}
          >
            Дешевші
          </SortBtn>
          <SortBtn
            active={sortOption === 'price-desc'}
            onClick={() => setSort('price-desc')}
          >
            Дорожчі
          </SortBtn>
        </SortRow>
      </HeaderBar>

      <Layout>
        {/* ===== SIDEBAR FILTERS (DESKTOP) ===== */}
        <Sidebar>
          <Group>
            <GroupTitle>Категорія</GroupTitle>
            <Box>
              <CatRow
                type="button"
                data-selected={!ui.category}
                onClick={() =>
                  setUi((s) => ({ ...s, category: '' })) ||
                  updateUrl({ category: '' })
                }
              >
                <CatArrow style={{ visibility: 'hidden' }}>•</CatArrow>
                <span>Усі категорії</span>
              </CatRow>

              {categoryTree.length > 0 && (
                <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                  {categoryTree.map((node) => (
                    <CategoryNode
                      key={node.id}
                      node={node}
                      selectedId={ui.category}
                      onSelect={(id) => {
                        setUi((s) => ({ ...s, category: String(id) }));
                        updateUrl({ category: String(id) });
                      }}
                    />
                  ))}
                </div>
              )}
            </Box>
          </Group>

          <Group>
            <GroupTitle>Пошук</GroupTitle>
            <Box>
              <SearchInput
                placeholder="Назва товару..."
                value={ui.search}
                onChange={(e) =>
                  setUi((s) => ({ ...s, search: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters();
                }}
              />
            </Box>
          </Group>

          <Group>
            <GroupTitle>Ціна, грн</GroupTitle>
            <Box>
              <Row>
                <NumberInput
                  type="number"
                  inputMode="numeric"
                  placeholder="Від"
                  value={ui.minPrice}
                  onChange={(e) =>
                    setUi((s) => ({ ...s, minPrice: e.target.value }))
                  }
                />
                <NumberInput
                  type="number"
                  inputMode="numeric"
                  placeholder="До"
                  value={ui.maxPrice}
                  onChange={(e) =>
                    setUi((s) => ({ ...s, maxPrice: e.target.value }))
                  }
                />
              </Row>
            </Box>
          </Group>

          {/* Тип / Платформи — залишив як було, якщо що потім підчистимо */}
          <Group>
            <GroupTitle>Тип</GroupTitle>
            <Box>
              <div style={{ display: 'grid', gap: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.types.consoles}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        types: { ...s.types, consoles: !s.types.consoles },
                      }))
                    }
                  />{' '}
                  Консолі
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.types.games}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        types: { ...s.types, games: !s.types.games },
                      }))
                    }
                  />{' '}
                  Ігри
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.types.accs}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        types: { ...s.types, accs: !s.types.accs },
                      }))
                    }
                  />{' '}
                  Аксесуари
                </label>
              </div>
            </Box>
          </Group>

          <Group>
            <GroupTitle>Платформи</GroupTitle>
            <Box>
              <div style={{ display: 'grid', gap: 6 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.platforms.sony}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        platforms: { ...s.platforms, sony: !s.platforms.sony },
                      }))
                    }
                  />{' '}
                  Sony / PlayStation
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.platforms.xbox}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        platforms: { ...s.platforms, xbox: !s.platforms.xbox },
                      }))
                    }
                  />{' '}
                  Xbox
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.platforms.nintendo}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        platforms: {
                          ...s.platforms,
                          nintendo: !s.platforms.nintendo,
                        },
                      }))
                    }
                  />{' '}
                  Nintendo
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={ui.platforms.steamdeck}
                    onChange={() =>
                      setUi((s) => ({
                        ...s,
                        platforms: {
                          ...s.platforms,
                          steamdeck: !s.platforms.steamdeck,
                        },
                      }))
                    }
                  />{' '}
                  Steam Deck
                </label>
              </div>
            </Box>
          </Group>

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 12,
              flexDirection: 'column',
            }}
          >
            <GButton variant="primary" onClick={() => applyFilters()}>
              Застосувати
            </GButton>
            <GButton variant="danger" onClick={resetAll}>
              Очистити всі
            </GButton>
          </div>
        </Sidebar>

        {/* ===== MAIN CONTENT ===== */}
        <div>
          {activeChips.length > 0 && (
            <Chipbar>
              {activeChips.map((c, i) => (
                <Chip key={i} onClick={() => clearFilter(c.key)} title="Скинути">
                  <span>{c.label}</span>
                  <span aria-hidden>×</span>
                </Chip>
              ))}
              <Chip onClick={resetAll} title="Очистити всі">
                Очистити всі ×
              </Chip>
            </Chipbar>
          )}

          <TopControls>
            <FilterBtn onClick={() => setSheetOpen(true)}>
              ⚙️ Фільтри та сортування
            </FilterBtn>
          </TopControls>

          {loading ? (
            <p
              className="p center"
              style={{ marginTop: 20, color: 'var(--text-secondary)' }}
            >
              Завантаження товарів...
            </p>
          ) : (
            <>
              <ProductsGrid>
                <AnimatePresence>
                  {products.map((product) => (
                    <ProductItem
                      key={product._id}
                      variants={fmItem}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      layout
                    >
                      <ProductCard product={product} />
                    </ProductItem>
                  ))}
                </AnimatePresence>
              </ProductsGrid>
              {products.length === 0 && !loading && (
                <p
                  className="p center"
                  style={{ color: 'var(--text-secondary)', marginTop: 20 }}
                >
                  Товарів не знайдено. Спробуйте змінити фільтри.
                </p>
              )}
            </>
          )}

          {products.length > 0 && totalPages > 1 && (
            <Pager>
              <PagerBtn
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ← Попередня
              </PagerBtn>
              <PagerLabel>
                Сторінка {page} з {totalPages}
              </PagerLabel>
              <PagerBtn
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Наступна →
              </PagerBtn>
            </Pager>
          )}
        </div>
      </Layout>

      {/* ===== MOBILE SHEET ===== */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <SheetOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <SheetPanel
              initial={{ y: '-100%' }}
              animate={{ y: 0 }}
              exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SheetHeader>
                <div
                  className="mono"
                  style={{ color: 'var(--accent-turquoise)' }}
                >
                  Фільтри
                </div>
                <GButton variant="outline" onClick={() => setSheetOpen(false)}>
                  Закрити ×
                </GButton>
              </SheetHeader>

              <SheetBody>
                <Group>
                  <GroupTitle>Сортування</GroupTitle>
                  <Box>
                    <SortRow>
                      <SortBtn
                        active={sortOption === 'newest' || !sortOption}
                        onClick={() => setSort('newest')}
                      >
                        Нові
                      </SortBtn>
                      <SortBtn
                        active={sortOption === 'price-asc'}
                        onClick={() => setSort('price-asc')}
                      >
                        Дешевші
                      </SortBtn>
                      <SortBtn
                        active={sortOption === 'price-desc'}
                        onClick={() => setSort('price-desc')}
                      >
                        Дорожчі
                      </SortBtn>
                    </SortRow>
                  </Box>
                </Group>

                <Group>
                  <GroupTitle>Категорія</GroupTitle>
                  <Box>
                    <CatRow
                      type="button"
                      data-selected={!ui.category}
                      onClick={() =>
                        setUi((s) => ({ ...s, category: '' })) ||
                        updateUrl({ category: '' })
                      }
                    >
                      <CatArrow style={{ visibility: 'hidden' }}>•</CatArrow>
                      <span>Усі категорії</span>
                    </CatRow>

                    {categoryTree.length > 0 && (
                      <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                        {categoryTree.map((node) => (
                          <CategoryNode
                            key={node.id}
                            node={node}
                            selectedId={ui.category}
                            onSelect={(id) => {
                              setUi((s) => ({ ...s, category: String(id) }));
                              updateUrl({ category: String(id) });
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </Box>
                </Group>

                <Group>
                  <GroupTitle>Пошук</GroupTitle>
                  <Box>
                    <SearchInput
                      placeholder="Назва товару..."
                      value={ui.search}
                      onChange={(e) =>
                        setUi((s) => ({ ...s, search: e.target.value }))
                      }
                    />
                  </Box>
                </Group>

                <Group>
                  <GroupTitle>Ціна, грн</GroupTitle>
                  <Box>
                    <Row>
                      <NumberInput
                        type="number"
                        inputMode="numeric"
                        placeholder="Від"
                        value={ui.minPrice}
                        onChange={(e) =>
                          setUi((s) => ({ ...s, minPrice: e.target.value }))
                        }
                      />
                      <NumberInput
                        type="number"
                        inputMode="numeric"
                        placeholder="До"
                        value={ui.maxPrice}
                        onChange={(e) =>
                          setUi((s) => ({ ...s, maxPrice: e.target.value }))
                        }
                      />
                    </Row>
                  </Box>
                </Group>

                {/* Додаткові фільтри */}
                <Group>
                  <GroupTitle>Тип</GroupTitle>
                  <Box>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.types.consoles}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              types: {
                                ...s.types,
                                consoles: !s.types.consoles,
                              },
                            }))
                          }
                        />{' '}
                        Консолі
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.types.games}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              types: { ...s.types, games: !s.types.games },
                            }))
                          }
                        />{' '}
                        Ігри
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.types.accs}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              types: { ...s.types, accs: !s.types.accs },
                            }))
                          }
                        />{' '}
                        Аксесуари
                      </label>
                    </div>
                  </Box>
                </Group>

                <Group>
                  <GroupTitle>Платформи</GroupTitle>
                  <Box>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.platforms.sony}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              platforms: {
                                ...s.platforms,
                                sony: !s.platforms.sony,
                              },
                            }))
                          }
                        />{' '}
                        Sony / PlayStation
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.platforms.xbox}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              platforms: {
                                ...s.platforms,
                                xbox: !s.platforms.xbox,
                              },
                            }))
                          }
                        />{' '}
                        Xbox
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.platforms.nintendo}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              platforms: {
                                ...s.platforms,
                                nintendo: !s.platforms.nintendo,
                              },
                            }))
                          }
                        />{' '}
                        Nintendo
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={ui.platforms.steamdeck}
                          onChange={() =>
                            setUi((s) => ({
                              ...s,
                              platforms: {
                                ...s.platforms,
                                steamdeck: !s.platforms.steamdeck,
                              },
                            }))
                          }
                        />{' '}
                        Steam Deck
                      </label>
                    </div>
                  </Box>
                </Group>
              </SheetBody>

              <SheetFooter>
                <GButton variant="danger" onClick={resetAll}>
                  Очистити
                </GButton>
                <GButton
                  variant="primary"
                  onClick={() => {
                    applyFilters();
                    setSheetOpen(false);
                  }}
                  full
                >
                  Застосувати
                </GButton>
              </SheetFooter>
            </SheetPanel>
          </>
        )}
      </AnimatePresence>
    </Page>
  );
}
