import { contextBridge, ipcRenderer } from 'electron';
import type {
  CronJob,
  CreateJobRequest,
  UpdateJobRequest,
  ParseScheduleResponse,
  SchedulePreset,
  GlobalEnv
} from '../../shared/types';

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Define the API that will be exposed to the renderer
const api = {
  // Jobs API
  jobs: {
    checkPermission: (): Promise<IpcResponse<{ hasPermission: boolean; cronRunning?: boolean; error?: string }>> =>
      ipcRenderer.invoke('jobs:checkPermission'),

    getWslUser: (): Promise<IpcResponse<string>> =>
      ipcRenderer.invoke('jobs:getWslUser'),

    checkWslCronStatus: (): Promise<IpcResponse<{ running: boolean; error?: string }>> =>
      ipcRenderer.invoke('jobs:checkWslCronStatus'),

    startWslCron: (): Promise<IpcResponse<{ success: boolean; error?: string }>> =>
      ipcRenderer.invoke('jobs:startWslCron'),

    getAll: (): Promise<IpcResponse<CronJob[]>> =>
      ipcRenderer.invoke('jobs:getAll'),

    create: (data: CreateJobRequest): Promise<IpcResponse<CronJob>> =>
      ipcRenderer.invoke('jobs:create', data),

    update: (id: string, updates: UpdateJobRequest): Promise<IpcResponse<CronJob>> =>
      ipcRenderer.invoke('jobs:update', id, updates),

    delete: (id: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('jobs:delete', id),

    toggle: (id: string): Promise<IpcResponse<CronJob>> =>
      ipcRenderer.invoke('jobs:toggle', id),

    run: (id: string): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('jobs:run', id),

    sync: (): Promise<IpcResponse<CronJob[]>> =>
      ipcRenderer.invoke('jobs:sync'),

    testIn1Minute: (command: string, options?: {
      env?: Record<string, string>;
      workingDir?: string;
    }): Promise<IpcResponse<CronJob>> =>
      ipcRenderer.invoke('jobs:testIn1Minute', command, options),

    reorder: (jobIds: string[]): Promise<IpcResponse<CronJob[]>> =>
      ipcRenderer.invoke('jobs:reorder', jobIds),
  },

  // Schedule API
  schedule: {
    parse: (schedule: string, count?: number): Promise<IpcResponse<ParseScheduleResponse>> =>
      ipcRenderer.invoke('schedule:parse', schedule, count),

    getPresets: (): Promise<IpcResponse<SchedulePreset[]>> =>
      ipcRenderer.invoke('schedule:getPresets'),
  },

  // Logs API
  logs: {
    openWindow: (logPath: string, workingDir?: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('logs:openWindow', logPath, workingDir),

    startStream: (logPath: string, workingDir?: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('logs:startStream', logPath, workingDir),

    stopStream: (): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('logs:stopStream'),

    onData: (callback: (data: string) => void) => {
      const handler = (_: unknown, data: string) => callback(data);
      ipcRenderer.on('logs:data', handler);
      return () => ipcRenderer.removeListener('logs:data', handler);
    },

    onError: (callback: (err: string) => void) => {
      const handler = (_: unknown, err: string) => callback(err);
      ipcRenderer.on('logs:error', handler);
      return () => ipcRenderer.removeListener('logs:error', handler);
    },

    onClose: (callback: () => void) => {
      ipcRenderer.on('logs:closed', callback);
      return () => ipcRenderer.removeListener('logs:closed', callback);
    },

    create: (logPath: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('logs:create', logPath),

    checkDir: (logPath?: string, workingDir?: string): Promise<IpcResponse<{ exists: boolean; dir: string }>> =>
      ipcRenderer.invoke('logs:checkDir', logPath, workingDir),

    createDir: (logPath?: string, workingDir?: string): Promise<IpcResponse<{ dir: string }>> =>
      ipcRenderer.invoke('logs:createDir', logPath, workingDir),
  },

  // Files API
  files: {
    open: (filePath: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('files:open', filePath),
  },

  // Backups API
  backups: {
    list: (): Promise<IpcResponse<Array<{
      filename: string;
      timestamp: Date;
      path: string;
      size: number;
    }>>> =>
      ipcRenderer.invoke('backups:list'),

    restore: (backupPath: string): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('backups:restore', backupPath),

    diff: (backupPath: string): Promise<IpcResponse<{
      current: string;
      backup: string;
      diff: Array<{ type: 'add' | 'remove' | 'same'; line: string; lineNumber?: number }>;
    }>> =>
      ipcRenderer.invoke('backups:diff', backupPath),
  },

  // Global Environment Variables API
  env: {
    getGlobal: (): Promise<IpcResponse<GlobalEnv>> =>
      ipcRenderer.invoke('env:getGlobal'),

    setGlobal: (env: GlobalEnv): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('env:setGlobal', env),

    updateGlobalVar: (key: string, value: string): Promise<IpcResponse<GlobalEnv>> =>
      ipcRenderer.invoke('env:updateGlobalVar', key, value),

    deleteGlobalVar: (key: string): Promise<IpcResponse<GlobalEnv>> =>
      ipcRenderer.invoke('env:deleteGlobalVar', key),
  },

  // Config API
  config: {
    getBackupConfig: (): Promise<IpcResponse<{ maxBackups: number; maxBackupDays: number }>> =>
      ipcRenderer.invoke('config:getBackupConfig'),

    updateBackupConfig: (maxBackups: number, maxBackupDays: number): Promise<IpcResponse<void>> =>
      ipcRenderer.invoke('config:updateBackupConfig', maxBackups, maxBackupDays),
  },

  // Updates API
  updates: {
    check: (): Promise<IpcResponse<{ latestVersion: string; releaseUrl: string }>> =>
      ipcRenderer.invoke('updates:check'),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for TypeScript
export type ElectronAPI = typeof api;
