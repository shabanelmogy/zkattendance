'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { TrendLineChart, StatusPieChart } from '@/components/dashboard/Charts';
import { LoadingSpinner } from '@/components/shared/States';
import ExportButton from '@/components/shared/ExportButton';
import DatePicker from '@/components/shared/DatePicker';
import { BarChart2 } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

export default function ReportsPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [stats, setStats] = useState(null);
  const [empSummary, setEmpSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, empRes] = await Promise.all([
        fetch(`/api/dashboard?date=${to}`),
        fetch(`/api/employees?mode=summary&from=${from}&to=${to}`),
      ]);
      const dash = await dashRes.json();
      const emp = await empRes.json();
      setStats(dash);
      setEmpSummary(emp);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  // Top late arrivals (by lateDays)
  const topLate = [...empSummary].sort((a, b) => b.lateDays - a.lateDays).slice(0, 10);
  // Top by hours
  const topHours = [...empSummary].sort((a, b) => {
    const toMins = s => {
      if (!s || s === '--') return 0;
      const [h = 0, m = 0] = s.replace('h', '').replace('m', '').split(' ').map(Number);
      return h * 60 + m;
    };
    return toMins(b.totalHours) - toMins(a.totalHours);
  }).slice(0, 10);

  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart2 size={22} style={{ color: 'var(--accent-cyan)' }} />
                {t('reports.title')}
              </h1>
              <p className="page-subtitle">{t('reports.subtitle')}</p>
            </div>
            <div className="page-actions">
              <ExportButton filters={{ from, to }} />
            </div>
          </div>

          {/* Date Range */}
          <div className="filters-bar fade-in" style={{ marginBottom: 20 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('reports.period')}</label>
            <DatePicker id="report-from" value={from} onChange={setFrom} placeholder={t('attendance.from_date')} />
            <span style={{ color: 'var(--text-muted)' }}>–</span>
            <DatePicker id="report-to" value={to} onChange={setTo} placeholder={t('attendance.to_date')} />
          </div>

          {loading ? (
            <LoadingSpinner text={t('reports.generating')} />
          ) : error ? (
            <div style={{ color: 'var(--red)', padding: 16, background: 'var(--red-dim)', borderRadius: 8 }}>⚠️ {error}</div>
          ) : (
            <>
              {/* Charts row */}
              <div className="charts-grid fade-in-delay-1" style={{ marginBottom: 24 }}>
                <div className="chart-card">
                  <div className="chart-title">{t('reports.trend_30_days')}</div>
                  <TrendLineChart data={stats?.trend || []} />
                </div>
                <div className="chart-card">
                  <div className="chart-title">{t('reports.status_today')}</div>
                  <StatusPieChart data={stats?.statusBreakdown || []} />
                </div>
              </div>

              {/* Top Late Arrivals */}
              <div className="card fade-in-delay-2" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ paddingBottom: 12 }}>
                  <span className="card-title" style={{ color: 'var(--yellow)' }}>{t('reports.top_late')}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{from} – {to}</span>
                </div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('reports.table_late.number')}</th>
                          <th>{t('reports.table_late.employee')}</th>
                          <th>{t('reports.table_late.department')}</th>
                          <th>{t('reports.table_late.late_days')}</th>
                          <th>{t('reports.table_late.total_days')}</th>
                          <th>{t('reports.table_late.late_rate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topLate.filter(e => e.lateDays > 0).map((e, i) => (
                          <tr key={e.userId}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td><span className="table-name">{e.name}</span></td>
                            <td><span className="table-sub">{e.department}</span></td>
                            <td style={{ color: 'var(--yellow)', fontWeight: 600 }}>{e.lateDays}</td>
                            <td>{e.totalDays}</td>
                            <td>
                              <span style={{
                                color: (e.lateDays / e.totalDays) > 0.5 ? 'var(--red)' : 'var(--yellow)',
                                fontWeight: 600
                              }}>
                                {Math.round((e.lateDays / e.totalDays) * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Top Hours */}
              <div className="card fade-in-delay-3">
                <div className="card-header" style={{ paddingBottom: 12 }}>
                  <span className="card-title" style={{ color: 'var(--accent-blue)' }}>{t('reports.top_hours')}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{from} – {to}</span>
                </div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('reports.table_hours.number')}</th>
                          <th>{t('reports.table_hours.employee')}</th>
                          <th>{t('reports.table_hours.department')}</th>
                          <th>{t('reports.table_hours.total_hours')}</th>
                          <th>{t('reports.table_hours.avg_day')}</th>
                          <th>{t('reports.table_hours.attendance_rate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topHours.map((e, i) => (
                          <tr key={e.userId}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td><span className="table-name">{e.name}</span></td>
                            <td><span className="table-sub">{e.department}</span></td>
                            <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{e.totalHours}</td>
                            <td>{e.avgHours}</td>
                            <td>
                              <span style={{
                                color: e.attendanceRate >= 90 ? 'var(--green)' : e.attendanceRate >= 70 ? 'var(--yellow)' : 'var(--red)',
                                fontWeight: 600
                              }}>
                                {e.attendanceRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
