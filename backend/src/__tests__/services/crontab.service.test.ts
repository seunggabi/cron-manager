import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrontabService } from '../../services/crontab.service';
import { CronJob } from '../../../../shared/types';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Mock child_process exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    mkdtemp: vi.fn().mockResolvedValue('/tmp/crontab-mock123'),
  },
  writeFile: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  mkdtemp: vi.fn().mockResolvedValue('/tmp/crontab-mock123'),
}));

// Mock os
vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    tmpdir: vi.fn().mockReturnValue('/tmp'),
  };
});

// Mock path
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

describe('CrontabService', () => {
  let service: CrontabService;
  let mockExec: any;

  beforeEach(() => {
    service = new CrontabService();
    mockExec = vi.mocked(exec);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPermission', () => {
    it('returns hasPermission true when write succeeds', async () => {
      const mockCrontab = '0 * * * * /usr/bin/test.sh';
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        callback(null, { stdout: mockCrontab, stderr: '' });
      });

      const result = await service.checkPermission();

      expect(result.hasPermission).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns hasPermission true when no crontab exists', async () => {
      let callCount = 0;
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // First call: readCrontab returns empty
          const error: any = new Error('no crontab for user');
          error.message = 'no crontab for user';
          callback(error);
        } else {
          // Second call: writeCrontab succeeds
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const result = await service.checkPermission();

      expect(result.hasPermission).toBe(true);
    });

    it('returns hasPermission false when write fails with permission denied', async () => {
      let callCount = 0;
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // First call: readCrontab succeeds
          callback(null, { stdout: '', stderr: '' });
        } else {
          // Second call: writeCrontab fails with permission error
          const error: any = new Error('Permission denied');
          error.message = 'Permission denied';
          callback(error);
        }
      });

      const result = await service.checkPermission();

      expect(result.hasPermission).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('readCrontab', () => {
    it('returns crontab content when crontab exists', async () => {
      const mockCrontab = '0 * * * * /usr/bin/test.sh';
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        callback(null, { stdout: mockCrontab, stderr: '' });
      });

      const result = await service.readCrontab();

      expect(result).toBe(mockCrontab);
      expect(mockExec).toHaveBeenCalledWith('crontab -l', expect.any(Function));
    });

    it('returns empty string when no crontab exists', async () => {
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        const error: any = new Error('no crontab for user');
        error.message = 'no crontab for user';
        callback(error);
      });

      const result = await service.readCrontab();

      expect(result).toBe('');
    });

    it('throws error for other crontab errors', async () => {
      mockExec.mockImplementation((_cmd: any, callback: any) => {
        callback(new Error('Permission denied'));
      });

      await expect(service.readCrontab()).rejects.toThrow('Permission denied');
    });
  });

  describe('parseCrontab', () => {
    it('parses empty crontab', () => {
      const result = service.parseCrontab('');
      expect(result).toEqual([]);
    });

    it('parses simple cron job', () => {
      const crontab = '0 * * * * /usr/bin/test.sh';
      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
      });
      expect(result[0].id).toBeDefined();
      expect(result[0].name).toBe('/usr/bin/test.sh');
    });

    it('parses disabled cron job (commented)', () => {
      const crontab = '#0 * * * * /usr/bin/test.sh';
      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].enabled).toBe(false);
      expect(result[0].command).toBe('/usr/bin/test.sh');
    });

    it('parses cron job with metadata', () => {
      const crontab = `# CRON-MANAGER:ID:test-123
# CRON-MANAGER:NAME:Test Job
# CRON-MANAGER:DESC:This is a test
# CRON-MANAGER:TAGS:backup,daily
0 0 * * * /usr/bin/backup.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'test-123',
        name: 'Test Job',
        description: 'This is a test',
        tags: ['backup', 'daily'],
        schedule: '0 0 * * *',
        command: '/usr/bin/backup.sh',
        enabled: true,
      });
    });

    it('parses cron job with environment variables', () => {
      const crontab = `# CRON-MANAGER:ID:test-456
# CRON-MANAGER:NAME:Test Job
# CRON-MANAGER:ENV:{"NODE_ENV":"production","API_KEY":"secret"}
0 * * * * node /app/script.js`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].env).toEqual({
        NODE_ENV: 'production',
        API_KEY: 'secret',
      });
    });

    it('parses cron job with working directory', () => {
      const crontab = `# CRON-MANAGER:ID:test-789
# CRON-MANAGER:WORKDIR:/home/user/project
0 * * * * npm run build`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].workingDir).toBe('/home/user/project');
    });

    it('parses cron job with log files', () => {
      const crontab = `# CRON-MANAGER:ID:test-log
# CRON-MANAGER:LOG:/var/log/job.log
# CRON-MANAGER:LOGERR:/var/log/job.err
0 * * * * /usr/bin/task.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].logFile).toBe('/var/log/job.log');
      expect(result[0].logStderr).toBe('/var/log/job.err');
    });

    it('parses multiple cron jobs', () => {
      const crontab = `# CRON-MANAGER:ID:job1
# CRON-MANAGER:NAME:Job 1
0 * * * * /usr/bin/job1.sh

# CRON-MANAGER:ID:job2
# CRON-MANAGER:NAME:Job 2
#30 * * * * /usr/bin/job2.sh

# CRON-MANAGER:ID:job3
0 0 * * * /usr/bin/job3.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('job1');
      expect(result[0].enabled).toBe(true);
      expect(result[1].id).toBe('job2');
      expect(result[1].enabled).toBe(false);
      expect(result[2].id).toBe('job3');
    });

    it('handles invalid JSON in ENV metadata', () => {
      const crontab = `# CRON-MANAGER:ID:test-invalid
# CRON-MANAGER:ENV:{invalid json}
0 * * * * /usr/bin/test.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].env).toBeUndefined();
    });

    it('handles complex cron expressions', () => {
      const crontab = '*/15 2-4 1-15 * 1-5 /usr/bin/complex.sh';
      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].schedule).toBe('*/15 2-4 1-15 * 1-5');
    });

    it('handles commands with spaces', () => {
      const crontab = '0 * * * * /usr/bin/script.sh --arg1 value1 --arg2 "value with spaces"';
      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('/usr/bin/script.sh --arg1 value1 --arg2 "value with spaces"');
    });

    it('skips empty lines and preserves metadata reset', () => {
      const crontab = `# CRON-MANAGER:ID:job1
0 * * * * /usr/bin/job1.sh

# Regular comment (not metadata)
0 0 * * * /usr/bin/job2.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('job1');
      expect(result[1].id).not.toBe('job1'); // Should have new ID
    });

    it('ignores non-CRON-MANAGER comments', () => {
      const crontab = `# This is a regular comment
# Another comment
0 * * * * /usr/bin/test.sh`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBeUndefined();
    });

    it('handles malformed cron lines gracefully', () => {
      const crontab = `invalid line without cron format
0 * * * * /usr/bin/valid.sh
another invalid line`;

      const result = service.parseCrontab(crontab);

      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('/usr/bin/valid.sh');
    });
  });

  describe('serializeCrontab', () => {
    it('serializes empty job list', () => {
      const result = service.serializeCrontab([]);
      expect(result).toBe('');
    });

    it('serializes simple job', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:ID:test-123');
      expect(result).toContain('# CRON-MANAGER:NAME:Test Job');
      expect(result).toContain('0 * * * * /usr/bin/test.sh');
      expect(result).not.toContain('#0 * * * *'); // Should not be commented
    });

    it('serializes disabled job as commented', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('#0 * * * * /usr/bin/test.sh');
    });

    it('serializes job with description', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        description: 'This is a test description',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:DESC:This is a test description');
    });

    it('serializes job with environment variables', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'node script.js',
        enabled: true,
        env: {
          NODE_ENV: 'production',
          API_KEY: 'secret123',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:ENV:{"NODE_ENV":"production","API_KEY":"secret123"}');
      expect(result).toContain("NODE_ENV='production' API_KEY='secret123' node script.js");
    });

    it('serializes job with working directory', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'npm run build',
        enabled: true,
        workingDir: '/home/user/project',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:WORKDIR:/home/user/project');
      expect(result).toContain("cd '/home/user/project' && npm run build");
    });

    it('serializes job with log files', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/task.sh',
        enabled: true,
        logFile: '/var/log/job.log',
        logStderr: '/var/log/job.err',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:LOG:/var/log/job.log');
      expect(result).toContain('# CRON-MANAGER:LOGERR:/var/log/job.err');
      expect(result).toContain("/usr/bin/task.sh >> '/var/log/job.log' 2>> '/var/log/job.err'");
    });

    it('serializes job with log file but no stderr log', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/task.sh',
        enabled: true,
        logFile: '/var/log/job.log',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain("/usr/bin/task.sh >> '/var/log/job.log' 2>&1");
    });

    it('serializes job with tags', () => {
      const job: CronJob = {
        id: 'test-123',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        tags: ['backup', 'daily', 'production'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:TAGS:backup,daily,production');
    });

    it('serializes job with all features combined', () => {
      const job: CronJob = {
        id: 'complex-job',
        name: 'Complex Job',
        description: 'A complex test job',
        schedule: '*/15 * * * *',
        command: 'node script.js',
        enabled: true,
        env: { NODE_ENV: 'test' },
        workingDir: '/app',
        logFile: '/var/log/app.log',
        logStderr: '/var/log/app.err',
        tags: ['test', 'automated'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.serializeCrontab([job]);

      expect(result).toContain('# CRON-MANAGER:ID:complex-job');
      expect(result).toContain('# CRON-MANAGER:NAME:Complex Job');
      expect(result).toContain('# CRON-MANAGER:DESC:A complex test job');
      expect(result).toContain('# CRON-MANAGER:ENV:{"NODE_ENV":"test"}');
      expect(result).toContain('# CRON-MANAGER:WORKDIR:/app');
      expect(result).toContain('# CRON-MANAGER:LOG:/var/log/app.log');
      expect(result).toContain('# CRON-MANAGER:LOGERR:/var/log/app.err');
      expect(result).toContain('# CRON-MANAGER:TAGS:test,automated');
      expect(result).toContain("*/15 * * * * NODE_ENV='test' cd '/app' && node script.js >> '/var/log/app.log' 2>> '/var/log/app.err'");
    });

    it('serializes multiple jobs with proper spacing', () => {
      const jobs: CronJob[] = [
        {
          id: 'job1',
          name: 'Job 1',
          schedule: '0 * * * *',
          command: '/usr/bin/job1.sh',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'job2',
          name: 'Job 2',
          schedule: '30 * * * *',
          command: '/usr/bin/job2.sh',
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.serializeCrontab(jobs);

      expect(result).toContain('# CRON-MANAGER:ID:job1');
      expect(result).toContain('# CRON-MANAGER:ID:job2');
      expect(result).toContain('0 * * * * /usr/bin/job1.sh');
      expect(result).toContain('#30 * * * * /usr/bin/job2.sh');
    });
  });

  describe('roundtrip serialization', () => {
    it('preserves job data through parse and serialize cycle', () => {
      const original: CronJob = {
        id: 'roundtrip-test',
        name: 'Roundtrip Test',
        description: 'Testing roundtrip',
        schedule: '0 0 * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        env: { TEST: 'value' },
        workingDir: '/tmp',
        logFile: '/var/log/test.log',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const serialized = service.serializeCrontab([original]);
      const parsed = service.parseCrontab(serialized);

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        id: original.id,
        name: original.name,
        description: original.description,
        schedule: original.schedule,
        enabled: original.enabled,
        env: original.env,
        workingDir: original.workingDir,
        logFile: original.logFile,
        tags: original.tags,
      });
    });
  });

  describe('integration methods', () => {
    beforeEach(() => {
      // Mock successful crontab read
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd === 'crontab -l') {
          callback(null, { stdout: '', stderr: '' });
        } else if (cmd.startsWith('crontab /tmp/')) {
          callback(null, { stdout: '', stderr: '' });
        }
      });
    });

    describe('getAllJobs', () => {
      it('returns parsed jobs from crontab', async () => {
        const mockCrontab = `# CRON-MANAGER:ID:test-1
# CRON-MANAGER:NAME:Test Job
0 * * * * /usr/bin/test.sh`;

        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: mockCrontab, stderr: '' });
        });

        const jobs = await service.getAllJobs();

        expect(jobs).toHaveLength(1);
        expect(jobs[0].id).toBe('test-1');
      });
    });

    describe('getJobById', () => {
      it('returns job when found', async () => {
        const mockCrontab = `# CRON-MANAGER:ID:test-1
0 * * * * /usr/bin/test.sh`;

        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: mockCrontab, stderr: '' });
        });

        const job = await service.getJobById('test-1');

        expect(job).toBeDefined();
        expect(job?.id).toBe('test-1');
      });

      it('returns null when job not found', async () => {
        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
        });

        const job = await service.getJobById('non-existent');

        expect(job).toBeNull();
      });
    });

    describe('addJob', () => {
      it('adds new job to crontab', async () => {
        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
        });

        const newJob = await service.addJob({
          name: 'New Job',
          schedule: '0 * * * *',
          command: '/usr/bin/new.sh',
          enabled: true,
        });

        expect(newJob.id).toBeDefined();
        expect(newJob.name).toBe('New Job');
        expect(newJob.createdAt).toBeDefined();
        expect(newJob.updatedAt).toBeDefined();
      });
    });

    describe('updateJob', () => {
      it('updates existing job', async () => {
        const mockCrontab = `# CRON-MANAGER:ID:test-1
# CRON-MANAGER:NAME:Old Name
0 * * * * /usr/bin/test.sh`;

        let writeCalled = false;
        mockExec.mockImplementation((cmd: any, callback: any) => {
          if (!writeCalled) {
            callback(null, { stdout: mockCrontab, stderr: '' });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
          if (cmd.startsWith('crontab /tmp/')) {
            writeCalled = true;
          }
        });

        const updated = await service.updateJob('test-1', { name: 'New Name' });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe('New Name');
        expect(updated?.id).toBe('test-1');
      });

      it('returns null when job not found', async () => {
        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
        });

        const updated = await service.updateJob('non-existent', { name: 'Test' });

        expect(updated).toBeNull();
      });
    });

    describe('deleteJob', () => {
      it('deletes existing job', async () => {
        const mockCrontab = `# CRON-MANAGER:ID:test-1
0 * * * * /usr/bin/test.sh`;

        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: mockCrontab, stderr: '' });
        });

        const deleted = await service.deleteJob('test-1');

        expect(deleted).toBe(true);
      });

      it('returns false when job not found', async () => {
        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
        });

        const deleted = await service.deleteJob('non-existent');

        expect(deleted).toBe(false);
      });
    });

    describe('toggleJob', () => {
      it('toggles job enabled state', async () => {
        const mockCrontab = `# CRON-MANAGER:ID:test-1
# CRON-MANAGER:NAME:Test Job
0 * * * * /usr/bin/test.sh`;

        let readCount = 0;
        mockExec.mockImplementation((cmd: any, callback: any) => {
          if (cmd === 'crontab -l') {
            readCount++;
            callback(null, { stdout: mockCrontab, stderr: '' });
          } else {
            callback(null, { stdout: '', stderr: '' });
          }
        });

        const toggled = await service.toggleJob('test-1');

        expect(toggled).toBeDefined();
        expect(toggled?.enabled).toBe(false); // Was true, now false
      });

      it('returns null when job not found', async () => {
        mockExec.mockImplementation((cmd: any, callback: any) => {
          callback(null, { stdout: '', stderr: '' });
        });

        const toggled = await service.toggleJob('non-existent');

        expect(toggled).toBeNull();
      });
    });
  });
});
