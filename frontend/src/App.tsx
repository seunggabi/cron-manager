import { useEffect, useState, useMemo, useCallback } from 'react';
import { Play, Trash2, Plus, RefreshCw, FolderOpen, Edit, ChevronUp, ChevronDown, Save, ListChecks, Settings, Database, Search, X, Github, Languages, Check, GripVertical, Loader2, Star } from 'lucide-react';
import { JobForm } from './components/JobForm';
import { LogButton } from './components/LogButton';
import { LogViewer } from './components/LogViewer';
import { GlobalEnvSettings } from './components/GlobalEnvSettings';
import { BackupManager } from './components/BackupManager';
import { useAlertDialog } from './components/AlertDialog';
import { NextRunCell } from './components/NextRunCell';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '@cron-manager/shared';
import { extractLogFiles } from './utils/logFileExtractor';
import { extractScriptPath } from './utils/scriptPathExtractor';
import { modKey } from './utils/platform';
import { useResizableColumns } from './hooks/useResizableColumns';
import { useTranslation } from 'react-i18next';
import * as Select from '@radix-ui/react-select';
import logoSvg from './assets/logo.svg';
import packageJson from '../../package.json';

// Electron IPC API
const api = window.electronAPI;

type SortField = 'name' | 'schedule' | 'command' | 'enabled' | 'nextRun' | 'id';
type SortDirection = 'asc' | 'desc';
type TabType = 'jobs' | 'env' | 'backups';


function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('jobs');
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: 'name' | 'command' | 'schedule' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [jobDragIndex, setJobDragIndex] = useState<number | null>(null);
  const [jobDragOverIndex, setJobDragOverIndex] = useState<number | null>(null);
  const [wslCronRunning, setWslCronRunning] = useState<boolean | null>(null);
  const [wslUser, setWslUser] = useState<string | null>(null);
  const [startingWslCron, setStartingWslCron] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ latestVersion: string; releaseUrl: string } | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [logViewer, setLogViewer] = useState<{ logPath: string; workingDir?: string } | null>(null);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [starred, setStarred] = useState<boolean | null>(null);
  const [ghAvailable, setGhAvailable] = useState<boolean>(false);
  const { showAlert } = useAlertDialog();

  // Resizable columns for jobs table
  const { getColumnStyle, ResizeHandle } = useResizableColumns('jobs', {
    command: 380,
    nextRun: 180,
    id: 150,
  });

  // Check crontab permission on app start
  const checkCrontabPermission = useCallback(async () => {
    try {
      const response = await api.jobs.checkPermission();
      if (response.success && response.data) {
        if (!response.data.hasPermission) {
          showAlert(
            t('errors.crontabPermissionDenied') ||
            'Permission denied to access crontab. Please grant Full Disk Access permission in System Settings.',
            'error'
          );
        }
        if (response.data.cronRunning !== undefined) {
          setWslCronRunning(response.data.cronRunning);
          // Fetch WSL user for display in the banner
          const userRes = await api.jobs.getWslUser();
          if (userRes.success && userRes.data) {
            setWslUser(userRes.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check crontab permission:', error);
    }
  }, [showAlert, t]);

  const handleStartWslCron = useCallback(async () => {
    setStartingWslCron(true);
    try {
      const response = await api.jobs.startWslCron();
      if (response.success && response.data?.success) {
        setWslCronRunning(true);
        showAlert('WSL cron daemon started successfully.', 'success');
      } else {
        showAlert(response.data?.error || 'Failed to start WSL cron. Try running: wsl sudo service cron start', 'error');
      }
    } catch (error) {
      showAlert('Failed to start WSL cron.', 'error');
    } finally {
      setStartingWslCron(false);
    }
  }, [showAlert]);


  useEffect(() => {
    checkCrontabPermission();
  }, [checkCrontabPermission]);

  // Check GitHub star status on app start
  useEffect(() => {
    const checkStar = async () => {
      try {
        const res = await api.github.checkStarred('seunggabi', 'cron-manager');
        if (res.success && res.data !== undefined) {
          setStarred(res.data.starred);
          setGhAvailable(res.data.ghAvailable);
        }
      } catch {}
    };
    checkStar();
  }, []);

  const handleToggleStar = async () => {
    const newStarred = !starred;
    setStarred(newStarred);
    const res = await api.github.toggleStar('seunggabi', 'cron-manager', newStarred);
    if (!res.success) {
      setStarred(!newStarred); // rollback
    }
  };

  // Check for updates on app start
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const response = await api.updates.check();
        if (response.success && response.data?.latestVersion) {
          const latest = response.data.latestVersion.replace(/^v/, '');
          if (latest !== packageJson.version) {
            setUpdateInfo(response.data);
          }
        }
      } catch {
        // Silently ignore update check failures
      }
    };
    checkUpdate();
  }, []);

  // Silently refresh nextRun times without showing loading spinner
  const silentRefreshNextRuns = useCallback(async () => {
    try {
      const response = await api.jobs.getAll();
      if (response.success && response.data) {
        setJobs(response.data);
      }
    } catch {
      // Silently ignore errors in background refresh
    }
  }, []);

  // Refresh nextRun every 10 seconds so scheduled times stay current
  useEffect(() => {
    const interval = setInterval(silentRefreshNextRuns, 10_000);
    return () => clearInterval(interval);
  }, [silentRefreshNextRuns]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.jobs.getAll();
      if (response.success && response.data) {
        setJobs(response.data);
        return response.data;
      } else {
        showAlert(response.error || t('errors.loadJobsFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.loadJobsFailed'), 'error');
    } finally {
      setLoading(false);
    }
    return null;
  }, [showAlert, t]);

  const handleSync = useCallback(async (showSuccessAlert: boolean = true) => {
    try {
      await api.jobs.sync();
      const fetchedJobs = await fetchJobs();
      if (fetchedJobs) {
        const jobIds = fetchedJobs.map((job: CronJob) => job.id);
        await api.jobs.reorder(jobIds);
      }
      if (showSuccessAlert) {
        showAlert(t('success.syncCompleted'), 'success');
      }
    } catch (error) {
      showAlert(t('errors.syncFailed'), 'error');
    }
  }, [fetchJobs, showAlert, t]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux) is pressed
      if (e.metaKey || e.ctrlKey) {
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
          case 'n':
          case 'N':
            e.preventDefault();
            setEditingJob(null);
            setShowForm(true);
            break;
          case 'r':
          case 'R':
            e.preventDefault();
            const syncButton = Array.from(document.querySelectorAll('button')).find(
              btn => btn.textContent?.includes(t('common.sync'))
            ) as HTMLButtonElement;
            if (syncButton) {
              syncButton.style.transform = 'scale(0.95)';
              setTimeout(() => {
                syncButton.style.transform = '';
              }, 100);
            }
            handleSync();
            break;
          case 's':
          case 'S':
            // Only handle if not in a form (JobForm has its own Cmd+S handler)
            if (!(e.target as HTMLElement).closest('form')) {
              e.preventDefault();
              const saveButton = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent?.includes(t('common.save')) && !btn.textContent?.includes(t('jobs.form.submitEdit'))
              ) as HTMLButtonElement;
              if (saveButton) {
                saveButton.style.transform = 'scale(0.95)';
                setTimeout(() => {
                  saveButton.style.transform = '';
                  saveButton.click();
                }, 100);
              }
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSync]);

  // Auto-sync on app start
  useEffect(() => {
    handleSync(false); // Sync without showing success alert
  }, [handleSync]);

  const handleCreate = async (data: CreateJobRequest | UpdateJobRequest) => {
    try {
      const response = await api.jobs.create(data as CreateJobRequest);
      if (response.success) {
        await fetchJobs();
        setShowForm(false);
        showAlert(t('success.jobAdded'), 'success');
      } else {
        showAlert(response.error || t('errors.addJobFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.addJobFailed'), 'error');
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
        showAlert(response.error || t('errors.updateJobFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.updateJobFailed'), 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.jobs.toggle(id);
      await fetchJobs();
    } catch (error) {
      showAlert(t('errors.toggleJobFailed'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.jobs.delete(id);
      await fetchJobs();
      showAlert(t('success.jobDeleted'), 'success');
    } catch (error) {
      showAlert(t('errors.deleteJobFailed'), 'error');
    }
  };

  const handleRun = async (id: string) => {
    setRunningJobs(prev => new Set(prev).add(id));
    try {
      const response = await api.jobs.run(id);
      if (response.success && response.data) {
        const result = response.data;
        const message = `${t('success.runCompleted')}\n\n${t('dialogs.exitCode')}: ${result.exitCode}\n\n` +
          `${t('dialogs.stdout')}:\n${result.stdout || '(empty)'}\n\n` +
          `${t('dialogs.stderr')}:\n${result.stderr || '(empty)'}`;
        showAlert(message, 'info');
      } else {
        showAlert(response.error || t('errors.runJobFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.runJobFailed'), 'error');
    } finally {
      setRunningJobs(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleOpenScriptFolder = async (command: string) => {
    const scriptPath = extractScriptPath(command);
    if (!scriptPath) {
      showAlert(t('errors.executableNotFound'), 'error');
      return;
    }

    try {
      await api.files.open(scriptPath);
    } catch (error) {
      showAlert(t('errors.openFolderFailed'), 'error');
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

  const handleCellKeyDown = async (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, job: CronJob, field?: 'name' | 'command' | 'schedule') => {
    if (e.key === 'Enter') {
      // For textarea (command field), require Cmd/Ctrl+Enter to save
      if (field === 'command') {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          await handleCellSave(job);
        }
        // Allow normal Enter for line breaks in textarea
      } else {
        // For input fields, Enter saves immediately
        e.preventDefault();
        await handleCellSave(job);
      }
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
      showAlert(t('errors.enterValue'), 'error');
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
        showAlert(response.error || t('errors.updateFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.updateFailed'), 'error');
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const handleAddLog = async (job: CronJob) => {
    const defaultLogPath = `~/logs/${job.name.replace(/\s+/g, '-')}.log`;
    try {
      const response = await api.jobs.update(job.id, {
        logFile: defaultLogPath,
      });
      if (response.success) {
        await fetchJobs();
        showAlert(t('success.logAdded'), 'success');
      } else {
        showAlert(response.error || t('errors.updateFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.updateFailed'), 'error');
    }
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
        showAlert(t('success.orderSaved'), 'success');
        await fetchJobs();
      } else {
        showAlert(response.error || t('errors.saveOrderFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.saveOrderFailed'), 'error');
    }
  };

  const isJobSearchActive = searchQuery.trim().length > 0;

  const handleJobMoveUp = async (displayIndex: number) => {
    if (displayIndex <= 0) return;
    const currentList = [...filteredAndSortedJobs];
    [currentList[displayIndex - 1], currentList[displayIndex]] =
      [currentList[displayIndex], currentList[displayIndex - 1]];
    const jobIds = currentList.map(job => job.id);
    setSortField(null);
    try {
      const response = await api.jobs.reorder(jobIds);
      if (response.success) {
        await fetchJobs();
      } else {
        showAlert(response.error || t('errors.saveOrderFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.saveOrderFailed'), 'error');
    }
  };

  const handleJobMoveDown = async (displayIndex: number) => {
    if (displayIndex >= filteredAndSortedJobs.length - 1) return;
    const currentList = [...filteredAndSortedJobs];
    [currentList[displayIndex], currentList[displayIndex + 1]] =
      [currentList[displayIndex + 1], currentList[displayIndex]];
    const jobIds = currentList.map(job => job.id);
    setSortField(null);
    try {
      const response = await api.jobs.reorder(jobIds);
      if (response.success) {
        await fetchJobs();
      } else {
        showAlert(response.error || t('errors.saveOrderFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.saveOrderFailed'), 'error');
    }
  };

  const handleJobDragStart = (e: React.DragEvent, index: number) => {
    setJobDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleJobDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setJobDragOverIndex(index);
  };

  const handleJobDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (jobDragIndex === null || jobDragIndex === index) {
      setJobDragIndex(null);
      setJobDragOverIndex(null);
      return;
    }
    const currentList = [...filteredAndSortedJobs];
    const [removed] = currentList.splice(jobDragIndex, 1);
    currentList.splice(index, 0, removed);
    setJobDragIndex(null);
    setJobDragOverIndex(null);
    setSortField(null);
    const jobIds = currentList.map(job => job.id);
    try {
      const response = await api.jobs.reorder(jobIds);
      if (response.success) {
        await fetchJobs();
      } else {
        showAlert(response.error || t('errors.saveOrderFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.saveOrderFailed'), 'error');
    }
  };

  const handleJobDragEnd = () => {
    setJobDragIndex(null);
    setJobDragOverIndex(null);
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

    // No sort field = natural order
    if (!sortField) return filtered;

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
        case 'id':
          aValue = a.id.toLowerCase();
          bValue = b.id.toLowerCase();
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
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{t('common.loading')}</div>
      </div>
    );
  }

  const tabs = [
    { id: 'jobs' as TabType, label: t('tabs.jobs'), shortcut: `${modKey}1`, icon: ListChecks },
    { id: 'env' as TabType, label: t('tabs.env'), shortcut: `${modKey}2`, icon: Settings },
    { id: 'backups' as TabType, label: t('tabs.backups'), shortcut: `${modKey}3`, icon: Database },
  ];

  const isWsl = wslCronRunning !== null;
  const activeJobsCount = jobs.filter(j => j.enabled).length;

  return (
    <div className="app">
      {/* Update notice banner */}
      {updateInfo && !updateDismissed && (
        <div style={{
          background: '#0ea5e9',
          color: '#fff',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          gap: '8px',
        }}>
          <span>
            🚀 {t('updates.available', { version: updateInfo.latestVersion })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#fff',
                color: '#0ea5e9',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 12px',
                fontWeight: 600,
                fontSize: '12px',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {t('updates.download')}
            </a>
            <button
              onClick={() => setUpdateDismissed(true)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.8 }}
              title={t('common.close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* WSL cron warning banner */}
      {wslCronRunning !== null && (
        <div style={{
          background: wslCronRunning ? '#1e3a5f' : '#7c3aed',
          color: '#fff',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          gap: '8px',
        }}>
          <span>
            {wslUser && <span style={{ opacity: 0.8, marginRight: '8px' }}>WSL user: <strong>{wslUser}</strong></span>}
            {!wslCronRunning && '⚠️ WSL cron daemon is not running. Scheduled jobs will not execute.'}
            {wslCronRunning && '✓ WSL cron daemon is running.'}
          </span>
          {!wslCronRunning && (
            <button
              onClick={handleStartWslCron}
              disabled={startingWslCron}
              style={{
                background: '#fff',
                color: '#7c3aed',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 12px',
                cursor: startingWslCron ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '12px',
                whiteSpace: 'nowrap',
                opacity: startingWslCron ? 0.7 : 1,
              }}
            >
              {startingWslCron ? 'Starting…' : 'Start cron'}
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-top">
          <div>
            <h1>
              <img
                src={logoSvg}
                alt="Cron Manager Logo"
                style={{
                  width: '24px',
                  height: '24px',
                  marginRight: '8px',
                  verticalAlign: 'middle'
                }}
              />
              Cron Manager
            </h1>
            <div className="header-sub">{t('header.subtitle')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* Language Switcher */}
              <Select.Root value={i18n.language} onValueChange={(lang) => {
                i18n.changeLanguage(lang);
                localStorage.setItem('i18nextLng', lang);
              }}>
                <Select.Trigger
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '110px' }}
                  title={t('common.language')}
                >
                  <Languages size={16} />
                  <Select.Value />
                  <ChevronDown size={14} style={{ opacity: 0.6 }} />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="select-content"
                    position="popper"
                    sideOffset={5}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      minWidth: '110px',
                      zIndex: 1000,
                    }}
                  >
                    <Select.Viewport>
                      {['en', 'ko', 'zh-CN', 'ja', 'ru', 'hi', 'de', 'pt-BR'].map((lang) => (
                        <Select.Item
                          key={lang}
                          value={lang}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            outline: 'none',
                            userSelect: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-primary)';
                          }}
                        >
                          <Select.ItemText>{t(`languages.${lang}`)}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={14} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              {/* GitHub Link */}
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
              </a>

              {/* GitHub Star Button */}
              {ghAvailable ? (
                <button
                  onClick={handleToggleStar}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title={starred ? 'Unstar on GitHub' : 'Star on GitHub'}
                >
                  <Star
                    size={16}
                    fill={starred ? 'currentColor' : 'none'}
                    style={{ color: starred ? '#e3b341' : undefined }}
                  />
                  {starred ? 'Starred' : 'Star'}
                </button>
              ) : (
                <a
                  href="https://github.com/seunggabi/cron-manager"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Star on GitHub"
                >
                  <Star size={16} />
                  Star
                </a>
              )}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginRight: '8px' }}>
              v{packageJson.version}
            </div>
          </div>
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
                    {t('jobs.activeCount', { active: activeJobsCount, total: jobs.length })}
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
                      placeholder={t('jobs.searchPlaceholder')}
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
                        title={t('common.clearSearch')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="action-bar-right">
              <button
                onClick={handleSaveSortOrder}
                className="btn"
                title={t('jobs.saveOrder')}
              >
                <Save />
                {t('common.save')} <span style={{ opacity: 0.6, fontSize: '11px' }}>({modKey}S)</span>
              </button>
              <button onClick={() => handleSync()} className="btn">
                <RefreshCw />
                {t('common.sync')} <span style={{ opacity: 0.6, fontSize: '11px' }}>({modKey}R)</span>
              </button>
              <button
                onClick={() => {
                  setEditingJob(null);
                  setShowForm(true);
                }}
                className="btn btn-primary"
              >
                <Plus />
                {t('jobs.newJob')} <span style={{ opacity: 0.6, fontSize: '11px' }}>({modKey}N)</span>
              </button>
            </div>
          </div>

          {/* Jobs Table */}
          {jobs.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📋</div>
              <div className="empty-text">{t('jobs.noJobs')}</div>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
                style={{ marginTop: '20px' }}
              >
                <Plus />
                {t('jobs.addFirstJob')}
              </button>
            </div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', padding: '0' }}></th>
                      <th style={{ ...getColumnStyle('action'), textAlign: 'center' }}>
                        {t('common.actions')}
                        <ResizeHandle columnName="action" />
                      </th>
                      <th style={getColumnStyle('status')} onClick={() => handleSort('enabled')}>
                        {t('common.status')}
                        {sortField === 'enabled' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="status" />
                      </th>
                      <th style={getColumnStyle('name')} onClick={() => handleSort('name')}>
                        {t('jobs.table.name')}
                        {sortField === 'name' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="name" />
                      </th>
                      <th style={getColumnStyle('schedule')} onClick={() => handleSort('schedule')}>
                        {t('jobs.table.schedule')}
                        {sortField === 'schedule' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="schedule" />
                      </th>
                      <th style={getColumnStyle('command')} onClick={() => handleSort('command')}>
                        {t('jobs.table.command')}
                        {sortField === 'command' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="command" />
                      </th>
                      <th style={getColumnStyle('nextRun')} onClick={() => handleSort('nextRun')}>
                        {t('jobs.table.nextRun')}
                        {sortField === 'nextRun' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="nextRun" />
                      </th>
                      <th style={getColumnStyle('id')} onClick={() => handleSort('id')}>
                        {t('jobs.table.id')}
                        {sortField === 'id' && (
                          <span className="sort-icon">
                            {sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        )}
                        <ResizeHandle columnName="id" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedJobs.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                          <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>
                            {t('jobs.noSearchResults', { query: searchQuery })}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedJobs.map((job, index) => (
                      <tr
                        key={job.id}
                        draggable={!isJobSearchActive}
                        onDragStart={(e) => handleJobDragStart(e, index)}
                        onDragOver={(e) => handleJobDragOver(e, index)}
                        onDrop={(e) => handleJobDrop(e, index)}
                        onDragEnd={handleJobDragEnd}
                        style={{
                          opacity: jobDragIndex === index ? 0.4 : 1,
                          borderTop: jobDragOverIndex === index && jobDragIndex !== null && jobDragIndex > index
                            ? '2px solid var(--accent)' : undefined,
                          borderBottom: jobDragOverIndex === index && jobDragIndex !== null && jobDragIndex < index
                            ? '2px solid var(--accent)' : undefined,
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '4px' }}>
                          {!isJobSearchActive && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
                              <button
                                onClick={() => handleJobMoveUp(index)}
                                className="icon-btn"
                                style={{ width: '16px', height: '14px', padding: '0', opacity: index === 0 ? 0.3 : 1 }}
                                disabled={index === 0}
                                title={t('common.moveUp')}
                              >
                                <ChevronUp size={12} />
                              </button>
                              <GripVertical size={12} className="drag-handle" style={{ cursor: 'grab' }} />
                              <button
                                onClick={() => handleJobMoveDown(index)}
                                className="icon-btn"
                                style={{ width: '16px', height: '14px', padding: '0', opacity: index === filteredAndSortedJobs.length - 1 ? 0.3 : 1 }}
                                disabled={index === filteredAndSortedJobs.length - 1}
                                title={t('common.moveDown')}
                              >
                                <ChevronDown size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              onClick={() => handleRun(job.id)}
                              className={`icon-btn play${runningJobs.has(job.id) ? ' running' : ''}`}
                              title={t('jobs.runNow')}
                              data-tooltip={t('jobs.runNow')}
                              disabled={runningJobs.has(job.id)}
                            >
                              {runningJobs.has(job.id) ? <Loader2 className="spin" /> : <Play />}
                            </button>
                            <button
                              onClick={() => handleEdit(job)}
                              className="icon-btn edit"
                              title={t('common.edit')}
                              data-tooltip={t('common.edit')}
                            >
                              <Edit />
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="icon-btn delete"
                              title={t('common.delete')}
                              data-tooltip={t('common.delete')}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggle(job.id)}
                            className={`badge ${job.enabled ? 'badge-active' : 'badge-inactive'}`}
                            title={job.enabled ? t('common.inactive') : t('common.active')}
                          >
                            {job.enabled && <span className="dot"></span>}
                            {job.enabled ? t('common.active') : t('common.inactive')}
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
                            <textarea
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, job, 'command')}
                              onBlur={() => handleCellSave(job)}
                              autoFocus
                              className="mono"
                              style={{
                                width: '100%',
                                minHeight: '60px',
                                resize: 'vertical',
                                padding: '6px 10px',
                                border: '1.5px solid var(--accent)',
                                borderRadius: 'var(--radius)',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                              placeholder={t('common.saveHint')}
                            />
                          ) : (
                            <>
                              <code
                                className="command-text"
                                onDoubleClick={() => handleCellDoubleClick(job, 'command')}
                                style={{ cursor: 'pointer', display: 'block', whiteSpace: 'pre-wrap' }}
                              >
                                {job.command.replace(/ (>>|>) /g, '\n$1 ')}
                              </code>
                              <div className="command-links">
                                {!isWsl && (
                                  <button
                                    onClick={() => handleOpenScriptFolder(job.command)}
                                    className="command-link"
                                    title={t('jobs.table.openFolder')}
                                  >
                                    <FolderOpen />
                                    {t('jobs.table.executable')}
                                  </button>
                                )}
                                {extractLogFiles(job.command).length > 0 ? (
                                  extractLogFiles(job.command).map((logFile, idx) => (
                                    <LogButton
                                      key={idx}
                                      logFile={logFile}
                                      workingDir={job.workingDir}
                                      showAlert={showAlert}
                                      onOpenLog={(logPath, wd) => { setLogViewer({ logPath, workingDir: wd }); }}
                                      isWsl={isWsl}
                                    />
                                  ))
                                ) : (
                                  <button
                                    onClick={() => handleAddLog(job)}
                                    className="command-link"
                                    style={{
                                      color: '#6366f1',
                                      borderColor: '#6366f1',
                                    }}
                                    title={t('logs.addLog')}
                                  >
                                    <Plus />
                                    {t('logs.addLog')}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          <NextRunCell nextRun={job.nextRun ? job.nextRun.toISOString() : null} onExpired={silentRefreshNextRuns} />
                        </td>
                        <td>
                          <code className="mono" style={{ fontSize: '12px', opacity: 0.7 }}>
                            {job.id}
                          </code>
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

      {/* Log Viewer Modal */}
      {logViewer && (
        <LogViewer
          logPath={logViewer.logPath}
          workingDir={logViewer.workingDir}
          onClose={() => setLogViewer(null)}
        />
      )}
    </div>
  );
}

export default App;
