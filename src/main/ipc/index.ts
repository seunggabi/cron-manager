import { ipcMain, shell, BrowserWindow } from 'electron';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import type { ChildProcess } from 'child_process';
import https from 'https';
import { crontabService } from '../services/crontab.service';
import { scheduleService } from '../services/schedule.service';
import { configService } from '../services/config.service';
import type { CronJob, CreateJobRequest, UpdateJobRequest } from '../../../shared/types';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const activeTailProcesses = new Map<number, ChildProcess>();

export function setupIpcHandlers(config?: { htmlPath?: string }) {
  // Jobs handlers
  ipcMain.handle('jobs:checkPermission', async () => {
    try {
      const result = await crontabService.checkPermission();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:getWslUser', async () => {
    try {
      const user = await crontabService.getWslUser();
      return { success: true, data: user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:checkWslCronStatus', async () => {
    try {
      const result = await crontabService.checkWslCronStatus();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('jobs:startWslCron', async () => {
    try {
      const result = await crontabService.startWslCron();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

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

  /**
   * Validate log path to prevent directory traversal.
   * On Windows, Linux-style paths (starting with ~ or /) are WSL paths — pass through as-is.
   */
  function validateLogPath(logPath: string, workingDir?: string): {
    valid: boolean; expandedPath?: string; isWslPath?: boolean; error?: string;
  } {
    try {
      const isWin = process.platform === 'win32';

      // On Windows, Linux-style paths are WSL paths — skip Windows path resolution
      if (isWin && (logPath.startsWith('~') || logPath.startsWith('/'))) {
        return { valid: true, expandedPath: logPath, isWslPath: true };
      }

      let expandedPath = logPath;
      if (logPath.startsWith('~')) {
        expandedPath = logPath.replace('~', os.homedir());
      }

      if (!path.isAbsolute(expandedPath) && workingDir) {
        expandedPath = path.resolve(workingDir, expandedPath);
      } else if (!path.isAbsolute(expandedPath)) {
        expandedPath = path.resolve(os.homedir(), expandedPath);
      }

      expandedPath = path.normalize(expandedPath);

      const forbiddenPaths = isWin
        ? ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)']
        : ['/System', '/etc', '/var', '/usr', '/bin', '/sbin'];

      for (const forbidden of forbiddenPaths) {
        if (expandedPath.startsWith(forbidden + path.sep) || expandedPath === forbidden) {
          return { valid: false, error: 'Access to system directories is forbidden' };
        }
      }

      const homeDir = os.homedir();
      const isInHome = expandedPath.startsWith(homeDir + path.sep) || expandedPath === homeDir;
      const isInWorkingDir = workingDir && (
        expandedPath.startsWith(path.resolve(workingDir) + path.sep) ||
        expandedPath === path.resolve(workingDir)
      );

      if (!isInHome && !isInWorkingDir) {
        return { valid: false, error: 'Path must be within home directory or working directory' };
      }

      return { valid: true, expandedPath };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  // Open log viewer in a separate detachable window
  ipcMain.handle('logs:openWindow', async (_, logPath: string, workingDir?: string) => {
    try {
      const logWindow = new BrowserWindow({
        width: 900,
        height: 650,
        title: `Log: ${path.basename(logPath)}`,
        backgroundColor: '#0d1117',
        webPreferences: {
          preload: path.join(__dirname, '../../preload/index.js'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
        show: false,
      });

      const params: Record<string, string> = { mode: 'logviewer', logPath };
      if (workingDir) params.workingDir = workingDir;

      if (process.env.NODE_ENV === 'development') {
        const qs = new URLSearchParams(params).toString();
        await logWindow.loadURL(`http://localhost:5173/?${qs}`);
      } else {
        const htmlPath = config?.htmlPath || path.join(__dirname, '../../../dist/index.html');
        await logWindow.loadFile(htmlPath, { query: params });
      }

      logWindow.show();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Start real-time log stream (replaces external terminal approach)
  ipcMain.handle('logs:startStream', async (event, logPath?: string, workingDir?: string) => {
    try {
      if (!logPath) {
        return { success: false, error: 'Log path is required' };
      }

      const validation = validateLogPath(logPath, workingDir);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { expandedPath, isWslPath } = validation;
      const webContentsId = event.sender.id;

      // Kill existing stream for this window
      const existing = activeTailProcesses.get(webContentsId);
      if (existing) {
        existing.kill();
        activeTailProcesses.delete(webContentsId);
      }

      // Expand ~ for WSL paths — spawn doesn't use a shell so ~ is not expanded by default
      let tailPath = expandedPath!;
      if (isWslPath && tailPath.startsWith('~')) {
        try {
          const wslHome = await crontabService.getWslHome();
          tailPath = tailPath.replace(/^~/, wslHome);
        } catch {
          // Use original path if WSL home detection fails
        }
      }

      // Create file if it doesn't exist
      if (isWslPath) {
        // tailPath is already ~ expanded (e.g. /home/user/logs/test.log)
        const logDir = tailPath.substring(0, tailPath.lastIndexOf('/'));
        await execAsync(`wsl sh -c "mkdir -p '${logDir}' && touch '${tailPath}'"`)
          .catch(() => {});
      } else {
        const fs = await import('fs-extra');
        const fileExists = await fs.pathExists(tailPath);
        if (!fileExists) {
          await fs.ensureDir(path.dirname(tailPath));
          await fs.writeFile(tailPath, '');
        }
      }

      // For WSL paths: WSL→Windows pipe uses full buffering (~4KB) which
      // prevents real-time output regardless of stdbuf or tail flags.
      // Use execAsync polling instead — reads new lines every second via
      // 'wsl tail -n +N' which returns immediately with no buffering.
      if (isWslPath) {
        let currentLineCount = 0;
        try {
          const { stdout: wcOut } = await execAsync(`wsl wc -l '${tailPath}'`);
          currentLineCount = parseInt(wcOut.trim().split(/\s+/)[0], 10) || 0;
          const startLine = Math.max(1, currentLineCount - 199);
          const { stdout: initContent } = await execAsync(`wsl tail -n +${startLine} '${tailPath}'`);
          if (initContent && !event.sender.isDestroyed()) {
            event.sender.send('logs:data', initContent);
          }
        } catch {
          // File empty or not yet readable — start from line 0
        }

        const intervalId = setInterval(async () => {
          if (event.sender.isDestroyed()) {
            clearInterval(intervalId);
            activeTailProcesses.delete(webContentsId);
            return;
          }
          try {
            const { stdout } = await execAsync(`wsl tail -n +${currentLineCount + 1} '${tailPath}'`);
            if (stdout) {
              currentLineCount += stdout.split('\n').filter(l => l !== '').length;
              event.sender.send('logs:data', stdout);
            }
          } catch {
            // Ignore transient read errors
          }
        }, 1000);

        activeTailProcesses.set(webContentsId, { kill: () => clearInterval(intervalId) } as any);
        return { success: true };
      }

      // For non-WSL paths: use native tail -f process
      const tailArgs = ['-f', '-n', '200', tailPath];
      const tailProcess = spawn('tail', tailArgs);

      activeTailProcesses.set(webContentsId, tailProcess);

      tailProcess.stdout?.on('data', (chunk: Buffer) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('logs:data', chunk.toString());
        }
      });

      tailProcess.stderr?.on('data', (chunk: Buffer) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('logs:error', chunk.toString());
        }
      });

      tailProcess.on('close', () => {
        activeTailProcesses.delete(webContentsId);
        if (!event.sender.isDestroyed()) {
          event.sender.send('logs:closed');
        }
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Stop log stream
  ipcMain.handle('logs:stopStream', async (event) => {
    const proc = activeTailProcesses.get(event.sender.id);
    if (proc) {
      proc.kill();
      activeTailProcesses.delete(event.sender.id);
    }
    return { success: true };
  });

  // Check if log directory exists
  ipcMain.handle('logs:checkDir', async (_, logPath?: string, workingDir?: string) => {
    try {
      if (!logPath) {
        return { success: false, error: 'Log path is required' };
      }

      const validation = validateLogPath(logPath, workingDir);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { expandedPath, isWslPath } = validation;

      if (isWslPath) {
        let wslPath = expandedPath!;
        if (wslPath.startsWith('~')) {
          const home = await crontabService.getWslHome();
          wslPath = wslPath.replace(/^~/, home);
        }
        const logDir = wslPath.substring(0, wslPath.lastIndexOf('/'));
        try {
          const { stdout } = await execAsync(`wsl sh -c "test -d '${logDir}' && echo yes || echo no"`);
          return { success: true, data: { exists: stdout.trim() === 'yes', dir: logDir } };
        } catch {
          return { success: true, data: { exists: false, dir: logDir } };
        }
      }

      const fs = await import('fs-extra');
      const logDir = path.dirname(expandedPath!);
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

      const validation = validateLogPath(logPath, workingDir);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { expandedPath, isWslPath } = validation;

      if (isWslPath) {
        let wslPath = expandedPath!;
        if (wslPath.startsWith('~')) {
          const home = await crontabService.getWslHome();
          wslPath = wslPath.replace(/^~/, home);
        }
        const logDir = wslPath.substring(0, wslPath.lastIndexOf('/'));
        await execAsync(`wsl mkdir -p '${logDir}'`);
        return { success: true, data: { dir: logDir } };
      }

      const fs = await import('fs-extra');
      const logDir = path.dirname(expandedPath!);
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
      const validation = validateLogPath(logPath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const expandedPath = validation.expandedPath!;

      const fs = await import('fs-extra');

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

      // On Windows, WSL paths (~/... or /...) must be converted via wslpath.
      // shell.openPath is unreliable with \\wsl.localhost\ UNC paths, so we
      // spawn explorer.exe directly with the converted Windows path.
      if (process.platform === 'win32' && (filePath.startsWith('~') || filePath.startsWith('/'))) {
        try {
          const lastSlash = filePath.lastIndexOf('/');
          const dirPath = lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath;
          const { stdout } = await execAsync(`wsl wslpath -w "${dirPath}"`);
          const winDir = stdout.trim();
          spawn('explorer.exe', [winDir], { detached: true }).unref();
        } catch {
          return { success: false, error: 'Cannot open WSL path in Windows Explorer' };
        }
        return { success: true };
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

  // Updates handler - check latest version from GitHub Releases
  ipcMain.handle('updates:check', async () => {
    try {
      const data = await new Promise<any>((resolve, reject) => {
        const req = https.get(
          'https://api.github.com/repos/seunggabi/cron-manager/releases/latest',
          { headers: { 'User-Agent': 'cron-manager-app' } },
          (res) => {
            let body = '';
            res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
            res.on('end', () => {
              try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
            });
          }
        );
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Request timeout')); });
      });
      return { success: true, data: { latestVersion: data.tag_name as string, releaseUrl: data.html_url as string } };
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
