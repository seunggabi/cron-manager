import { ipcMain, shell } from 'electron';
import { crontabService } from '../services/crontab.service';
import { scheduleService } from '../services/schedule.service';
import { configService } from '../services/config.service';
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
      // Validate required fields
      if (!data.command || !data.schedule) {
        return { success: false, error: 'Command and schedule are required' };
      }
      // Validate name length
      if (data.name && data.name.length > 200) {
        return { success: false, error: 'Name too long' };
      }
      // Validate workingDir is a valid path
      if (data.workingDir && !path.isAbsolute(data.workingDir)) {
        return { success: false, error: 'Working directory must be absolute path' };
      }

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
        command: data.command.trim(),
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
      // Validate name length
      if (updates.name && updates.name.length > 200) {
        return { success: false, error: 'Name too long' };
      }
      // Validate workingDir is a valid path
      if (updates.workingDir && !path.isAbsolute(updates.workingDir)) {
        return { success: false, error: 'Working directory must be absolute path' };
      }

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

      // Trim command if provided
      if (updates.command) {
        updates.command = updates.command.trim();
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

      if (!fileExists) {
        // If file doesn't exist, create directory and empty file
        const logDir = path.dirname(expandedPath);

        // Create directory if it doesn't exist
        await fs.ensureDir(logDir);

        // Create empty file
        await fs.writeFile(expandedPath, '');
      }

      // Open Terminal and run tail -f on the log file
      const safePath = expandedPath.replace(/'/g, "'\\''");
      await execAsync(`osascript -e "tell application \\"Terminal\\" to do script \\"tail -f '${safePath}'\\""`);


      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Check if log directory exists
  ipcMain.handle('logs:checkDir', async (_, logPath?: string, workingDir?: string) => {
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
        expandedPath = path.resolve(os.homedir(), expandedPath);
      }

      const fs = await import('fs-extra');
      const logDir = path.dirname(expandedPath);
      const dirExists = await fs.pathExists(logDir);

      return { success: true, data: { exists: dirExists, dir: logDir } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Create log directory only
  ipcMain.handle('logs:createDir', async (_, logPath?: string, workingDir?: string) => {
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
        expandedPath = path.resolve(os.homedir(), expandedPath);
      }

      const fs = await import('fs-extra');
      const logDir = path.dirname(expandedPath);

      // Create directory
      await fs.ensureDir(logDir);

      return { success: true, data: { dir: logDir } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Create log file handler
  ipcMain.handle('logs:create', async (_, logPath: string) => {
    try {
      if (!logPath) {
        return { success: false, error: 'Log path is required' };
      }

      // Validate log path
      const expandedLogPath = logPath.startsWith('~') ? logPath.replace('~', os.homedir()) : logPath;
      if (!path.isAbsolute(expandedLogPath) || expandedLogPath.startsWith('/System') || expandedLogPath.startsWith('/etc')) {
        return { success: false, error: 'Invalid log path' };
      }

      const fs = await import('fs-extra');

      // Expand ~ to home directory
      let expandedPath = logPath;
      if (logPath.startsWith('~')) {
        expandedPath = logPath.replace('~', os.homedir());
      }

      // Ensure directory exists
      const logDir = path.dirname(expandedPath);
      await fs.ensureDir(logDir);

      // Create empty log file
      await fs.writeFile(expandedPath, '');

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

      // Validate file path
      if (!path.isAbsolute(filePath) && !filePath.startsWith('~')) {
        return { success: false, error: 'File path must be absolute' };
      }

      // Get directory from file path
      let expandedFilePath = filePath;
      if (filePath.startsWith('~')) {
        expandedFilePath = filePath.replace('~', os.homedir());
      }
      const fileDir = path.dirname(expandedFilePath);

      await shell.openPath(fileDir);

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
      // Validate backup path is within the expected backup directory
      const backupDir = path.join(os.homedir(), '.cron-manager', 'backups');
      const resolvedPath = path.resolve(backupPath);
      if (!resolvedPath.startsWith(backupDir)) {
        return { success: false, error: 'Invalid backup path' };
      }

      await crontabService.restoreBackup(backupPath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backups:diff', async (_, backupPath: string) => {
    try {
      const result = await crontabService.diffWithBackup(backupPath);
      return { success: true, data: result };
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
      // Validate key format
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        return { success: false, error: 'Invalid environment variable name' };
      }
      // Validate value has no newlines
      if (value.includes('\n')) {
        return { success: false, error: 'Value cannot contain newlines' };
      }

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

  // Backup config handlers
  ipcMain.handle('config:getBackupConfig', async () => {
    try {
      const config = configService.getBackupConfig();
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:updateBackupConfig', async (_, maxBackups: number, maxBackupDays: number) => {
    try {
      await configService.updateBackupConfig({ maxBackups, maxBackupDays });
      // Clean up old backups immediately after config update
      await crontabService.cleanupOldBackups();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
