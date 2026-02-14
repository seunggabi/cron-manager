/**
 * Shared TypeScript types for Cron Manager
 */

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  schedule: string; // cron expression
  command: string;
  enabled: boolean;
  env?: Record<string, string>; // environment variables
  workingDir?: string; // working directory for command execution
  logFile?: string; // stdout log file path
  logStderr?: string; // stderr log file path (optional)
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  runCount?: number;
  failCount?: number;
}

export interface LogEntry {
  id: string;
  jobId: string;
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  duration?: number; // milliseconds
  success: boolean;
}

export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface SchedulePreset {
  id: string;
  name: string;
  description: string;
  schedule: string;
}

export interface Config {
  globalEnv?: Record<string, string>;
  logDir?: string; // default log directory
  logRotation?: {
    enabled: boolean;
    maxSize: string; // e.g., '10M'
    maxFiles: number;
  };
  notifications?: {
    email?: EmailConfig;
    slack?: SlackConfig;
    discord?: DiscordConfig;
  };
  backup?: {
    enabled: boolean;
    schedule: string;
    maxBackups: number;
    backupDir?: string;
  };
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel?: string;
}

export interface DiscordConfig {
  enabled: boolean;
  webhookUrl: string;
}

export interface BackupItem {
  id: string;
  timestamp: Date;
  jobs: CronJob[];
  config?: Config;
  filePath: string;
}

// API Request/Response types
export interface CreateJobRequest {
  name: string;
  description?: string;
  schedule: string;
  command: string;
  env?: Record<string, string>;
  workingDir?: string;
  logFile?: string;
  logStderr?: string;
  tags?: string[];
}

export interface UpdateJobRequest extends Partial<CreateJobRequest> {
  enabled?: boolean;
}

export interface RunJobRequest {
  testMode?: boolean; // if true, run once without modifying crontab
  delayMinutes?: number; // delay execution by n minutes
}

export interface ParseScheduleRequest {
  schedule: string;
  count?: number; // number of next runs to calculate
}

export interface ParseScheduleResponse {
  valid: boolean;
  error?: string;
  nextRuns?: Date[];
  humanReadable?: string;
}

export interface NaturalLanguageRequest {
  text: string; // e.g., "every day at 9am", "every 10 minutes"
}

export interface NaturalLanguageResponse {
  schedule?: string;
  error?: string;
  confidence?: number; // 0-1
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter/Query types
export interface JobFilter {
  enabled?: boolean;
  tags?: string[];
  search?: string; // search in name/description/command
}

export interface LogFilter {
  jobId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Global environment variables for crontab
export interface GlobalEnv {
  [key: string]: string;
}

// Global environment variables for crontab
export interface GlobalEnv {
  [key: string]: string;
}
