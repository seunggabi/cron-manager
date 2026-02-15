import { exec } from 'child_process';
import { promisify } from 'util';
import { snowflakeId } from '@cron-manager/shared/utils';
import type { CronJob, GlobalEnv } from '../../../shared/types';
import { extractJobName } from '../utils/jobNameExtractor';
import type { ConfigService } from './config.service';

const execAsync = promisify(exec);

export class CrontabService {
  private static MARKER_PREFIX = '# CRON-MANAGER:';
  private globalEnv: GlobalEnv = {};
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Check if user has permission to access crontab
   * Attempts a dummy write to trigger macOS permission request if needed
   */
  async checkPermission(): Promise<{ hasPermission: boolean; error?: string }> {
    try {
      // Read current crontab (or empty if none exists)
      const currentCrontab = await this.readCrontab();

      // Write back the same content (dummy write to check permission)
      // This triggers macOS permission request popup if user doesn't have Full Disk Access
      await this.writeCrontab(currentCrontab);

      return { hasPermission: true };
    } catch (error: any) {
      // Permission denied or other errors
      return {
        hasPermission: false,
        error: error.message || 'Permission denied to access crontab'
      };
    }
  }

  /**
   * Read current user's crontab
   */
  async readCrontab(): Promise<string> {
    try {
      const { stdout } = await execAsync('crontab -l');
      return stdout;
    } catch (error: any) {
      // crontab -l returns error if no crontab exists
      if (error.message.includes('no crontab')) {
        return '';
      }
      throw error;
    }
  }

  /**
   * Backup current crontab before changes
   */
  async backupCrontab(): Promise<string | null> {
    const fs = await import('fs-extra');
    const os = await import('os');
    const path = await import('path');

    try {
      // Read current crontab
      const currentCrontab = await this.readCrontab();
      if (!currentCrontab) {
        return null; // No crontab to backup
      }

      // Create backup directory
      const backupDir = path.join(os.homedir(), '.cron-manager', 'backups');
      await fs.ensureDir(backupDir);

      // Create backup file with timestamp (KST/UTC+9 in ISO 8601 format)
      const now = new Date();
      const kstOffset = 9 * 60; // KST is UTC+9
      const kstDate = new Date(now.getTime() + kstOffset * 60 * 1000);
      const isoString = kstDate.toISOString();
      // Format: YYYY-MM-DDThh:mm:ss+09:00 (ISO 8601 with KST timezone)
      const timestamp = isoString.slice(0, 19) + '+09:00';
      const backupFile = path.join(backupDir, `crontab-${timestamp}.bak`);
      await fs.writeFile(backupFile, currentCrontab);

      // Clean up old backups (keep backups from last 3 days, but at least 3 most recent)
      const files = await fs.readdir(backupDir);
      const backupFilesWithStats = [];

      for (const file of files) {
        if (file.startsWith('crontab-') && file.endsWith('.bak')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          backupFilesWithStats.push({
            path: filePath,
            mtime: stats.mtime.getTime(),
          });
        }
      }

      // Sort by modification time, most recent first
      backupFilesWithStats.sort((a, b) => b.mtime - a.mtime);

      // Get backup config
      const backupConfig = this.configService.getBackupConfig();
      const maxDaysAgo = Date.now() - (backupConfig.maxBackupDays * 24 * 60 * 60 * 1000);

      // Remove old backups (AND condition: beyond maxBackups AND older than maxBackupDays)
      // Keep at least maxBackups most recent files, delete only if older than maxBackupDays
      for (let i = backupConfig.maxBackups; i < backupFilesWithStats.length; i++) {
        if (backupFilesWithStats[i].mtime < maxDaysAgo) {
          await fs.remove(backupFilesWithStats[i].path);
        }
      }

      return backupFile;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Write crontab
   */
  async writeCrontab(content: string): Promise<void> {
    const fs = await import('fs-extra');
    const os = await import('os');
    const path = await import('path');

    // Backup current crontab before writing
    await this.backupCrontab();

    // Create secure temporary directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'crontab-'));
    const tempFile = path.join(tmpDir, 'crontab.tmp');

    try {
      // Write with restrictive permissions (0600)
      await fs.writeFile(tempFile, content, { mode: 0o600 });
      await execAsync(`crontab ${tempFile}`);
    } finally {
      // Clean up temporary directory and file
      await fs.remove(tmpDir);
    }
  }

  /**
   * Parse global environment variables from crontab header
   */
  private parseGlobalEnv(content: string): GlobalEnv {
    const lines = content.split('\n');
    const globalEnv: GlobalEnv = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Stop on empty lines (after global env section)
      if (!trimmed) {
        // Only break if we've found at least one env var
        if (Object.keys(globalEnv).length > 0) {
          break;
        }
        continue;
      }

      // Skip comments but continue parsing
      if (trimmed.startsWith('#')) {
        continue;
      }

      // Stop when we hit cron jobs (5 fields before command)
      if (trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+/)) {
        break;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove surrounding quotes if present
        globalEnv[key] = value.replace(/^["']|["']$/g, '');
      }
    }

    return globalEnv;
  }

  /**
   * Parse crontab content to CronJob objects
   */
  parseCrontab(content: string): CronJob[] {
    // Parse global environment variables first
    this.globalEnv = this.parseGlobalEnv(content);

    const lines = content.split('\n');
    const jobs: CronJob[] = [];
    let currentMetadata: Partial<CronJob> = {};
    let inGlobalEnvSection = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip global env lines
      if (inGlobalEnvSection) {
        // Check if it's a CRON-MANAGER metadata comment
        if (line.startsWith(CrontabService.MARKER_PREFIX)) {
          inGlobalEnvSection = false;
        } else if (!line) {
          // Empty line, might be end of global env section
          // Don't exit yet, just continue
          continue;
        } else if (line.startsWith('#')) {
          // Regular comment in global env section, skip
          continue;
        } else if (line.match(/^[A-Z_][A-Z0-9_]*=/)) {
          // Global env variable, skip
          continue;
        } else {
          // Something else (cron job), exit global env section
          inGlobalEnvSection = false;
        }
      }

      // Skip empty lines
      if (!line) {
        currentMetadata = {};
        continue;
      }

      // Parse metadata comments
      if (line.startsWith(CrontabService.MARKER_PREFIX)) {
        const metaLine = line.substring(CrontabService.MARKER_PREFIX.length).trim();

        if (metaLine.startsWith('ID:')) {
          currentMetadata.id = metaLine.substring(3).trim();
        } else if (metaLine.startsWith('NAME:')) {
          currentMetadata.name = metaLine.substring(5).trim();
        } else if (metaLine.startsWith('DESC:')) {
          currentMetadata.description = metaLine.substring(5).trim();
        } else if (metaLine.startsWith('ENV:')) {
          const envPart = metaLine.substring(4).trim();
          try {
            currentMetadata.env = JSON.parse(envPart);
          } catch {
            // Invalid JSON, skip
          }
        } else if (metaLine.startsWith('TAGS:')) {
          const tagsPart = metaLine.substring(5).trim();
          currentMetadata.tags = tagsPart.split(',').map(t => t.trim());
        } else if (metaLine.startsWith('LOG:')) {
          currentMetadata.logFile = metaLine.substring(4).trim();
        } else if (metaLine.startsWith('LOGERR:')) {
          currentMetadata.logStderr = metaLine.substring(7).trim();
        } else if (metaLine.startsWith('WORKDIR:')) {
          currentMetadata.workingDir = metaLine.substring(8).trim();
        }
        continue;
      }

      // Parse cron job line
      if (line.startsWith('#')) {
        // Commented out job (disabled)
        const jobLine = line.substring(1).trim();
        const job = this.parseCronLine(jobLine, currentMetadata);
        if (job) {
          job.enabled = false;
          jobs.push(job);
          currentMetadata = {};
        }
      } else {
        // Active job
        const job = this.parseCronLine(line, currentMetadata);
        if (job) {
          job.enabled = true;
          jobs.push(job);
          currentMetadata = {};
        }
      }
    }

    return jobs;
  }

  /**
   * Parse single cron line
   */
  private parseCronLine(line: string, metadata: Partial<CronJob>): CronJob | null {
    // Cron format: minute hour day month weekday command
    const parts = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.+)$/);

    if (!parts) {
      return null;
    }

    const [, minute, hour, day, month, weekday, command] = parts;
    const schedule = `${minute} ${hour} ${day} ${month} ${weekday}`;

    return {
      id: metadata.id || snowflakeId(),
      name: metadata.name || extractJobName(command),
      description: metadata.description,
      schedule,
      command,
      enabled: true,
      env: metadata.env,
      workingDir: metadata.workingDir,
      logFile: metadata.logFile,
      logStderr: metadata.logStderr,
      tags: metadata.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Shell escape a string for safe use in shell commands
   */
  private shellEscape(str: string): string {
    // Replace single quotes with '\'' (end quote, escaped quote, start quote)
    return `'${str.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Convert CronJob objects to crontab content
   */
  serializeCrontab(jobs: CronJob[]): string {
    const lines: string[] = [];

    // Add global environment variables at the top
    const globalEnvKeys = Object.keys(this.globalEnv).sort();
    if (globalEnvKeys.length > 0) {
      for (const key of globalEnvKeys) {
        const value = this.globalEnv[key];
        // Quote value if it contains spaces
        const quotedValue = value.includes(' ') ? `"${value}"` : value;
        lines.push(`${key}=${quotedValue}`);
      }
      lines.push(''); // Empty line after global env
    }

    for (const job of jobs) {
      // Add metadata comments
      lines.push(`${CrontabService.MARKER_PREFIX}ID:${job.id}`);
      lines.push(`${CrontabService.MARKER_PREFIX}NAME:${job.name}`);

      if (job.description) {
        lines.push(`${CrontabService.MARKER_PREFIX}DESC:${job.description}`);
      }

      if (job.env && Object.keys(job.env).length > 0) {
        lines.push(`${CrontabService.MARKER_PREFIX}ENV:${JSON.stringify(job.env)}`);
      }

      if (job.tags && job.tags.length > 0) {
        lines.push(`${CrontabService.MARKER_PREFIX}TAGS:${job.tags.join(',')}`);
      }

      if (job.logFile) {
        lines.push(`${CrontabService.MARKER_PREFIX}LOG:${job.logFile}`);
      }

      if (job.logStderr) {
        lines.push(`${CrontabService.MARKER_PREFIX}LOGERR:${job.logStderr}`);
      }

      if (job.workingDir) {
        lines.push(`${CrontabService.MARKER_PREFIX}WORKDIR:${job.workingDir}`);
      }

      // Build command with environment variables
      let fullCommand = job.command;

      // Check if command already has log redirection
      const hasRedirect = /\s*>>\s*.+/.test(fullCommand);

      if (job.workingDir) {
        fullCommand = `cd ${this.shellEscape(job.workingDir)} && ${fullCommand}`;
      }

      if (job.env && Object.keys(job.env).length > 0) {
        const envVars = Object.entries(job.env)
          .map(([key, value]) => `${key}=${this.shellEscape(value)}`)
          .join(' ');
        fullCommand = `${envVars} ${fullCommand}`;
      }

      // Add log redirection only if command doesn't already have it
      if (job.logFile && !hasRedirect) {
        // Extract directory from log file path and create it if needed
        const logDir = job.logFile.substring(0, job.logFile.lastIndexOf('/'));
        if (logDir) {
          fullCommand = `mkdir -p ${this.shellEscape(logDir)} && ${fullCommand}`;
        }

        if (job.logStderr) {
          fullCommand = `${fullCommand} >> ${this.shellEscape(job.logFile)} 2>> ${this.shellEscape(job.logStderr)}`;
        } else {
          fullCommand = `${fullCommand} >> ${this.shellEscape(job.logFile)} 2>&1`;
        }
      }

      // Add cron line
      const cronLine = `${job.schedule} ${fullCommand}`;
      lines.push(job.enabled ? cronLine : `#${cronLine}`);

      // Add empty line for readability
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get all jobs
   */
  async getAllJobs(): Promise<CronJob[]> {
    const content = await this.readCrontab();
    return this.parseCrontab(content);
  }

  /**
   * Get job by ID
   */
  async getJobById(id: string): Promise<CronJob | null> {
    const jobs = await this.getAllJobs();
    return jobs.find(job => job.id === id) || null;
  }

  /**
   * Add new job
   */
  async addJob(job: Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<CronJob> {
    const jobs = await this.getAllJobs();

    const newJob: CronJob = {
      ...job,
      id: snowflakeId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jobs.push(newJob);
    await this.writeCrontab(this.serializeCrontab(jobs));

    return newJob;
  }

  /**
   * Update job
   */
  async updateJob(id: string, updates: Partial<CronJob>): Promise<CronJob | null> {
    const jobs = await this.getAllJobs();
    const index = jobs.findIndex(job => job.id === id);

    if (index === -1) {
      return null;
    }

    jobs[index] = {
      ...jobs[index],
      ...updates,
      id,
      updatedAt: new Date(),
    };

    await this.writeCrontab(this.serializeCrontab(jobs));

    return jobs[index];
  }

  /**
   * Delete job
   */
  async deleteJob(id: string): Promise<boolean> {
    const jobs = await this.getAllJobs();
    const filteredJobs = jobs.filter(job => job.id !== id);

    if (filteredJobs.length === jobs.length) {
      return false;
    }

    await this.writeCrontab(this.serializeCrontab(filteredJobs));
    return true;
  }

  /**
   * Toggle job enabled/disabled
   */
  async toggleJob(id: string): Promise<CronJob | null> {
    const job = await this.getJobById(id);

    if (!job) {
      return null;
    }

    return this.updateJob(id, { enabled: !job.enabled });
  }

  /**
   * Run job immediately
   */
  async runJob(id: string): Promise<any> {
    const job = await this.getJobById(id);

    if (!job) {
      throw new Error('Job not found');
    }

    // Merge environment variables (cron-like environment)
    // Priority: job env > global env > minimal process env
    const globalEnv = await this.getGlobalEnv();
    const mergedEnv = {
      // Minimal essential vars from process
      PATH: process.env.PATH || '/usr/bin:/bin',
      // Global env from crontab
      ...globalEnv,
      // Job-specific env (highest priority)
      ...job.env,
    };

    // Execute command with cwd option (safer than cd && command)
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(job.command, {
        timeout: 300000, // 5 minutes timeout
        env: mergedEnv,
        cwd: job.workingDir || undefined,
      });

      const duration = Date.now() - startTime;

      return {
        exitCode: 0,
        stdout,
        stderr,
        duration,
      };
    } catch (execError: any) {
      const duration = Date.now() - startTime;

      // Check if logfile exists (command might have succeeded despite timeout)
      let logFileExists = false;
      if (job.logFile) {
        try {
          const fs = await import('fs/promises');
          const logPath = job.logFile.replace(/^~/, process.env.HOME || '');
          await fs.access(logPath);
          logFileExists = true;
        } catch {
          // Logfile doesn't exist
        }
      }

      // If timeout but logfile exists, consider it successful
      const isTimeout = execError.killed || execError.signal === 'SIGTERM';
      const isSuccess = isTimeout && logFileExists;

      return {
        exitCode: isSuccess ? 0 : (execError.code || 1),
        stdout: execError.stdout || '',
        stderr: isSuccess ?
          `명령이 백그라운드에서 실행 중입니다. 로그 파일을 확인하세요: ${job.logFile}` :
          (execError.stderr || execError.message),
        duration,
        error: !isSuccess,
      };
    }
  }

  /**
   * Test job in 1 minute (creates temp job, runs, auto-deletes)
   */
  async testJobIn1Minute(command: string, options?: {
    env?: Record<string, string>;
    workingDir?: string;
  }): Promise<CronJob> {
    const now = new Date();
    const testTime = new Date(now.getTime() + 60000); // 1 minute from now

    const minute = testTime.getMinutes();
    const hour = testTime.getHours();
    const schedule = `${minute} ${hour} * * *`;

    const testJob = await this.addJob({
      name: `[TEST] ${command.substring(0, 30)}`,
      description: 'Auto-generated test job - will be deleted after execution',
      schedule,
      command,
      enabled: true,
      env: options?.env,
      workingDir: options?.workingDir,
      tags: ['test', 'auto-delete'],
    });

    // Schedule deletion after 2 minutes
    setTimeout(async () => {
      try {
        await this.deleteJob(testJob.id);
      } catch (error) {
        // Silently ignore deletion errors for test jobs
      }
    }, 120000);

    return testJob;
  }

  /**
   * Reorder jobs in crontab file
   */
  async reorderJobs(jobIds: string[]): Promise<CronJob[]> {
    const jobs = await this.getAllJobs();

    // Create a map for quick lookup
    const jobMap = new Map(jobs.map(job => [job.id, job]));

    // Build reordered array based on jobIds
    const reorderedJobs: CronJob[] = [];

    for (const id of jobIds) {
      const job = jobMap.get(id);
      if (job) {
        reorderedJobs.push(job);
        jobMap.delete(id);
      }
    }

    // Append any jobs that weren't in the jobIds list (shouldn't happen normally)
    jobMap.forEach(job => reorderedJobs.push(job));

    // Write the reordered crontab
    await this.writeCrontab(this.serializeCrontab(reorderedJobs));

    return reorderedJobs;
  }

  /**
   * List all available backups with metadata
   */
  async listBackups(): Promise<Array<{
    filename: string;
    timestamp: Date;
    path: string;
    size: number;
  }>> {
    const fs = await import('fs-extra');
    const os = await import('os');
    const path = await import('path');

    try {
      const backupDir = path.join(os.homedir(), '.cron-manager', 'backups');

      // Check if backup directory exists
      const dirExists = await fs.pathExists(backupDir);
      if (!dirExists) {
        return [];
      }

      const files = await fs.readdir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('crontab-') && file.endsWith('.bak')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);

          // Parse timestamp from filename
          // Format: crontab-2024-02-14T16-30-00-123Z.bak
          // Timestamp parsed from filename not needed; using stats.mtime instead

          backups.push({
            filename: file,
            timestamp: stats.mtime, // Use file modification time as more reliable
            path: filePath,
            size: stats.size,
          });
        }
      }

      // Sort by timestamp, most recent first
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Restore crontab from a backup file
   */
  async restoreBackup(backupPath: string): Promise<void> {
    const fs = await import('fs-extra');

    try {
      // Check if backup file exists
      const exists = await fs.pathExists(backupPath);
      if (!exists) {
        throw new Error('Backup file not found');
      }

      // Read backup content
      const backupContent = await fs.readFile(backupPath, 'utf-8');

      // Create a backup of current state before restoring
      await this.backupCrontab();

      // Write the backup content as current crontab
      const tempFile = `/tmp/crontab-restore-${Date.now()}.tmp`;
      try {
        await fs.writeFile(tempFile, backupContent);
        await execAsync(`crontab ${tempFile}`);
      } finally {
        await fs.remove(tempFile);
      }
    } catch (error: any) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * Get global environment variables
   */
  async getGlobalEnv(): Promise<GlobalEnv> {
    // Refresh from crontab to ensure we have latest
    const content = await this.readCrontab();
    this.globalEnv = this.parseGlobalEnv(content);
    return { ...this.globalEnv };
  }

  /**
   * Set global environment variables
   */
  async setGlobalEnv(env: GlobalEnv): Promise<void> {
    // Update in-memory global env
    this.globalEnv = { ...env };

    // Get current jobs (this will overwrite this.globalEnv, so we need to restore it)
    const jobs = await this.getAllJobs();

    // Restore the env we want to save (getAllJobs overwrites this.globalEnv)
    this.globalEnv = { ...env };

    // Serialize and write back (this will include the new global env)
    await this.writeCrontab(this.serializeCrontab(jobs));
  }

  /**
   * Update specific global environment variable
   */
  async updateGlobalEnvVar(key: string, value: string): Promise<GlobalEnv> {
    const currentEnv = await this.getGlobalEnv();
    currentEnv[key] = value;
    await this.setGlobalEnv(currentEnv);
    return currentEnv;
  }

  /**
   * Delete specific global environment variable
   */
  async deleteGlobalEnvVar(key: string): Promise<GlobalEnv> {
    const currentEnv = await this.getGlobalEnv();
    delete currentEnv[key];
    await this.setGlobalEnv(currentEnv);
    return currentEnv;
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    const fs = await import('fs-extra');
    const os = await import('os');
    const path = await import('path');

    try {
      const backupDir = path.join(os.homedir(), '.cron-manager', 'backups');

      // Check if backup directory exists
      const dirExists = await fs.pathExists(backupDir);
      if (!dirExists) {
        return;
      }

      const files = await fs.readdir(backupDir);
      const backupFilesWithStats = [];

      for (const file of files) {
        if (file.startsWith('crontab-') && file.endsWith('.bak')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          backupFilesWithStats.push({
            path: filePath,
            mtime: stats.mtime.getTime(),
          });
        }
      }

      // Sort by modification time, most recent first
      backupFilesWithStats.sort((a, b) => b.mtime - a.mtime);

      // Get backup config
      const backupConfig = this.configService.getBackupConfig();
      const maxDaysAgo = Date.now() - (backupConfig.maxBackupDays * 24 * 60 * 60 * 1000);

      // Remove old backups (AND condition: beyond maxBackups AND older than maxBackupDays)
      // Keep at least maxBackups most recent files, delete only if older than maxBackupDays
      for (let i = backupConfig.maxBackups; i < backupFilesWithStats.length; i++) {
        if (backupFilesWithStats[i].mtime < maxDaysAgo) {
          await fs.remove(backupFilesWithStats[i].path);
        }
      }
    } catch (error: any) {
      // Silently ignore errors in cleanup
    }
  }

  /**
   * Compare current crontab with a backup file
   */
  async diffWithBackup(backupPath: string): Promise<{ current: string; backup: string; diff: Array<{ type: 'add' | 'remove' | 'same'; line: string; lineNumber?: number }> }> {
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    // Read current crontab
    const current = await this.readCrontab();

    // Validate and read backup file
    const backupDir = path.join(os.homedir(), '.cron-manager', 'backups');
    const resolvedPath = path.resolve(backupPath);
    if (!resolvedPath.startsWith(backupDir)) {
      throw new Error('Invalid backup path');
    }

    const backup = await fs.readFile(backupPath, 'utf-8');

    // Simple line-by-line diff
    const currentLines = current.split('\n');
    const backupLines = backup.split('\n');
    const diff: Array<{ type: 'add' | 'remove' | 'same'; line: string; lineNumber?: number }> = [];

    const maxLength = Math.max(currentLines.length, backupLines.length);

    for (let i = 0; i < maxLength; i++) {
      const currentLine = currentLines[i];
      const backupLine = backupLines[i];

      if (currentLine === backupLine) {
        if (currentLine !== undefined) {
          diff.push({ type: 'same', line: currentLine, lineNumber: i + 1 });
        }
      } else {
        if (backupLine !== undefined) {
          diff.push({ type: 'remove', line: backupLine, lineNumber: i + 1 });
        }
        if (currentLine !== undefined) {
          diff.push({ type: 'add', line: currentLine, lineNumber: i + 1 });
        }
      }
    }

    return { current, backup, diff };
  }
}

// Export singleton will be initialized in main/index.ts
export let crontabService: CrontabService;

export function initCrontabService(configService: ConfigService) {
  crontabService = new CrontabService(configService);
}
