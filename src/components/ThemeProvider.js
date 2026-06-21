'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Read persisted preference
    const saved = localStorage.getItem('zk-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('zk-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
