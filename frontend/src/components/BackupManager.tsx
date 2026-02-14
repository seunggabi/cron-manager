import { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, Database, Calendar, HardDrive } from 'lucide-react';

const api = (window as any).electronAPI;

interface Backup {
  filename: string;
  timestamp: Date;
  path: string;
  size: number;
}

export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await api.backups.list();
      if (response.success && response.data) {
        // Sort by timestamp descending (newest first)
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

  if (loading && backups.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">백업 관리</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crontab 백업을 조회하고 복구합니다
          </p>
        </div>
        <button
          onClick={fetchBackups}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Backups List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {backups.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">백업 파일이 없습니다</p>
            <p className="text-sm text-gray-400">
              Cron 작업을 수정하면 자동으로 백업이 생성됩니다
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      백업 시각
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      파일명
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      크기
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {backups.map((backup, index) => (
                  <tr
                    key={backup.path}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            최신
                          </span>
                        )}
                        <span className="text-sm text-gray-900 font-medium">
                          {formatTimestamp(backup.timestamp)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-gray-700">
                        {backup.filename}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatFileSize(backup.size)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleRestore(backup)}
                        disabled={restoring !== null}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="이 백업으로 복구"
                      >
                        {restoring === backup.path ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            복구 중...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            복구
                          </>
                        )}
                      </button>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">백업 정보</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>총 {backups.length}개의 백업 파일이 있습니다</li>
                <li>백업은 작업 추가/수정/삭제 시 자동으로 생성됩니다</li>
                <li>복구 시 현재 crontab이 선택한 백업으로 대체됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
