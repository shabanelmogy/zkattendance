'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { AttendanceTrendChart, StatusPieChart } from '@/components/dashboard/Charts';
import { LoadingSpinner } from '@/components/shared/States';
import { Users, UserCheck, UserX, Clock, TrendingUp, ArrowUpRight, LogIn, LogOut } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

function StatCard({ icon: Icon, iconClass, cardClass, label, value, sub }) {
  return (
    <div className={`stat-card ${cardClass} fade-in`}>
      <div className="stat-card-top">
        <div className={`stat-icon ${iconClass}`}><Icon size={16} /></div>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error((await res.json()).error);
      setStats(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greeting_morning');
    if (h < 17) return t('dashboard.greeting_afternoon');
    return t('dashboard.greeting_evening');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title">{getGreeting()}</h1>
              <p className="page-subtitle">{t('dashboard.subtitle')}</p>
            </div>
            <div className="page-actions">
              <button className="btn btn-outline" onClick={load}><TrendingUp size={14} /> {t('dashboard.refresh')}</button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text={t('dashboard.loading')} />
          ) : error ? (
            <div style={{ color: 'var(--red)', padding: 20, background: 'var(--red-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)' }}>
              ⚠️ {error}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                <StatCard
                  icon={Users} iconClass="blue" cardClass="blue"
                  label={t('dashboard.total_employees')} value={stats.totalEmployees}
                  sub={t('dashboard.total_employees_sub')}
                />
                <StatCard
                  icon={UserCheck} iconClass="green" cardClass="green"
                  label={t('dashboard.present_today')} value={stats.presentCount}
                  sub={t('dashboard.present_today_sub', { rate: stats.attendanceRate })}
                />
                <StatCard
                  icon={Clock} iconClass="yellow" cardClass="yellow"
                  label={t('dashboard.late_arrivals')} value={stats.lateCount}
                  sub={t('dashboard.late_arrivals_sub')}
                />
                <StatCard
                  icon={UserX} iconClass="red" cardClass="red"
                  label={t('dashboard.absent_today')} value={stats.absentCount}
                  sub={t('dashboard.absent_today_sub')}
                />
              </div>

              {/* Charts */}
              <div className="charts-grid fade-in-delay-1">
                <div className="chart-card">
                  <div className="chart-title">
                    <span>{t('dashboard.attendance_trend')}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginInlineStart: 6 }}>— {t('dashboard.last_30_days')}</span>
                  </div>
                  <AttendanceTrendChart data={stats.trend} />
                </div>
                <div className="chart-card">
                  <div className="chart-title">{t('dashboard.todays_breakdown')}</div>
                  <StatusPieChart data={stats.statusBreakdown} />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card fade-in-delay-2">
                <div className="card-header">
                  <span className="card-title">{t('dashboard.recent_activity')}</span>
                  <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="card-body">
                  <div className="activity-list">
                    {stats.recentActivity.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('dashboard.no_recent_activity')}</p>
                    ) : stats.recentActivity.map((a, i) => (
                      <div key={i} className="activity-item">
                        <div className="activity-avatar">
                          {(a.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="activity-info">
                          <div className="activity-name">{a.name}</div>
                          <div className="activity-type" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {a.type === 'Check-In'
                              ? <LogIn size={10} style={{ color: 'var(--green)' }} />
                              : <LogOut size={10} style={{ color: 'var(--accent-blue)' }} />
                            }
                            {a.type} · {t('dashboard.badge')} {a.badgeNumber}
                          </div>
                        </div>
                        <div className="activity-time">{a.checkTimeFormatted}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
