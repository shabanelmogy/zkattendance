'use client';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/components/I18nProvider';

export default function ExportButton({ filters = {} }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  async function doExport(format) {
    setLoading(true);
    setOpen(false);
    try {
      const params = new URLSearchParams({ format });
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.empId) params.set('empId', filters.empId);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        id="export-btn"
        className="btn btn-green"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
      >
        {loading ? (
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
        ) : (
          <Download size={14} />
        )}
        {loading ? t('attendance.exporting') : t('attendance.export_btn')}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)', overflow: 'hidden', zIndex: 50,
          minWidth: 160, boxShadow: 'var(--shadow-card)',
        }}>
          <button
            id="export-xlsx"
            className="btn btn-ghost"
            style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start', borderBottom: '1px solid var(--border)' }}
            onClick={() => doExport('xlsx')}
          >
            <FileSpreadsheet size={14} /> Excel (.xlsx)
          </button>
          <button
            id="export-csv"
            className="btn btn-ghost"
            style={{ width: '100%', borderRadius: 0, justifyContent: 'flex-start' }}
            onClick={() => doExport('csv')}
          >
            <Download size={14} /> CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
