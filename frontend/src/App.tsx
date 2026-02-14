import { useEffect, useState, useMemo } from 'react';
import { Play, Trash2, Plus, RefreshCw, FolderOpen, FileText, Edit, ChevronUp, ChevronDown, Save, ListChecks, Settings, Database, Clock, Search, X, FolderPlus, Github, Star } from 'lucide-react';
import { JobForm } from './components/JobForm';
import { GlobalEnvSettings } from './components/GlobalEnvSettings';
import { BackupManager } from './components/BackupManager';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '@cron-manager/shared';
import { extractLogFiles } from './utils/logFileExtractor';
import { extractScriptPath } from './utils/scriptPathExtractor';

// Electron IPC API
const api = window.electronAPI;

type SortField = 'name' | 'schedule' | 'command' | 'enabled' | 'nextRun';
type SortDirection = 'asc' | 'desc';
type TabType = 'jobs' | 'env' | 'backups';

// LogButton component - checks if directory exists and shows appropriate button
function LogButton({ logFile, workingDir }: { logFile: string; workingDir?: string }) {
  const [dirExists, setDirExists] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDir = async () => {
      try {
        const response = await api.logs.checkDir(logFile, workingDir);
        if (response.success && response.data) {
          setDirExists(response.data.exists);
        }
      } catch (error) {
        console.error('Failed to check directory:', error);
      }
    };

    checkDir();
  }, [logFile, workingDir]);

  const handleCreateDir = async () => {
    try {
      const response = await api.logs.createDir(logFile, workingDir);
      if (response.success) {
        setDirExists(true);
      } else {
        alert(response.error || '디렉토리 생성에 실패했습니다');
      }
    } catch (error) {
      alert('디렉토리 생성에 실패했습니다');
    }
  };

  const handleOpenLog = async () => {
    try {
      await api.logs.open(logFile, workingDir);
    } catch (error) {
      console.error('Failed to open log:', error);
    }
  };

  if (dirExists === null) {
    return null; // Loading
  }

  if (!dirExists) {
    return (
      <button
        onClick={handleCreateDir}
        className="command-link"
        style={{
          color: '#ef4444',
          borderColor: '#ef4444',
        }}
        title={`로그 디렉토리 생성: ${logFile}`}
      >
        <FolderPlus />
        로그 디렉토리 생성
      </button>
    );
  }

  return (
    <button
      onClick={handleOpenLog}
      className="command-link"
      title={`로그 파일 열기: ${logFile}`}
    >
      <FileText />
      로그
    </button>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: 'name' | 'command' | 'schedule' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [starCount, setStarCount] = useState<number | null>(null);

  // Fetch GitHub stars
  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/seunggabi/cron-manager');
        const data = await response.json();
        if (data.stargazers_count !== undefined) {
          setStarCount(data.stargazers_count);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error);
      }
    };

    fetchStars();
  }, []);

  // Keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('jobs');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('env');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('backups');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.jobs.getAll();
      if (response.success && response.data) {
        setJobs(response.data);
      } else {
        alert(response.error || '작업 목록을 불러오는데 실패했습니다');
      }
    } catch (error) {
      alert('작업 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Keyboard shortcuts for tab switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('jobs');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('env');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('backups');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreate = async (data: CreateJobRequest | UpdateJobRequest) => {
    try {
      const response = await api.jobs.create(data as CreateJobRequest);
      if (response.success) {
        await fetchJobs();
        setShowForm(false);
        alert('작업이 추가되었습니다');
      } else {
        alert(response.error || '작업 추가에 실패했습니다');
      }
    } catch (error) {
      alert('작업 추가에 실패했습니다');
    }
  };

  const handleUpdate = async (data: CreateJobRequest | UpdateJobRequest) => {
    if (!editingJob) return;

    try {
      const response = await api.jobs.update(editingJob.id, data);
      if (response.success) {
        await fetchJobs();
        setEditingJob(null);
        setShowForm(false);
      } else {
        alert(response.error || '작업 수정에 실패했습니다');
      }
    } catch (error) {
      alert('작업 수정에 실패했습니다');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.jobs.toggle(id);
      await fetchJobs();
    } catch (error) {
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
      alert('작업 실행에 실패했습니다');
    }
  };

  const handleSync = async () => {
    try {
      await api.jobs.sync();
      await fetchJobs();
      alert('동기화 완료');
    } catch (error) {
      alert('동기화에 실패했습니다');
    }
  };

  const handleOpenLogs = async (logFile?: string, workingDir?: string) => {
    if (!logFile) {
      alert('로그 파일이 지정되지 않았습니다');
      return;
    }

    try {
      const response = await api.logs.open(logFile, workingDir);

      if (!response.success) {
        alert(response.error || '로그 폴더를 여는데 실패했습니다');
      }
    } catch (error) {
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
      alert('실행 파일 폴더를 여는데 실패했습니다');
    }
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleCellDoubleClick = (job: CronJob, field: 'name' | 'command' | 'schedule') => {
    setEditingCell({ jobId: job.id, field });
    setEditingValue(job[field]);
  };

  const handleCellKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, job: CronJob) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleCellSave(job);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCellCancel();
    }
  };

  const handleCellSave = async (job: CronJob) => {
    if (!editingCell) return;

    const { field } = editingCell;
    const trimmedValue = editingValue.trim();

    if (!trimmedValue) {
      alert('값을 입력해주세요');
      return;
    }

    if (trimmedValue === job[field]) {
      setEditingCell(null);
      setEditingValue('');
      return;
    }

    try {
      const updateData = { [field]: trimmedValue };
      const response = await api.jobs.update(job.id, updateData);

      if (response.success) {
        await fetchJobs();
        setEditingCell(null);
        setEditingValue('');
      } else {
        alert(response.error || '수정에 실패했습니다');
      }
    } catch (error) {
      alert('수정에 실패했습니다');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
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
      const jobIds = filteredAndSortedJobs.map(job => job.id);
      const response = await api.jobs.reorder(jobIds);
      if (response.success) {
        alert('정렬 순서가 저장되었습니다');
        await fetchJobs();
      } else {
        alert(response.error || '정렬 저장에 실패했습니다');
      }
    } catch (error) {
      alert('정렬 저장에 실패했습니다');
    }
  };

  const filteredAndSortedJobs = useMemo(() => {
    // Filter jobs by search query
    let filtered = jobs;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = jobs.filter(job =>
        job.name.toLowerCase().includes(query) ||
        job.command.toLowerCase().includes(query) ||
        job.schedule.toLowerCase().includes(query) ||
        (job.description && job.description.toLowerCase().includes(query))
      );
    }

    // Sort filtered jobs
    return [...filtered].sort((a, b) => {
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
        case 'command':
          aValue = a.command.toLowerCase();
          bValue = b.command.toLowerCase();
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
  }, [jobs, sortField, sortDirection, searchQuery]);

  if (loading && jobs.length === 0) {
    return (
      <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>로딩 중...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'jobs' as TabType, label: '작업 관리', shortcut: '⌘1', icon: ListChecks },
    { id: 'env' as TabType, label: '환경변수', shortcut: '⌘2', icon: Settings },
    { id: 'backups' as TabType, label: '백업 관리', shortcut: '⌘3', icon: Database },
  ];

  const activeJobsCount = jobs.filter(j => j.enabled).length;

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div>
            <h1>
              <span className="icon">
                <Clock size={16} />
              </span>
              Cron Manager
            </h1>
            <div className="header-sub">Crontab 작업을 GUI로 쉽게 관리하세요</div>
          </div>
          <a
            href="https://github.com/seunggabi/cron-manager"
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="GitHub Repository"
          >
            <Github size={16} />
            GitHub
            {starCount !== null && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                paddingLeft: '6px',
                borderLeft: '1px solid var(--border)'
              }}>
                <Star size={14} style={{ fill: 'currentColor' }} />
                {starCount}
              </span>
            )}
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon />
              {tab.label} <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '4px' }}>({tab.shortcut})</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' && (
        <div>
          {/* Action Bar */}
          <div className="action-bar">
            <div className="action-bar-left">
              {jobs.length > 0 && (
                <>
                  <div className="summary-pill">
                    <span className="dot"></span>
                    활성 {activeJobsCount} / 전체 {jobs.length}
                  </div>
                  {/* Search Input */}
                  <div style={{ position: 'relative', flex: 6 }}>
                    <Search size={16} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-tertiary)',
                      pointerEvents: 'none'
                    }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="검색 (이름, 명령어, 스케줄)"
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 36px',
                        fontSize: '13px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--surface)',
                        color: 'var(--text-primary)',
                        transition: 'all var(--transition)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--accent)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          padding: '4px',
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'all var(--transition)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                        title="검색 지우기"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="action-bar-right">
              <button onClick={handleSaveSortOrder} className="btn" title="현재 정렬 순서를 crontab 파일에 저장">
                <Save />
                저장
              </button>
              <button onClick={handleSync} className="btn">
                <RefreshCw />
                동기화 <span style={{ opacity: 0.6, fontSize: '11px' }}>(⌘R)</span>
              </button>
              <button
                onClick={() => {
                  setEditingJob(null);
                  setShowForm(true);
                }}
                className="btn btn-primary"
              >
                <Plus />
                새 작업 <span style={{ opacity: 0.6, fontSize: '11px' }}>(⌘N)</span>
              </button>
            </div>
          </div>

          {/* Jobs Table */}
          {jobs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <div className="empty-text">등록된 Cron 작업이 없습니다</div>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                <Plus />
                첫 작업 추가하기
              </button>
            </div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>액션</th>
                      <th onClick={() => handleSort('enabled')}>
                        상태
                        {sortField === 'enabled' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('name')}>
                        이름
                        {sortField === 'name' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('schedule')}>
                        스케줄
                        {sortField === 'schedule' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('command')}>
                        명령어
                        {sortField === 'command' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </th>
                      <th onClick={() => handleSort('nextRun')}>
                        다음 실행
                        {sortField === 'nextRun' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            "{searchQuery}" 검색 결과가 없습니다
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className="actions">
                            <button
                              onClick={() => handleEdit(job)}
                              className="icon-btn edit"
                              title="수정"
                              data-tooltip="수정"
                            >
                              <Edit />
                            </button>
                            <button
                              onClick={() => handleRun(job.id)}
                              className="icon-btn play"
                              title="즉시 실행"
                              data-tooltip="즉시 실행"
                            >
                              <Play />
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="icon-btn delete"
                              title="삭제"
                              data-tooltip="삭제"
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggle(job.id)}
                            className={`badge ${job.enabled ? 'badge-active' : 'badge-inactive'}`}
                            title={job.enabled ? '클릭하여 비활성화' : '클릭하여 활성화'}
                          >
                            {job.enabled && <span className="dot"></span>}
                            {job.enabled ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td>
                          {editingCell?.jobId === job.id && editingCell?.field === 'name' ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, job)}
                              onBlur={() => handleCellSave(job)}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1.5px solid var(--accent)',
                                borderRadius: 'var(--radius)',
                                fontSize: '13.5px',
                                fontWeight: 700,
                              }}
                            />
                          ) : (
                            <div onDoubleClick={() => handleCellDoubleClick(job, 'name')} style={{ cursor: 'pointer' }}>
                              <div className="job-name">{job.name}</div>
                              {job.description && <div className="job-desc">{job.description}</div>}
                            </div>
                          )}
                        </td>
                        <td>
                          {editingCell?.jobId === job.id && editingCell?.field === 'schedule' ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, job)}
                              onBlur={() => handleCellSave(job)}
                              autoFocus
                              className="mono"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1.5px solid var(--accent)',
                                borderRadius: 'var(--radius)',
                                fontSize: '12px',
                              }}
                            />
                          ) : (
                            <code
                              className="schedule-code"
                              onDoubleClick={() => handleCellDoubleClick(job, 'schedule')}
                              style={{ cursor: 'pointer' }}
                            >
                              {job.schedule}
                            </code>
                          )}
                        </td>
                        <td className="command-cell">
                          {editingCell?.jobId === job.id && editingCell?.field === 'command' ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, job)}
                              onBlur={() => handleCellSave(job)}
                              autoFocus
                              className="mono"
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                border: '1.5px solid var(--accent)',
                                borderRadius: 'var(--radius)',
                                fontSize: '12px',
                              }}
                            />
                          ) : (
                            <>
                              <code
                                className="command-text"
                                onDoubleClick={() => handleCellDoubleClick(job, 'command')}
                                style={{ cursor: 'pointer', display: 'block' }}
                              >
                                {job.command}
                              </code>
                              <div className="command-links">
                                <button
                                  onClick={() => handleOpenScriptFolder(job.command)}
                                  className="command-link"
                                  title="실행 파일 폴더 열기"
                                >
                                  <FolderOpen />
                                  실행파일
                                </button>
                                {extractLogFiles(job.command).map((logFile, idx) => (
                                  <LogButton
                                    key={idx}
                                    logFile={logFile}
                                    workingDir={job.workingDir}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          <div className="next-run">
                            {job.nextRun
                              ? new Date(job.nextRun).toLocaleString('ko-KR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '-'}
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'env' && <GlobalEnvSettings />}

      {activeTab === 'backups' && <BackupManager />}

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
