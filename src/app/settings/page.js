'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Settings as SettingsIcon, FolderOpen, Database, CheckCircle, XCircle, Save, RefreshCw, HardDrive, ChevronRight, FileText, ArrowLeft, Clock, Upload } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ dbPath: '', workStartHour: 8, workEndHour: 17 });
  const [editPath, setEditPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { t, lang } = useI18n();

  // File browser state
  const [browser, setBrowser] = useState({ open: false, current: 'C:\\', items: [], loading: false, error: null });

  // Load current settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(s => {
        setSettings({ dbPath: s.dbPath || '', workStartHour: s.workStartHour || 8, workEndHour: s.workEndHour || 17 });
        setEditPath(s.dbPath || '');
      });
  }, []);

  // Browse a directory
  const browseTo = useCallback(async (dirPath) => {
    setBrowser(b => ({ ...b, loading: true, error: null }));
    try {
      const res = await fetch(`/api/settings/browse?path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrowser(b => ({ ...b, current: data.current, items: data.items, loading: false }));
    } catch (e) {
      setBrowser(b => ({ ...b, loading: false, error: e.message }));
    }
  }, []);

  // Open browser
  const openBrowser = () => {
    const startDir = editPath
      ? editPath.replace(/[^\\\/]*$/, '') || 'C:\\'
      : 'C:\\';
    setBrowser(b => ({ ...b, open: true }));
    browseTo(startDir);
  };

  // Select a file from browser
  const selectFile = (item) => {
    if (item.type === 'file') {
      setEditPath(item.path);
      setTestResult(null);
      setSaveResult(null);
      setBrowser(b => ({ ...b, open: false }));
    } else {
      browseTo(item.path);
    }
  };

  // Test the connection
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPath: editPath }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ success: false, error: e.message });
    } finally {
      setTesting(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbPath: editPath,
          workStartHour: settings.workStartHour,
          workEndHour: settings.workEndHour,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSaveResult({ success: true });
      } else {
        setSaveResult({ success: false, error: data.error });
      }
    } catch (e) {
      setSaveResult({ success: false, error: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Upload Database
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setTestResult(null);
    setSaveResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/settings/upload');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            reject(new Error('Invalid response'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      if (data.success) {
        setSettings(data.settings);
        setEditPath(data.dbPath);
        setSaveResult({ success: true, error: null });
        // Automatically test connection after upload
        setTimeout(testConnection, 500);
      } else {
        setSaveResult({ success: false, error: data.error });
      }
    } catch (e) {
      setSaveResult({ success: false, error: e.message });
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  const hasChanges = editPath !== settings.dbPath;

  // Drive quick-access buttons
  const DRIVES = ['C:\\', 'D:\\', 'E:\\', 'F:\\', 'G:\\', 'H:\\'];

  return (
    <div className="app-layout">
      <Sidebar />
      <Topbar />
      <main className="main-content">
        <div className="page-container" style={{ maxWidth: 800 }}>
          <div className="page-header fade-in">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={22} style={{ color: 'var(--accent-purple)' }} />
                {t('settings.title')}
              </h1>
              <p className="page-subtitle">{t('settings.subtitle')}</p>
            </div>
          </div>

          {/* Database Section */}
          <div className="card fade-in" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} style={{ color: 'var(--accent-blue)' }} />
                <span className="card-title" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>MS Access (.mdb / .accdb)</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Current DB */}
              <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('settings.current_path')}</div>
                <div style={{ fontSize: '0.855rem', color: 'var(--accent-blue)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {settings.dbPath || 'Not configured'}
                </div>
              </div>

              {/* Path input row */}
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="settings-db-path"
                    className="input-field"
                    style={{ flex: 1, height: 42, fontSize: '0.855rem', fontFamily: 'monospace', textAlign: 'left' }}
                    type="text"
                    placeholder="C:\path\to\your\database.mdb"
                    value={editPath}
                    onChange={e => { setEditPath(e.target.value); setTestResult(null); setSaveResult(null); }}
                    dir="ltr"
                  />
                  <button
                    id="browse-db-btn"
                    className="btn btn-outline"
                    style={{ height: 42, gap: 6 }}
                    onClick={openBrowser}
                    title="Browse Server Files"
                  >
                    <FolderOpen size={15} /> {t('settings.browse') || 'Browse'}
                  </button>
                  <label className="btn btn-primary" style={{ height: 42, gap: 6, cursor: 'pointer', margin: 0 }}>
                    <input
                      type="file"
                      accept=".mdb,.accdb"
                      style={{ display: 'none' }}
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                    {uploading ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : <Upload size={15} />}
                    {uploading ? (lang === 'ar' ? `جاري الرفع... ${uploadProgress}%` : `Uploading... ${uploadProgress}%`) : (lang === 'ar' ? 'رفع قاعدة البيانات' : 'Upload Database')}
                  </label>
                </div>
                {uploading && (
                  <div style={{ width: '100%', height: 4, background: 'var(--border-strong)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-blue)', width: `${uploadProgress}%`, transition: 'width 0.2s ease-out' }} />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  id="test-connection-btn"
                  className="btn btn-outline"
                  onClick={testConnection}
                  disabled={testing || !editPath}
                >
                  {testing ? (
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  {testing ? t('settings.testing') : t('settings.test_connection')}
                </button>

                <button
                  id="save-settings-btn"
                  className="btn btn-primary"
                  onClick={saveSettings}
                  disabled={saving || !editPath || !hasChanges}
                  style={{ opacity: (!editPath || !hasChanges) ? 0.5 : 1 }}
                >
                  {saving ? (
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <Save size={14} />
                  )}
                  {saving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: testResult.success ? 'var(--green-dim)' : 'var(--red-dim)',
                  border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {testResult.success
                      ? <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0 }} />
                      : <XCircle size={16} style={{ color: 'var(--red)', flexShrink: 0 }} />
                    }
                    <span style={{ fontWeight: 600, color: testResult.success ? 'var(--green)' : 'var(--red)' }}>
                      {testResult.success ? t('settings.connection_success') : t('settings.connection_failed')}
                    </span>
                  </div>
                  {testResult.success ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingInlineStart: 24, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span>✅ {testResult.employeeCount} {t('settings.employees_found')}</span>
                      <span>{testResult.hasCheckin ? '✅' : '⚠️'} CHECKINOUT table {testResult.hasCheckin ? t('settings.found') : t('settings.missing')}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{testResult.tables} {t('settings.database_tables')}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--red)', paddingInlineStart: 24 }}>
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}

              {/* Save Result */}
              {saveResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: saveResult.success ? 'var(--green-dim)' : 'var(--red-dim)',
                  border: `1px solid ${saveResult.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {saveResult.success
                    ? <><CheckCircle size={14} style={{ color: 'var(--green)' }} /><span style={{ fontSize: '0.855rem', color: 'var(--green)' }}>{t('settings.toast_success')}</span></>
                    : <><XCircle size={14} style={{ color: 'var(--red)' }} /><span style={{ fontSize: '0.855rem', color: 'var(--red)' }}>{saveResult.error || t('settings.toast_error')}</span></>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Work Hours Section */}
          <div className="card fade-in-delay-1" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} style={{ color: 'var(--yellow)' }} />
                {t('settings.work_hours')}
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, width: '100%' }}>
                {t('settings.work_hours_sub')}
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{t('settings.start_time')}</label>
                <select
                  id="work-start-hour"
                  className="input-field"
                  style={{ width: 160 }}
                  value={settings.workStartHour}
                  onChange={e => setSettings(s => ({ ...s, workStartHour: parseInt(e.target.value) }))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{t('settings.end_time')}</label>
                <select
                  id="work-end-hour"
                  className="input-field"
                  style={{ width: 160 }}
                  value={settings.workEndHour}
                  onChange={e => setSettings(s => ({ ...s, workEndHour: parseInt(e.target.value) }))}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  id="save-hours-btn"
                  className="btn btn-primary"
                  onClick={saveSettings}
                  disabled={saving}
                >
                  <Save size={14} /> {t('settings.save')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== FILE BROWSER MODAL ==================== */}
        {browser.open && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)', zIndex: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => setBrowser(b => ({ ...b, open: false }))}
          >
            <div
              style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 640,
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Browser header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FolderOpen size={18} style={{ color: 'var(--accent-blue)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Database File</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2, wordBreak: 'break-all' }} dir="ltr">
                    {browser.current}
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => setBrowser(b => ({ ...b, open: false }))} style={{ padding: '4px 8px' }}>✕</button>
              </div>

              {/* Drive quick access */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }} dir="ltr">
                {DRIVES.map(d => (
                  <button
                    key={d}
                    className="btn btn-ghost"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', height: 28, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => browseTo(d)}
                  >
                    <HardDrive size={11} /> {d}
                  </button>
                ))}
              </div>

              {/* Directory listing */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }} dir="ltr">
                {browser.loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                    <div className="spinner" />
                  </div>
                ) : browser.error ? (
                  <div style={{ padding: 20, color: 'var(--red)', fontSize: '0.85rem' }}>
                    ⚠️ {browser.error}
                  </div>
                ) : browser.items.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    No .mdb or .accdb files found here
                  </div>
                ) : (
                  browser.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => selectFile(item)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', border: 'none', background: 'none',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        transition: 'background 0.15s',
                        color: item.type === 'file' ? 'var(--accent-blue)' : 'var(--text-primary)',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      {item.type === 'parent' ? (
                        <ArrowLeft size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      ) : item.type === 'directory' ? (
                        <FolderOpen size={14} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                      ) : (
                        <FileText size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, fontSize: '0.855rem', fontFamily: item.type === 'file' ? 'monospace' : 'inherit' }}>
                        {item.name}
                      </span>
                      {item.size && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.size}</span>
                      )}
                      {item.type !== 'file' && (
                        <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Browser footer */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                <input
                  className="input-field"
                  style={{ flex: 1, height: 36, fontSize: '0.8rem', fontFamily: 'monospace', textAlign: 'left' }}
                  value={editPath}
                  placeholder="Selected file path..."
                  onChange={e => setEditPath(e.target.value)}
                  dir="ltr"
                />
                <button
                  className="btn btn-primary"
                  style={{ height: 36 }}
                  onClick={() => setBrowser(b => ({ ...b, open: false }))}
                  disabled={!editPath}
                >
                  Select
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
