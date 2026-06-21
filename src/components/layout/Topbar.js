'use client';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useI18n } from '@/components/I18nProvider';

const keys = {
  '/': 'dashboard',
  '/attendance': 'attendance',
  '/employees': 'employees',
  '/reports': 'reports',
  '/settings': 'settings',
};

export default function Topbar() {
  const pathname = usePathname();
  const pageKey = keys[pathname] || 'dashboard';
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useI18n();

  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{t(`topbar.${pageKey}_title`)}</span>
        <span className="topbar-sub">{t(`topbar.${pageKey}_sub`)}</span>
      </div>
      <div className="topbar-right">
        <div className="topbar-badge">
          <span className="dot" />
          {today}
        </div>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="btn btn-ghost"
          style={{ width: 34, height: 34, padding: 0, display: 'flex', justifyContent: 'center' }}
          title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
        >
          <Languages size={18} />
          <span style={{ fontSize: '0.65rem', fontWeight: 600, marginLeft: 4, marginTop: 2 }}>
            {lang === 'en' ? 'AR' : 'EN'}
          </span>
        </button>

        {/* Theme toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="theme-toggle"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          <span className={`theme-toggle-track ${theme}`}>
            <span className="theme-toggle-thumb">
              {theme === 'dark'
                ? <Moon size={11} strokeWidth={2.5} />
                : <Sun size={11} strokeWidth={2.5} />
              }
            </span>
          </span>
        </button>
      </div>
    </header>
  );
}
