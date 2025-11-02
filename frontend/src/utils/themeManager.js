// src/utils/themeManager.js

const KEY = 'theme';                        // 'light' | 'dark'
const listeners = new Set();                // підписники на зміну теми

function ensureThemeMeta(color) {
  // статусбар на мобільних
  let m = document.querySelector('meta[name="theme-color"]');
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute('name', 'theme-color');
    document.head.appendChild(m);
  }
  m.setAttribute('content', color);
}

export function getSavedTheme() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getCurrentTheme() {
  return (
    document.documentElement.getAttribute('data-theme') ||
    getSavedTheme() ||
    getSystemTheme() ||
    'dark'
  );
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch {}

  // добір кольору для статусбару
  ensureThemeMeta(t === 'light' ? '#ffffff' : '#0A0A0A');

  // нотифікація підписників
  listeners.forEach(fn => { try { fn(t); } catch {} });
  return t;
}

// ініціалізація на старті додатку
export function initTheme() {
  const saved = getSavedTheme();
  const initial = saved || getSystemTheme() || 'dark';
  applyTheme(initial);

  // якщо користувач НЕ зберіг тему — підлаштовуємося під системну
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onMq = e => { if (!getSavedTheme()) applyTheme(e.matches ? 'dark' : 'light'); };
  if (mq?.addEventListener) mq.addEventListener('change', onMq);

  // синхронізація між вкладками
  const onStorage = (e) => { if (e.key === KEY && e.newValue) applyTheme(e.newValue); };
  window.addEventListener('storage', onStorage);

  // при розмонтуванні (якщо колись викличеш повторно)
  return () => {
    if (mq?.removeEventListener) mq.removeEventListener('change', onMq);
    window.removeEventListener('storage', onStorage);
  };
}

export function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  return applyTheme(next);
}

export function onThemeChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
