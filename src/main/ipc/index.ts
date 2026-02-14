import { ipcMain, shell } from 'electron';
import { crontabService } from '../services/crontab.service';
import { scheduleService } from '../services/schedule.service';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '../../../shared/types';
import path from 'path';
import os from 'os';

export function setupIpcHandlers() {
  // Jobs handlers
  ipcMain.handle('jobs:getAll', async () => {
    try {
      const jobs = await crontabService.getAllJobs();

      // Calculate next run for each job
      for (const job of jobs) {
        if (job.enabled) {
          const nextRuns = scheduleService.getNextRuns(job.schedule, 1);
          job.nextRun = nextRuns[0];
        }
      }

      return { success: true, data: jobs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:create', async (_, data: CreateJobRequest) => {
    try {
      // Validate schedule
      const validation = scheduleService.validateSchedule(data.schedule);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid schedule: ${validation.error}`
        };
      }

      const job = await crontabService.addJob({
        name: data.name,
        description: data.description,
        schedule: data.schedule,
        command: data.command,
        enabled: true,
        env: data.env,
        workingDir: data.workingDir,
        logFile: data.logFile,
        logStderr: data.logStderr,
        tags: data.tags,
      });

      return { success: true, data: job };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:update', async (_, id: string, updates: UpdateJobRequest) => {
    try {
      // Validate schedule if provided
      if (updates.schedule) {
        const validation = scheduleService.validateSchedule(updates.schedule);
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid schedule: ${validation.error}`
          };
        }
      }

      const job = await crontabService.updateJob(id, updates);

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      return { success: true, data: job };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:delete', async (_, id: string) => {
    try {
      const deleted = await crontabService.deleteJob(id);

      if (!deleted) {
        return { success: false, error: 'Job not found' };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:toggle', async (_, id: string) => {
    try {
      const job = await crontabService.toggleJob(id);

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      return { success: true, data: job };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:run', async (_, id: string) => {
    try {
      const result = await crontabService.runJob(id);
      return { success: !result.error, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:sync', async () => {
    try {
      const jobs = await crontabService.getAllJobs();
      return { success: true, data: jobs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:testIn1Minute', async (_, command: string, options?: {
    env?: Record<string, string>;
    workingDir?: string;
  }) => {
    try {
      const job = await crontabService.testJobIn1Minute(command, options);
      return { success: true, data: job };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:reorder', async (_, jobIds: string[]) => {
    try {
      const jobs = await crontabService.reorderJobs(jobIds);
      return { success: true, data: jobs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Schedule handlers
  ipcMain.handle('schedule:parse', async (_, schedule: string, count?: number) => {
    try {
      const validation = scheduleService.validateSchedule(schedule);

      if (!validation.valid) {
        return {
          success: true,
          data: {
            valid: false,
            error: validation.error
          }
        };
      }

      const nextRuns = scheduleService.getNextRuns(schedule, count || 5);
      const humanReadable = scheduleService.toHumanReadable(schedule);

      return {
        success: true,
        data: {
          valid: true,
          nextRuns,
          humanReadable,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('schedule:getPresets', async () => {
    try {
      const presets = scheduleService.getPresets();
      return { success: true, data: presets };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Logs handler
  ipcMain.handle('logs:open', async (_, logPath?: string, workingDir?: string) => {
    try {
      if (!logPath) {
        return { success: false, error: 'Log path is required' };
      }

      // Expand ~ to home directory
      let expandedPath = logPath;
      if (logPath.startsWith('~')) {
        expandedPath = logPath.replace('~', os.homedir());
      }

      // If path is relative and workingDir is provided, resolve it
      if (!path.isAbsolute(expandedPath) && workingDir) {
        expandedPath = path.resolve(workingDir, expandedPath);
      } else if (!path.isAbsolute(expandedPath)) {
        // If still relative, resolve from home directory
        expandedPath = path.resolve(os.homedir(), expandedPath);
      }

      // Use Terminal with tail -f for real-time log viewing
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const fs = await import('fs-extra');

      // Check if file exists
      const fileExists = await fs.pathExists(expandedPath);

      if (fileExists) {
        // Open Terminal and run tail -f on the log file
        const escapedPath = expandedPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        await execAsync(`osascript -e "tell application \\"Terminal\\" to do script \\"tail -f '${escapedPath}'\\""`);
      } else {
        // If file doesn't exist, open the directory
        const logDir = path.dirname(expandedPath);
        const dirExists = await fs.pathExists(logDir);

        if (!dirExists) {
          return { success: false, error: `Directory does not exist: ${logDir}` };
        }

        await execAsync(`open "${logDir}"`);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Files handler - open executable file directory
  ipcMain.handle('files:open', async (_, filePath: string) => {
    try {
      if (!filePath) {
        return { success: false, error: 'File path is required' };
      }

      // Get directory from file path
      const fileDir = path.dirname(filePath);

      // Use macOS 'open' command for reliability
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync(`open "${fileDir}"`);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Backups handlers
  ipcMain.handle('backups:list', async () => {
    try {
      const backups = await crontabService.listBackups();
      return { success: true, data: backups };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backups:restore', async (_, backupPath: string) => {
    try {
      await crontabService.restoreBackup(backupPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Global Environment Variables handlers
  ipcMain.handle('env:getGlobal', async () => {
    try {
      const env = await crontabService.getGlobalEnv();
      return { success: true, data: env };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('env:setGlobal', async (_, env: Record<string, string>) => {
    try {
      await crontabService.setGlobalEnv(env);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('env:updateGlobalVar', async (_, key: string, value: string) => {
    try {
      const env = await crontabService.updateGlobalEnvVar(key, value);
      return { success: true, data: env };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('env:deleteGlobalVar', async (_, key: string) => {
    try {
      const env = await crontabService.deleteGlobalEnvVar(key);
      return { success: true, data: env };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
