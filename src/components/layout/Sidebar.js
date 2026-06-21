'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CalendarCheck, Users, BarChart2, Fingerprint, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/I18nProvider';

const navItems = [
  { href: '/', key: 'dashboard', icon: LayoutDashboard },
  { href: '/attendance', key: 'attendance', icon: CalendarCheck },
  { href: '/employees', key: 'employees', icon: Users },
  { href: '/reports', key: 'reports', icon: BarChart2 },
];

const bottomNavItems = [
  { href: '/settings', key: 'settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const { t } = useI18n();

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Fingerprint size={20} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <span className="brand">ZK Attendance</span>
          <span className="sub">HR Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">{t('sidebar.main_menu')}</span>
        {navItems.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
              <Icon size={16} />
              {t(`sidebar.${key}`)}
            </Link>
          );
        })}
        <span className="nav-section-label" style={{ marginTop: 'auto', paddingTop: 16 }}>{t('sidebar.system')}</span>
        {bottomNavItems.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
              <Icon size={16} />
              {t(`sidebar.${key}`)}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-time">{time}</div>
      </div>
    </aside>
  );
}
