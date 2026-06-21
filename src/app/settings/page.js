'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Settings as SettingsIcon, FolderOpen, Database, CheckCircle, XCircle, Save, RefreshCw, HardDrive, ChevronRight, FileText, ArrowLeft, Clock, Upload } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';
import { upload } from '@vercel/blob/client';

const BLOB_DB_PATH = 'zkattendance/database.mdb';
const BLOB_DB_SOURCE = `blob:${BLOB_DB_PATH}`;

export default function SettingsPage() {
  const [settings, setSettings] = useState({ dbPath: '', workStartHour: 8, workEndHour: 17 });
  const [editPath, setEditPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveResult, setSaveResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageMode, setStorageMode] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const uploadInputRef = useRef(null);
  const { t } = useI18n();

  // File browser state
  const [browser, setBrowser] = useState({ open: false, current: '', items: [], loading: false, error: null });

  // Load current settings on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/settings/upload').then(r => r.json()),
    ]).then(([s, uploadConfig]) => {
        setSettings({ dbPath: s.dbPath || '', workStartHour: s.workStartHour || 8, workEndHour: s.workEndHour || 17 });
        setEditPath(s.dbPath || '');
        setStorageMode(uploadConfig.storage);
        setStorageError(uploadConfig.error || null);
      }).catch(error => setStorageError(error.message));
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
      ? editPath.replace(/[^\\\/]*$/, '') || ''
      : '';
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
  const testConnection = async (dbPath) => {
    const pathToTest = dbPath || editPath;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbPath: pathToTest }),
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

  // Upload Database with chunked upload to avoid Vercel's 4.5MB body limit
  const handleUpload = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    // Clear now so choosing the same file after an error fires onChange again.
    input.value = '';

    if (!/\.(mdb|accdb)$/i.test(file.name)) {
      setSaveResult({ success: false, error: 'Please select an MS Access database file (.mdb or .accdb).' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setTestResult(null);
    setSaveResult(null);

    try {
      let mode = storageMode;
      if (!mode) {
        const config = await fetch('/api/settings/upload').then(r => r.json());
        mode = config.storage;
        setStorageMode(mode);
        setStorageError(config.error || null);
      }

      if (mode === 'blob') {
        await upload(BLOB_DB_PATH, file, {
          access: 'private',
          handleUploadUrl: '/api/settings/upload',
          clientPayload: file.name,
          multipart: true,
          onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
        });

        const uploadedSettings = { ...settings, dbPath: BLOB_DB_SOURCE, storage: 'blob' };
        setSettings(uploadedSettings);
        setEditPath(BLOB_DB_SOURCE);
        setSaveResult({ success: true, error: null });
        await testConnection(BLOB_DB_SOURCE);
        return;
      }

      const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB per chunk (under Vercel's 4.5MB limit)
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const uploadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      let finalData = null;

      if (totalChunks <= 1) {
        // Small file — send in one request
        finalData = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/settings/upload');
          xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          };
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(data.error || `Upload failed (${xhr.status})`));
                return;
              }
              resolve(data);
            } catch (err) {
              reject(err instanceof SyntaxError ? new Error(`Upload failed (${xhr.status || 'invalid response'})`) : err);
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(file);
        });
      } else {
        // Large file — send in chunks
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const res = await fetch('/api/settings/upload', {
            method: 'POST',
            headers: {
              'x-file-name': encodeURIComponent(file.name),
              'x-chunk-index': String(i),
              'x-total-chunks': String(totalChunks),
              'x-upload-id': uploadId,
            },
            body: chunk,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Upload failed at chunk ${i + 1}`);
          }

          const data = await res.json();
          setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));

          // Last chunk returns the final result
          if (i === totalChunks - 1) {
            finalData = data;
          }
        }
      }

      if (finalData && finalData.success) {
        setSettings(finalData.settings);
        setEditPath(finalData.dbPath);
        setSaveResult({ success: true, error: null, warning: finalData.warning || null });
        // React state updates are asynchronous, so test the returned path directly.
        await testConnection(finalData.dbPath);
      } else {
        setSaveResult({ success: false, error: finalData?.error || 'Upload failed' });
      }
    } catch (err) {
      setSaveResult({ success: false, error: err.message });
    } finally {
      setUploading(false);
    }
  };

  const hasChanges = editPath !== settings.dbPath;

  // Drive quick-access buttons
  const DRIVES = ['Project', 'C:\\', 'D:\\', 'E:\\', 'F:\\', 'G:\\', 'H:\\'];

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

              {/* Existing path option — references the file without copying it. */}
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column', padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {t('settings.path_option')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t('settings.path_option_help')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="settings-db-path"
                    className="input-field"
                    style={{ flex: 1, height: 42, fontSize: '0.855rem', fontFamily: 'monospace', textAlign: 'left' }}
                    type="text"
                    placeholder="C:\path\to\your\database.mdb"
                    value={editPath}
                    onChange={e => { setEditPath(e.target.value); setTestResult(null); setSaveResult(null); }}
                    disabled={storageMode !== 'filesystem'}
                    dir="ltr"
                  />
                  <button
                    id="browse-db-btn"
                    className="btn btn-outline"
                    style={{ height: 42, gap: 6 }}
                    onClick={openBrowser}
                    title={storageMode === 'filesystem' ? 'Browse files on this computer' : 'Path selection is available only when the app runs on this computer'}
                    disabled={storageMode !== 'filesystem'}
                  >
                    <FolderOpen size={15} /> {t('settings.browse') || 'Browse'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    id="test-connection-btn"
                    className="btn btn-outline"
                    onClick={() => testConnection()}
                    disabled={testing || !editPath}
                  >
                    {testing ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <RefreshCw size={14} />}
                    {testing ? t('settings.testing') : t('settings.test_connection')}
                  </button>
                  <button
                    id="save-settings-btn"
                    className="btn btn-primary"
                    onClick={saveSettings}
                    disabled={saving || storageMode !== 'filesystem' || !editPath || !hasChanges}
                    style={{ opacity: (!editPath || !hasChanges) ? 0.5 : 1 }}
                  >
                    {saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Save size={14} />}
                    {saving ? t('settings.saving') : t('settings.save')}
                  </button>
                </div>
              </div>

              {/* Upload option — copies the selected file into the project. */}
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column', padding: 14, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.04)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {t('settings.upload_option')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {t('settings.upload_option_help')}
                  </div>
                </div>
                <input
                  ref={uploadInputRef}
                  id="upload-db-input"
                  type="file"
                  accept=".mdb,.accdb,application/x-msaccess,application/msaccess"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                  onChange={handleUpload}
                  disabled={uploading}
                  tabIndex={-1}
                />
                <button
                  id="upload-db-btn"
                  type="button"
                  className="btn btn-primary"
                  style={{ height: 42, gap: 6, alignSelf: 'flex-start' }}
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> : <Upload size={15} />}
                  {uploading ? t('settings.uploading_database', { progress: uploadProgress }) : t('settings.upload_database')}
                </button>
                {storageError && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{storageError}</div>
                )}
                {uploading && (
                  <div style={{ width: '100%', height: 4, background: 'var(--border-strong)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-blue)', width: `${uploadProgress}%`, transition: 'width 0.2s ease-out' }} />
                  </div>
                )}
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
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {saveResult.success
                      ? <><CheckCircle size={14} style={{ color: 'var(--green)' }} /><span style={{ fontSize: '0.855rem', color: 'var(--green)' }}>{t('settings.toast_success')}</span></>
                      : <><XCircle size={14} style={{ color: 'var(--red)' }} /><span style={{ fontSize: '0.855rem', color: 'var(--red)' }}>{saveResult.error || t('settings.toast_error')}</span></>
                    }
                  </div>
                  {saveResult.warning && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--yellow)', paddingInlineStart: 22 }}>
                      ⚠️ {saveResult.warning}
                    </div>
                  )}
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
                    onClick={() => browseTo(d === 'Project' ? '' : d)}
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
