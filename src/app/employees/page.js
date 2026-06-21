'use client';
import { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import ExportButton from '@/components/shared/ExportButton';
import DatePicker from '@/components/shared/DatePicker';
import { LoadingSpinner } from '@/components/shared/States';
import { Users, Search } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useEmployeeSummary } from '@/lib/hooks';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

export default function EmployeesPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { t, lang } = useI18n();

  const { data = [], isLoading, error } = useEmployeeSummary({ from, to });

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(e =>
      e.name?.toLowerCase().includes(q) || e.badgeNumber?.toString().includes(q)
    );
  }, [data, search]);

  const total = filtered.length;
  const totalPages = limit === 999999 ? 1 : Math.ceil(total / limit) || 1;
  const paginatedData = limit === 999999 ? filtered : filtered.slice((page - 1) * limit, page * limit);

  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={22} style={{ color: 'var(--accent-blue)' }} />
                {t('employees.summary')}
              </h1>
              <p className="page-subtitle">
                {t('employees.employees_period', { count: filtered.length, from, to })}
              </p>
            </div>
            <div className="page-actions">
              <ExportButton filters={{ from, to }} />
            </div>
          </div>

          <div className="card fade-in-delay-1">
            <div className="card-body">
              <div className="filters-bar" style={{ marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} className="lucide-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: 30, width: 250 }}
                    type="text"
                    placeholder={t('employees.search')}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <DatePicker value={from} onChange={setFrom} placeholder={t('attendance.from_date')} />
                  <span style={{ color: 'var(--text-muted)' }}>–</span>
                  <DatePicker value={to} onChange={setTo} placeholder={t('attendance.to_date')} />
                </div>
              </div>

              {isLoading ? (
                <LoadingSpinner text={t('employees.computing')} />
              ) : error ? (
                <div style={{ color: 'var(--red)', padding: 16, background: 'var(--red-dim)', borderRadius: 8 }}>⚠️ {error.message}</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{t('employees.no_employees')}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('employees.no_employees_sub')}</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('employees.table.badge')}</th>
                        <th>{t('employees.table.name')}</th>
                        <th>{t('employees.table.department')}</th>
                        <th>{t('employees.table.total_days')}</th>
                        <th>{t('employees.table.present')}</th>
                        <th>{t('employees.table.late')}</th>
                        <th>{t('employees.table.total_hours')}</th>
                        <th>{t('employees.table.avg_day')}</th>
                        <th>{t('employees.table.attendance_rate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map(e => (
                        <tr key={e.userId}>
                          <td>{e.badgeNumber}</td>
                          <td><span className="table-name">{e.name}</span></td>
                          <td><span className="table-sub">{e.department}</span></td>
                          <td>{e.totalDays}</td>
                          <td style={{ color: 'var(--green)', fontWeight: 500 }}>{e.presentDays}</td>
                          <td style={{ color: e.lateDays > 0 ? 'var(--yellow)' : 'inherit', fontWeight: 500 }}>{e.lateDays}</td>
                          <td style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>{e.totalHours}</td>
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
                  
                  {/* Pagination */}
                  {total > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>
                        {t('attendance.pagination.showing', { start: (page - 1) * limit + 1, end: Math.min(page * limit, total), total: total })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          {t('attendance.pagination.limit')}
                          <select className="input-field pagination-select" style={{ width: 'auto', marginInlineStart: 8 }} value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={999999}>{lang === 'ar' ? 'الكل' : 'All'}</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline" style={{ height: 28, padding: '0 10px' }} disabled={page === 1} onClick={() => setPage(page - 1)}>
                            {lang === 'ar' ? 'التالي' : 'Prev'}
                          </button>
                          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>{page} / {totalPages}</span>
                          <button className="btn btn-outline" style={{ height: 28, padding: '0 10px' }} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                            {lang === 'ar' ? 'السابق' : 'Next'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
