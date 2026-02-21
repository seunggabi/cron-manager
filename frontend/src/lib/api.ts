import type {
  CronJob,
  CreateJobRequest,
  UpdateJobRequest,
  ParseScheduleRequest,
  ParseScheduleResponse,
  SchedulePreset,
} from '@cron-manager/shared';

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper to handle IPC responses
async function handleIpcResponse<T>(promise: Promise<IpcResponse<T>>): Promise<T> {
  const response = await promise;
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  return response.data as T;
}

// Jobs API
export const jobsApi = {
  getAll: async (): Promise<CronJob[]> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.getAll());
  },

  getById: async (id: string): Promise<CronJob> => {
    // For now, get all and filter (could optimize with specific IPC handler)
    const jobs = await jobsApi.getAll();
    const job = jobs.find(j => j.id === id);
    if (!job) {
      throw new Error('Job not found');
    }
    return job;
  },

  create: async (data: CreateJobRequest): Promise<CronJob> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.create(data));
  },

  update: async (id: string, data: Partial<UpdateJobRequest>): Promise<CronJob> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.update(id, data));
  },

  delete: async (id: string): Promise<void> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    await handleIpcResponse(window.electronAPI.jobs.delete(id));
  },

  toggle: async (id: string): Promise<CronJob> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.toggle(id));
  },

  run: async (id: string): Promise<any> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.run(id));
  },

  sync: async (): Promise<CronJob[]> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.sync());
  },

  testIn1Minute: async (command: string, options?: {
    env?: Record<string, string>;
    workingDir?: string;
  }): Promise<CronJob> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.jobs.testIn1Minute(command, options));
  },
};

// Schedule API
export const scheduleApi = {
  parse: async (data: ParseScheduleRequest): Promise<ParseScheduleResponse> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(
      window.electronAPI.schedule.parse(data.schedule, data.count)
    );
  },

  getPresets: async (): Promise<SchedulePreset[]> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    return handleIpcResponse(window.electronAPI.schedule.getPresets());
  },
};

// Logs API
export const logsApi = {
  openWindow: async (logPath: string, workingDir?: string): Promise<void> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    await handleIpcResponse(window.electronAPI.logs.openWindow(logPath, workingDir));
  },

  create: async (logPath: string): Promise<void> => {
    if (!isElectron) {
      throw new Error('Electron API not available');
    }
    await handleIpcResponse(window.electronAPI.logs.create(logPath));
  },
};
