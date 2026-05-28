import { useState, useEffect } from 'react';

export type ThemeName = 'mono' | 'pine' | 'warm';

const THEMES: { key: ThemeName; label: string }[] = [
  { key: 'mono', label: '素白' },
  { key: 'pine', label: '松绿' },
  { key: 'warm', label: '暖黄' },
];

export { THEMES };

export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme-mode') === 'dark');
  const [theme, setTheme] = useState<ThemeName>(() => {
    return (localStorage.getItem('theme-name') as ThemeName) || 'mono';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme-mode', dark ? 'dark' : 'light');
    localStorage.setItem('theme-name', theme);
  }, [dark, theme]);

  function toggle() { setDark((d) => !d); }
  function setThemeName(name: ThemeName) { setTheme(name); }

  return { dark, theme, toggle, setThemeName };
}
