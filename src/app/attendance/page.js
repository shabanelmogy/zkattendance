'use client';
import { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AttendanceTable from '@/components/attendance/AttendanceTable';
import AttendanceFilters from '@/components/attendance/AttendanceFilters';
import ExportButton from '@/components/shared/ExportButton';
import { LoadingSpinner } from '@/components/shared/States';
import { CalendarCheck } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { useAttendance } from '@/lib/hooks';

const today = new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  const [filters, setFilters] = useState({ from: today, to: today, search: '', status: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const { t } = useI18n();

  const { data, isLoading, error } = useAttendance({
    from: filters.from,
    to: filters.to,
    page,
    limit,
    sortBy,
    sortOrder,
  });

  // Client-side filter by search & status (applied on top of server-paginated results)
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    let records = data.records;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      records = records.filter(r =>
        r.name?.toLowerCase().includes(q) || r.badgeNumber?.toString().includes(q)
      );
    }
    if (filters.status) {
      records = records.filter(r => r.status === filters.status);
    }
    return records;
  }, [data, filters.search, filters.status]);

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

              {isLoading ? (
                <LoadingSpinner text={t('attendance.loading')} />
              ) : error ? (
                <div style={{ color: 'var(--red)', padding: 16, background: 'var(--red-dim)', borderRadius: 8 }}>⚠️ {error.message}</div>
              ) : (
                <AttendanceTable
                  records={filteredRecords}
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
