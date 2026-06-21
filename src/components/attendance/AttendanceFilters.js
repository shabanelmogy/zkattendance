'use client';
import { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import DatePicker from '@/components/shared/DatePicker';
import { useI18n } from '@/components/I18nProvider';

export default function AttendanceFilters({ filters, onChange, onReset }) {
  const { t, lang } = useI18n();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  function set(key, value) {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }

  function handleSearch() {
    onChange(localFilters);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch();
  }

  return (
    <div className="filters-bar">
      <div style={{ position: 'relative' }}>
        <Search size={14} className="lucide-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          id="filter-employee"
          className="input-field"
          style={{ paddingLeft: 30, width: 200 }}
          type="text"
          placeholder={t('attendance.search')}
          value={localFilters.search || ''}
          onChange={e => set('search', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <DatePicker
        id="filter-from"
        value={localFilters.from || ''}
        onChange={v => set('from', v)}
        placeholder={t('attendance.from_date')}
      />
      <DatePicker
        id="filter-to"
        value={localFilters.to || ''}
        onChange={v => set('to', v)}
        placeholder={t('attendance.to_date')}
      />

      <select
        id="filter-status"
        className="input-field"
        value={localFilters.status || ''}
        onChange={e => set('status', e.target.value)}
      >
        <option value="">{t('attendance.all_status')}</option>
        <option value="Present">{t('attendance.present')}</option>
        <option value="Late">{t('attendance.late')}</option>
        <option value="Absent">{t('attendance.absent')}</option>
      </select>

      <button className="btn btn-primary" onClick={handleSearch} title={lang === 'ar' ? 'بحث' : 'Search'}>
        <Filter size={14} /> {lang === 'ar' ? 'تطبيق الفلتر' : 'Apply Filters'}
      </button>

      <button className="btn btn-ghost" onClick={onReset} title={t('attendance.reset')}>
        <X size={14} /> {t('attendance.reset')}
      </button>
    </div>
  );
}
