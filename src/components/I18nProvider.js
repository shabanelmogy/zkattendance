'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

const dictionaries = { en, ar };

const I18nContext = createContext({
  lang: 'en',
  t: (key, params) => key,
  toggleLang: () => {},
});

export function I18nProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zk-lang') || 'en';
    setLang(saved);
    document.documentElement.lang = saved;
    document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
    setMounted(true);
  }, []);

  const toggleLang = () => {
    const next = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('zk-lang', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (keyPath, params = {}) => {
    const keys = keyPath.split('.');
    let value = dictionaries[lang];
    
    for (const key of keys) {
      if (value === undefined) break;
      value = value[key];
    }
    
    if (value === undefined) return keyPath;
    
    // Replace parameters e.g. {count}
    let res = value;
    for (const [k, v] of Object.entries(params)) {
      res = res.replace(`{${k}}`, v);
    }
    return res;
  };

  if (!mounted) {
    return (
      <>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var l = localStorage.getItem('zk-lang') || 'en';
                document.documentElement.lang = l;
                document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
              })();
            `,
          }}
        />
        {/* Render children without context initially to avoid hydration mismatch, 
            or rather, just render with default 'en' but it might flash. 
            Actually, the safest is to render invisibly or just render standard.
            We will render children. */}
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </>
    );
  }

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
