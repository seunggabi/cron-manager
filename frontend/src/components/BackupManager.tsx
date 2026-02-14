import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, RotateCcw, Database, FolderOpen, FileText, X, Search, ChevronUp, ChevronDown } from 'lucide-react';

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
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<{ backup: Backup; diff: DiffLine[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
        alert(response.error || '백업 목록을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      alert('백업 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleOpenBackup = async (backupPath: string) => {
    try {
      await api.files.open(backupPath);
    } catch (error) {
      console.error('Failed to open backup file:', error);
      alert('백업 파일을 여는데 실패했습니다');
    }
  };

  const handleRestore = async (backup: Backup) => {
    if (!confirm(
      `백업을 복구하시겠습니까?\n\n` +
      `파일: ${backup.filename}\n` +
      `날짜: ${new Date(backup.timestamp).toLocaleString('ko-KR')}\n\n` +
      `현재 crontab이 이 백업으로 대체됩니다.`
    )) {
      return;
    }

    setRestoring(backup.path);
    try {
      const response = await api.backups.restore(backup.path);
      if (response.success) {
        alert('백업이 성공적으로 복구되었습니다');
      } else {
        alert(response.error || '백업 복구에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('백업 복구에 실패했습니다');
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
        alert(response.error || 'Diff 비교에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to diff backup:', error);
      alert('Diff 비교에 실패했습니다');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTimestamp = (timestamp: Date): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
    }
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
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: 600 }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Search */}
      {backups.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색 (백업 시각, 파일명)"
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
              title="검색 초기화"
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
            <div className="empty-text">백업 파일이 없습니다</div>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              Cron 작업을 수정하면 자동으로 백업이 생성됩니다
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="backup-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>
                    백업 시각
                    {sortField === 'timestamp' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('filename')} style={{ cursor: 'pointer' }}>
                    파일명
                    {sortField === 'filename' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('size')} style={{ cursor: 'pointer' }}>
                    크기
                    {sortField === 'size' && (
                      <span className="sort-icon">
                        {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    )}
                  </th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedBackups.map((backup, index) => (
                  <tr key={backup.path}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {index === 0 && (
                          <span className="badge badge-active" style={{ fontSize: '10px' }}>최신</span>
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
                    <td>
                      <div className="actions">
                        <button
                          onClick={() => handleOpenBackup(backup.path)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          title="백업 파일 열기"
                        >
                          <FolderOpen size={14} />
                          열기
                        </button>
                        <button
                          onClick={() => handleRestore(backup)}
                          disabled={restoring !== null}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          title="이 백업으로 복구"
                        >
                          {restoring === backup.path ? (
                            <>
                              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                              복구 중...
                            </>
                          ) : (
                            <>
                              <RotateCcw size={14} />
                              복구
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDiff(backup)}
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          title="현재 crontab과 비교"
                        >
                          <FileText size={14} />
                          비교
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <p style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>백업 정보</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>• 총 <strong>{backups.length}개</strong>의 백업 파일이 있습니다</li>
                <li>• 백업은 작업 추가/수정/삭제 시 자동으로 생성됩니다</li>
                <li>• 복구 시 현재 crontab이 선택한 백업으로 대체됩니다</li>
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
              <h2>백업 비교</h2>
              <button onClick={() => setDiffData(null)} className="modal-close">
                <X />
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  <strong>{diffData.backup.filename}</strong>과 현재 crontab 비교
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
    </div>
  );
}
