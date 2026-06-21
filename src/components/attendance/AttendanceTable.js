import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

const StatusBadge = ({ status }) => {
  const { t } = useI18n();
  let color = 'var(--text-muted)';
  let bg = 'var(--bg-card-hover)';
  let icon = null;
  let translatedStatus = status;

  if (status === 'Present') {
    color = 'var(--green)'; bg = 'var(--green-dim)';
    icon = <CheckCircle2 size={12} />;
    translatedStatus = t('attendance.present');
  } else if (status === 'Late') {
    color = 'var(--yellow)'; bg = 'var(--yellow-dim)';
    icon = <AlertCircle size={12} />;
    translatedStatus = t('attendance.late');
  } else if (status === 'Absent') {
    color = 'var(--red)'; bg = 'var(--red-dim)';
    icon = <XCircle size={12} />;
    translatedStatus = t('attendance.absent');
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color: color, padding: '4px 8px',
      borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600
    }}>
      {icon} {translatedStatus}
    </span>
  );
};

export default function AttendanceTable({ records, total, page, limit, totalPages, sortBy = 'date', sortOrder = 'asc', onPageChange, onLimitChange, onSortChange }) {
  const { t, lang } = useI18n();
  
  if (!records.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No records found</div>;
  }

  const handleSort = (col) => {
    if (sortBy === col) {
      onSortChange?.(col, sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      onSortChange?.(col, 'asc'); // default new column to asc
    }
  };

  const SortHeader = ({ col, label }) => (
    <th onClick={() => handleSort(col)} style={{ cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortBy === col && <span style={{ opacity: 0.7, fontSize: 12 }}>{sortOrder === 'desc' ? '↓' : '↑'}</span>}
      </div>
    </th>
  );

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <SortHeader col="date" label={t('attendance.table.date')} />
            <SortHeader col="badgeNumber" label={t('attendance.table.badge')} />
            <SortHeader col="name" label={t('attendance.table.name')} />
            <SortHeader col="department" label={t('attendance.table.department')} />
            <SortHeader col="status" label={t('attendance.table.status')} />
            <SortHeader col="checkIn" label={t('attendance.table.check_in')} />
            <SortHeader col="checkOut" label={t('attendance.table.check_out')} />
            <SortHeader col="duration" label={t('attendance.table.duration')} />
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={`${r.userId}_${r.date}`}>
              <td style={{ fontWeight: 500 }}>{r.date}</td>
              <td>{r.badgeNumber}</td>
              <td><span className="table-name">{r.name}</span></td>
              <td><span className="table-sub">{r.department}</span></td>
              <td><StatusBadge status={r.status} /></td>
              <td>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} style={{ color: 'var(--green)' }} />
                  {r.checkIn}
                </span>
              </td>
              <td>
                {r.checkOut !== '--:--' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={12} style={{ color: 'var(--accent-blue)' }} />
                    {r.checkOut}
                  </span>
                ) : <span style={{ color: 'var(--text-muted)' }}>--:--</span>}
              </td>
              <td style={{ fontWeight: 500 }}>{r.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div>
          {t('attendance.pagination.showing', { start: (page - 1) * limit + 1, end: Math.min(page * limit, total), total: total })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            {t('attendance.pagination.limit')}
            <select className="input-field pagination-select" style={{ width: 'auto', marginInlineStart: 8 }} value={limit} onChange={e => onLimitChange?.(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={999999}>{lang === 'ar' ? 'الكل' : 'All'}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-outline" style={{ height: 28, padding: '0 10px' }} disabled={page === 1} onClick={() => onPageChange?.(page - 1)}>
              {lang === 'ar' ? 'التالي' : 'Prev'}
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>{page} / {totalPages}</span>
            <button className="btn btn-outline" style={{ height: 28, padding: '0 10px' }} disabled={page === totalPages} onClick={() => onPageChange?.(page + 1)}>
              {lang === 'ar' ? 'السابق' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
