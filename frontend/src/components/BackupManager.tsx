import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, RotateCcw, Database, FolderOpen, FileText, X, Search, ChevronUp, ChevronDown, Save } from 'lucide-react';
import { BackupCountdown } from './BackupCountdown';
import { useResizableColumns } from '../hooks/useResizableColumns';
import { format } from 'date-fns';
import { useAlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

const api = window.electronAPI;

interface Backup {
  filename: string;
  timestamp: Date;
  path: string;
  size: number;
}

interface DiffLine {
  type: 'add' | 'remove' | 'same';
  line: string;
  lineNumber?: number;
}

type SortField = 'timestamp' | 'filename' | 'size';
type SortDirection = 'asc' | 'desc';

export function BackupManager() {
  const { t } = useTranslation();
  const { showAlert } = useAlertDialog();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<{ backup: Backup; diff: DiffLine[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [maxBackups, setMaxBackups] = useState(10);
  const [maxBackupDays, setMaxBackupDays] = useState(7);
  const [configLoading, setConfigLoading] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null);
  const [confirmConfigSave, setConfirmConfigSave] = useState(false);

  // Resizable columns for backup table
  const { getColumnStyle, ResizeHandle } = useResizableColumns('backups', {
    timestamp: 200,
    filename: 350,
    size: 100,
    deletion: 80,
    action: 130,
  });

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await api.backups.list();
      if (response.success && response.data) {
        const sortedBackups = response.data.sort((a: Backup, b: Backup) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setBackups(sortedBackups);
      } else {
        showAlert(response.error || t('errors.loadBackupsFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      showAlert(t('errors.loadBackupsFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupConfig = async () => {
    try {
      const response = await api.config.getBackupConfig();
      if (response.success && response.data) {
        setMaxBackups(response.data.maxBackups);
        setMaxBackupDays(response.data.maxBackupDays);
      }
    } catch (error) {
      console.error('Failed to fetch backup config:', error);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchBackupConfig();
  }, []);

  const handleSaveConfigConfirm = async () => {
    if (maxBackups < 1) {
      showAlert(t('errors.minBackups'), 'error');
      return;
    }
    if (maxBackupDays < 0) {
      showAlert(t('errors.minDays'), 'error');
      return;
    }

    setConfigLoading(true);
    setConfirmConfigSave(false);
    try {
      const response = await api.config.updateBackupConfig(maxBackups, maxBackupDays);
      if (!response.success) {
        showAlert(response.error || t('errors.saveConfigFailed'), 'error');
      } else {
        // Success: refresh backup list to show cleaned up backups
        await fetchBackups();
        showAlert(t('success.configSaved'), 'success');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      showAlert(t('errors.saveConfigFailed'), 'error');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleOpenBackup = async (backupPath: string) => {
    try {
      await api.files.open(backupPath);
    } catch (error) {
      console.error('Failed to open backup file:', error);
      showAlert(t('errors.openBackupFailed'), 'error');
    }
  };

  const handleRestoreConfirm = async () => {
    if (!confirmRestore) return;

    setRestoring(confirmRestore.path);
    setConfirmRestore(null);
    try {
      const response = await api.backups.restore(confirmRestore.path);
      if (response.success) {
        showAlert(t('success.backupRestored'), 'success');
      } else {
        showAlert(response.error || t('errors.restoreBackupFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      showAlert(t('errors.restoreBackupFailed'), 'error');
    } finally {
      setRestoring(null);
    }
  };

  const handleDiff = async (backup: Backup) => {
    try {
      const response = await api.backups.diff(backup.path);
      if (response.success && response.data) {
        setDiffData({ backup, diff: response.data.diff });
      } else {
        showAlert(response.error || t('errors.diffFailed'), 'error');
      }
    } catch (error) {
      console.error('Failed to diff backup:', error);
      showAlert(t('errors.diffFailed'), 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimestamp = (timestamp: Date): string => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
    }
  };

  // Calculate deletion time for a backup based on retention policy
  const getDeletionTime = (backup: Backup, index: number): Date | null => {
    // First maxBackups are always kept
    if (index < maxBackups) {
      return null;
    }

    // For backups beyond maxBackups, calculate deletion time
    const createdAt = new Date(backup.timestamp).getTime();
    const deletionTime = new Date(createdAt + maxBackupDays * 24 * 60 * 60 * 1000);
    return deletionTime;
  };

  // Check if deletion is within 24 hours
  const isScheduledForDeletion = (deletionTime: Date | null): boolean => {
    if (!deletionTime) return false;

    const now = new Date().getTime();
    const target = deletionTime.getTime();
    const diff = target - now;

    return diff > 0 && diff <= 24 * 60 * 60 * 1000; // Within 24 hours
  };

  const filteredAndSortedBackups = useMemo(() => {
    let filtered = backups;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = backups.filter(
        (backup) =>
          formatTimestamp(backup.timestamp).toLowerCase().includes(query) ||
          backup.filename.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === 'filename') {
        comparison = a.filename.localeCompare(b.filename);
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [backups, searchQuery, sortField, sortDirection]);

  if (loading && backups.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: '16px' }}>
        <RefreshCw size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Backup Retention Settings */}
      <div className="table-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {t('backups.configTitle')}
          </h3>
          <button
            onClick={() => setConfirmConfigSave(true)}
            disabled={configLoading}
            className="btn btn-primary"
          >
            {configLoading ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save size={16} />
                {t('common.save')} <span style={{ opacity: 0.6, fontSize: '11px' }}>(⌘S)</span>
              </>
            )}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              {t('backups.config.maxBackups')}
            </label>
            <input
              type="number"
              value={maxBackups}
              onChange={(e) => setMaxBackups(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              {t('backups.config.maxBackupsHelp')}
            </span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              {t('backups.config.maxDays')}
            </label>
            <input
              type="number"
              value={maxBackupDays}
              onChange={(e) => setMaxBackupDays(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              {t('backups.config.maxDaysHelp')}
            </span>
          </div>
        </div>
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: 'var(--accent-light)',
          borderRadius: 'var(--radius)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          💡 <strong>{t('backups.config.policy')}</strong> {t('backups.config.policyDesc')}
        </div>
      </div>

      {/* Search */}
      {backups.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('backups.searchPlaceholder')}
              style={{
                width: '100%',
                paddingLeft: '40px',
                fontSize: '13px',
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn"
              title={t('backups.clearSearch')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Backups List */}
      <div className="table-card">
        {backups.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💾</div>
            <div className="empty-text">{t('backups.noBackups')}</div>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              {t('backups.autoBackupInfo')}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="backup-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('timestamp')} style={{ ...getColumnStyle('timestamp'), cursor: 'pointer' }}>
                    {t('backups.table.timestamp')}
                    {sortField === 'timestamp' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                    <ResizeHandle columnName="timestamp" />
                  </th>
                  <th onClick={() => handleSort('filename')} style={{ ...getColumnStyle('filename'), cursor: 'pointer' }}>
                    {t('backups.table.filename')}
                    {sortField === 'filename' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                    <ResizeHandle columnName="filename" />
                  </th>
                  <th onClick={() => handleSort('size')} style={{ ...getColumnStyle('size'), cursor: 'pointer' }}>
                    {t('backups.table.size')}
                    {sortField === 'size' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                    <ResizeHandle columnName="size" />
                  </th>
                  <th style={{ ...getColumnStyle('deletion'), textAlign: 'center' }}>
                    {t('backups.table.deletion')}
                    <ResizeHandle columnName="deletion" />
                  </th>
                  <th style={getColumnStyle('action')}>
                    {t('common.actions')}
                    <ResizeHandle columnName="action" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedBackups.map((backup, index) => {
                  const deletionTime = getDeletionTime(backup, index);
                  const isScheduled = deletionTime && isScheduledForDeletion(deletionTime);

                  return (
                    <tr
                      key={backup.path}
                      style={isScheduled ? { background: '#fef2f2' } : undefined}
                    >
                      <td>
                        <div style={{ alignItems: 'center', gap: '8px' }}>
                          {index === 0 && (
                            <span className="badge badge-active" style={{ fontSize: '10px' }}>{t('common.latest')}</span>
                          )}
                          <span className="job-name" style={{ fontSize: '13px' }}>
                            {formatTimestamp(backup.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {backup.filename}
                        </code>
                      </td>
                      <td>
                        <code className="schedule-code" style={{ fontSize: '11px' }}>
                          {formatFileSize(backup.size)}
                        </code>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isScheduled && deletionTime ? (
                          <BackupCountdown deletionTime={deletionTime} />
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            onClick={() => handleOpenBackup(backup.path)}
                            className="btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title={t('common.open')}
                          >
                            <FolderOpen size={14} />
                            {t('common.open')}
                          </button>
                          <button
                            onClick={() => setConfirmRestore(backup)}
                            disabled={restoring !== null}
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title={t('backups.restore')}
                          >
                            {restoring === backup.path ? (
                              <>
                                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                {t('common.restoring')}
                              </>
                            ) : (
                              <>
                                <RotateCcw size={14} />
                                {t('backups.restore')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDiff(backup)}
                            className="btn"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title={t('backups.compareWithCurrent')}
                          >
                            <FileText size={14} />
                            {t('backups.compare')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      {backups.length > 0 && (
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--accent)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Database size={20} color="white" />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <p style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{t('backups.info')}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>• {t('backups.totalBackups', { count: backups.length })}</li>
                <li>• {t('backups.autoCreated')}</li>
                <li>• {t('backups.restoreWarning')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Diff Modal */}
      {diffData && (
        <div className="modal-overlay" onClick={() => setDiffData(null)}>
          <div className="modal" style={{ maxWidth: '900px', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('backups.compareTitle')}</h2>
              <button onClick={() => setDiffData(null)} className="modal-close">
                <X />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('backups.compareSubtitle', { filename: diffData.backup.filename })}
                </p>
              </div>
              <div style={{ maxHeight: '500px', overflow: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                {diffData.diff.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 16px',
                      background:
                        line.type === 'add' ? 'rgba(34, 197, 94, 0.1)' :
                        line.type === 'remove' ? 'rgba(239, 68, 68, 0.1)' :
                        'transparent',
                      borderLeft: line.type === 'add' ? '3px solid #22c55e' :
                                 line.type === 'remove' ? '3px solid #ef4444' :
                                 '3px solid transparent',
                      color: line.type === 'add' ? '#22c55e' :
                             line.type === 'remove' ? '#ef4444' :
                             'var(--text-primary)',
                    }}
                  >
                    <span style={{ opacity: 0.5, marginRight: '12px', minWidth: '40px', display: 'inline-block' }}>
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
                    {line.line || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Config Save Dialog */}
      {confirmConfigSave && (
        <ConfirmDialog
          isOpen={true}
          title={t('backups.confirmSaveConfig')}
          message={t('backups.confirmSaveConfigMessage')}
          onConfirm={handleSaveConfigConfirm}
          onCancel={() => setConfirmConfigSave(false)}
        />
      )}

      {/* Confirm Restore Dialog */}
      {confirmRestore && (
        <ConfirmDialog
          isOpen={true}
          title={t('dialogs.restoreBackup')}
          message={t('dialogs.restoreBackupDetails', {
            filename: confirmRestore.filename,
            date: format(new Date(confirmRestore.timestamp), 'yyyy-MM-dd HH:mm:ss'),
          })}
          onConfirm={handleRestoreConfirm}
          onCancel={() => setConfirmRestore(null)}
        />
      )}
    </div>
  );
}
