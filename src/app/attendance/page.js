'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import ExportButton from '@/components/shared/ExportButton';
import { LoadingSpinner } from '@/components/shared/States';
import { CalendarCheck } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [filters, setFilters] = useState({ from: today, to: today, search: '', status: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const { t } = useI18n();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);

      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error((await res.json()).error);
      let result = await res.json();

      // Client-side filter by search & status
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result.records = result.records.filter(r =>
          r.name?.toLowerCase().includes(q) || r.badgeNumber?.toString().includes(q)
        );
      }
      if (filters.status) {
        let statusKey = filters.status;
        if (filters.status === 'Present' || filters.status === 'Late' || filters.status === 'Absent') {
          // MS Access returned it in English, so we filter by English.
          result.records = result.records.filter(r => r.status === filters.status);
        }
      }

      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  function resetFilters() {
    setFilters({ from: today, to: today, search: '', status: '' });
    setPage(1);
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-container">
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarCheck size={22} style={{ color: 'var(--accent-blue)' }} />
                {t('attendance.records')}
              </h1>
              <p className="page-subtitle">
                {data ? t('attendance.records_found', { count: data.total }) : t('attendance.loading')}
              </p>
            </div>
            <div className="page-actions">
              <ExportButton filters={filters} />
            </div>
          </div>

          <div className="card fade-in-delay-1">
            <div className="card-body">
              <AttendanceFilters
                filters={filters}
                onChange={f => { setFilters(f); setPage(1); }}
                onReset={resetFilters}
              />

              {loading ? (
                <LoadingSpinner text={t('attendance.loading')} />
              ) : error ? (
                <div style={{ color: 'var(--red)', padding: 16, background: 'var(--red-dim)', borderRadius: 8 }}>⚠️ {error}</div>
              ) : (
                <AttendanceTable
                  records={data?.records || []}
                  total={data?.total || 0}
                  page={page}
                  limit={limit}
                  totalPages={data?.totalPages || 1}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onPageChange={setPage}
                  onLimitChange={n => { setLimit(n); setPage(1); }}
                  onSortChange={(col, order) => { setSortBy(col); setSortOrder(order); }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
