// src/hooks/useTheme.js
import { useEffect, useState } from 'react';
import { initTheme, toggleTheme, getCurrentTheme, onThemeChange } from '../utils/themeManager';

export default function useTheme() {
  const [theme, setTheme] = useState(() => getCurrentTheme());
  useEffect(() => {
    const cleanup = initTheme();
    const off = onThemeChange(setTheme);
    return () => { off(); cleanup?.(); };
  }, []);
  const onToggle = () => setTheme(toggleTheme());
  return [theme, onToggle];
}
