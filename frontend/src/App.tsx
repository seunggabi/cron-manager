import { useEffect, useState } from 'react';
import { Play, Pause, Trash2, Plus, RefreshCw, FolderOpen, FileText, Edit, ChevronUp, ChevronDown, Save, ListChecks, Settings, Database } from 'lucide-react';
import { JobForm } from './components/JobForm';
import { GlobalEnvSettings } from './components/GlobalEnvSettings';
import { BackupManager } from './components/BackupManager';
import type { CronJob } from '@cron-manager/shared';
import { extractLogFiles } from './utils/logFileExtractor';
import { extractScriptPath } from './utils/scriptPathExtractor';

// Electron IPC API
const api = (window as any).electronAPI;

type SortField = 'name' | 'schedule' | 'enabled' | 'nextRun';
type SortDirection = 'asc' | 'desc';
type TabType = 'jobs' | 'env' | 'backups';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.jobs.getAll();
      if (response.success && response.data) {
        setJobs(response.data);
      } else {
        console.error('Failed to fetch jobs:', response.error);
        alert(response.error || '작업 목록을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      alert('작업 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreate = async (data: any) => {
    try {
      const response = await api.jobs.create(data);
      if (response.success) {
        await fetchJobs();
        setShowForm(false);
        alert('작업이 추가되었습니다');
      } else {
        alert(response.error || '작업 추가에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('작업 추가에 실패했습니다');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingJob) return;

    try {
      const response = await api.jobs.update(editingJob.id, data);
      if (response.success) {
        await fetchJobs();
        setEditingJob(null);
        setShowForm(false);
        alert('작업이 수정되었습니다');
      } else {
        alert(response.error || '작업 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to update job:', error);
      alert('작업 수정에 실패했습니다');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.jobs.toggle(id);
      await fetchJobs();
    } catch (error) {
      console.error('Failed to toggle job:', error);
      alert('작업 토글에 실패했습니다');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.jobs.delete(id);
      await fetchJobs();
      alert('작업이 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete job:', error);
      alert('작업 삭제에 실패했습니다');
    }
  };

  const handleRun = async (id: string) => {
    try {
      const response = await api.jobs.run(id);
      if (response.success && response.data) {
        const result = response.data;
        const message = `실행 완료\n\nExit Code: ${result.exitCode}\n\n` +
          `Stdout:\n${result.stdout || '(empty)'}\n\n` +
          `Stderr:\n${result.stderr || '(empty)'}`;
        alert(message);
      } else {
        alert(response.error || '작업 실행에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to run job:', error);
      alert('작업 실행에 실패했습니다');
    }
  };

  const handleSync = async () => {
    try {
      await api.jobs.sync();
      await fetchJobs();
      alert('동기화 완료');
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('동기화에 실패했습니다');
    }
  };

  const handleOpenLogs = async (logFile?: string, workingDir?: string) => {
    if (!logFile) {
      alert('로그 파일이 지정되지 않았습니다');
      return;
    }

    console.log('Opening log file:', logFile, 'workingDir:', workingDir);

    try {
      const response = await api.logs.open(logFile, workingDir);
      console.log('Log open response:', response);

      if (!response.success) {
        alert(response.error || '로그 폴더를 여는데 실패했습니다');
      } else {
        console.log('터미널이 열렸습니다!');
      }
    } catch (error) {
      console.error('Failed to open logs:', error);
      alert('로그 폴더를 여는데 실패했습니다: ' + error);
    }
  };

  const handleOpenScriptFolder = async (command: string) => {
    const scriptPath = extractScriptPath(command);
    if (!scriptPath) {
      alert('실행 파일 경로를 찾을 수 없습니다');
      return;
    }

    try {
      await api.files.open(scriptPath);
    } catch (error) {
      console.error('Failed to open script folder:', error);
      alert('실행 파일 폴더를 여는데 실패했습니다');
    }
  };

  const handleEdit = (job: CronJob) => {
    console.log('[handleEdit] Called with job:', job);
    setEditingJob(job);
    setShowForm(true);
    console.log('[handleEdit] showForm set to true');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSaveSortOrder = async () => {
    try {
      const jobIds = sortedJobs.map(job => job.id);
      const response = await api.jobs.reorder(jobIds);
      if (response.success) {
        alert('정렬 순서가 저장되었습니다');
        await fetchJobs();
      } else {
        alert(response.error || '정렬 저장에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to save sort order:', error);
      alert('정렬 저장에 실패했습니다');
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'schedule':
        aValue = a.schedule;
        bValue = b.schedule;
        break;
      case 'enabled':
        aValue = a.enabled ? 1 : 0;
        bValue = b.enabled ? 1 : 0;
        break;
      case 'nextRun':
        aValue = a.nextRun ? new Date(a.nextRun).getTime() : 0;
        bValue = b.nextRun ? new Date(b.nextRun).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const truncateCommand = (command: string, maxLength: number = 40) => {
    if (command.length <= maxLength) return command;
    return command.substring(0, maxLength) + '...';
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'jobs' as TabType, label: '작업 관리', icon: ListChecks },
    { id: 'env' as TabType, label: '전역 환경변수', icon: Settings },
    { id: 'backups' as TabType, label: '백업 관리', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Cron Manager</h1>
          <p className="text-gray-600">
            Crontab 작업을 GUI로 쉽게 관리하세요
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-all
                      ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'jobs' && (
          <div>
            {/* Jobs Header Actions */}
            <div className="flex items-center justify-end gap-2 mb-6">
              <button
                onClick={handleSaveSortOrder}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm"
                title="현재 정렬 순서를 crontab 파일에 저장"
              >
                <Save className="w-4 h-4" />
                정렬 저장
              </button>
              <button
                onClick={handleSync}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                동기화
              </button>
              <button
                onClick={() => {
                  setEditingJob(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                새 작업
              </button>
            </div>

            {/* Jobs Table */}
            {jobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200 shadow-sm">
                <ListChecks className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">등록된 Cron 작업이 없습니다</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  첫 작업 추가하기
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('enabled')}
                      >
                        <div className="flex items-center gap-2">
                          상태
                          {sortField === 'enabled' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          이름
                          {sortField === 'name' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('schedule')}
                      >
                        <div className="flex items-center gap-2">
                          스케줄
                          {sortField === 'schedule' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        명령어
                      </th>
                      <th
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('nextRun')}
                      >
                        <div className="flex items-center gap-2">
                          다음 실행
                          {sortField === 'nextRun' && (
                            sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className={`transition-colors ${
                          job.enabled
                            ? 'hover:bg-blue-50/30'
                            : 'bg-gray-50/50 hover:bg-gray-100/50 opacity-75'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              job.enabled
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-gray-200 text-gray-600 border border-gray-300'
                            }`}
                          >
                            {job.enabled ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`font-semibold ${job.enabled ? 'text-gray-900' : 'text-gray-600'}`}>
                              {job.name}
                            </span>
                            {job.description && (
                              <span className="text-sm text-gray-500 mt-1">{job.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700">
                            {job.schedule}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code
                              className="text-sm font-mono text-gray-700 break-all"
                            >
                              {job.command}
                            </code>
                            {/* Script folder button - always shown */}
                            <button
                              onClick={() => handleOpenScriptFolder(job.command)}
                              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="실행 파일 폴더 열기"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                            {/* Log file buttons - only shown when log files exist */}
                            {(() => {
                              // Prefer job.logFile if set, otherwise extract from command
                              const logFiles = job.logFile ? [job.logFile] : extractLogFiles(job.command);
                              return logFiles.map((logFile, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleOpenLogs(logFile, job.workingDir)}
                                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                  title={`로그 파일 열기: ${logFile}`}
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              ));
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {job.nextRun ? new Date(job.nextRun).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEdit(job)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggle(job.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                job.enabled
                                  ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              title={job.enabled ? '비활성화' : '활성화'}
                            >
                              {job.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleRun(job.id)}
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="즉시 실행"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        )}

        {activeTab === 'env' && <GlobalEnvSettings />}

        {activeTab === 'backups' && <BackupManager />}
      </div>

      {/* Form Modal */}
      {showForm && (
        <JobForm
          job={editingJob}
          onClose={handleCloseForm}
          onSubmit={editingJob ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}

export default App;
