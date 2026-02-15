import { exec } from 'child_process';
import { promisify } from 'util';
import { CronJob } from '@cron-manager/shared';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

export class CrontabService {
  private static MARKER_PREFIX = '# CRON-MANAGER:';

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
   * Write crontab
   */
  async writeCrontab(content: string): Promise<void> {
    const fs = await import('fs-extra');
    const os = await import('os');
    const path = await import('path');

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
   * Parse crontab content to CronJob objects
   */
  parseCrontab(content: string): CronJob[] {
    const lines = content.split('\n');
    const jobs: CronJob[] = [];
    let currentMetadata: Partial<CronJob> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

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
      id: metadata.id || nanoid(),
      name: metadata.name || command.substring(0, 50),
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

      if (job.workingDir) {
        fullCommand = `cd ${this.shellEscape(job.workingDir)} && ${fullCommand}`;
      }

      if (job.env && Object.keys(job.env).length > 0) {
        const envVars = Object.entries(job.env)
          .map(([key, value]) => `${key}=${this.shellEscape(value)}`)
          .join(' ');
        fullCommand = `${envVars} ${fullCommand}`;
      }

      // Add log redirection
      if (job.logFile) {
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
      id: nanoid(),
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
}

export const crontabService = new CrontabService();
