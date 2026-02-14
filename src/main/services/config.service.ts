import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface BackupConfig {
  maxBackups: number;
  maxBackupDays: number;
}

export interface AppConfig {
  backup: BackupConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  backup: {
    maxBackups: 10,
    maxBackupDays: 7,
  },
};

export class ConfigService {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    this.configPath = path.join(os.homedir(), '.cron-manager', 'config.json');
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<AppConfig> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const data = await fs.readJson(this.configPath);
        this.config = { ...DEFAULT_CONFIG, ...data };
      } else {
        // Create default config file
        await this.save(DEFAULT_CONFIG);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = DEFAULT_CONFIG;
    }
    return this.config;
  }

  /**
   * Save configuration to file
   */
  async save(config: AppConfig): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, config, { spaces: 2 });
      this.config = config;
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Get backup configuration
   */
  getBackupConfig(): BackupConfig {
    return this.config.backup;
  }

  /**
   * Update backup configuration
   */
  async updateBackupConfig(backupConfig: Partial<BackupConfig>): Promise<void> {
    this.config.backup = { ...this.config.backup, ...backupConfig };
    await this.save(this.config);
  }
}

// Export singleton
export const configService = new ConfigService();
