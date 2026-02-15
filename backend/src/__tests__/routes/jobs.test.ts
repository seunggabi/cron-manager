import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jobsRouter from '../../routes/jobs';
import { crontabService } from '../../services/crontab.service';
import { scheduleService } from '../../services/schedule.service';
import { CronJob } from '../../../../shared/types';

// Mock services
vi.mock('../../services/crontab.service', () => ({
  crontabService: {
    getAllJobs: vi.fn(),
    getJobById: vi.fn(),
    addJob: vi.fn(),
    updateJob: vi.fn(),
    deleteJob: vi.fn(),
    toggleJob: vi.fn(),
  },
}));

vi.mock('../../services/schedule.service', () => ({
  scheduleService: {
    validateSchedule: vi.fn(),
    getNextRuns: vi.fn(),
  },
}));

// Mock child_process for /run endpoint
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('Jobs Router', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/jobs', jobsRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('returns all jobs with next run times', async () => {
      const mockJobs: CronJob[] = [
        {
          id: 'job1',
          name: 'Test Job 1',
          schedule: '0 * * * *',
          command: '/usr/bin/test1.sh',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'job2',
          name: 'Test Job 2',
          schedule: '0 0 * * *',
          command: '/usr/bin/test2.sh',
          enabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockNextRun = new Date(Date.now() + 3600000);

      vi.mocked(crontabService.getAllJobs).mockResolvedValue(mockJobs);
      vi.mocked(scheduleService.getNextRuns).mockReturnValue([mockNextRun]);

      const response = await request(app).get('/api/jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].nextRun).toBeDefined();
      expect(response.body.data[1].nextRun).toBeUndefined(); // Disabled job
    });

    it('handles empty job list', async () => {
      vi.mocked(crontabService.getAllJobs).mockResolvedValue([]);

      const response = await request(app).get('/api/jobs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('handles service errors', async () => {
      vi.mocked(crontabService.getAllJobs).mockRejectedValue(
        new Error('Crontab read error')
      );

      const response = await request(app).get('/api/jobs');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Crontab read error');
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('returns job by ID with next run times', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockNextRuns = [
        new Date(Date.now() + 3600000),
        new Date(Date.now() + 7200000),
      ];

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);
      vi.mocked(scheduleService.getNextRuns).mockReturnValue(mockNextRuns);

      const response = await request(app).get('/api/jobs/job1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('job1');
      expect(response.body.data.nextRun).toBeDefined();
    });

    it('returns 404 for non-existent job', async () => {
      vi.mocked(crontabService.getJobById).mockResolvedValue(null);

      const response = await request(app).get('/api/jobs/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('does not calculate next run for disabled jobs', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Disabled Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      const response = await request(app).get('/api/jobs/job1');

      expect(response.status).toBe(200);
      expect(response.body.data.nextRun).toBeUndefined();
      expect(scheduleService.getNextRuns).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/jobs', () => {
    it('creates new job with valid data', async () => {
      const newJobData = {
        name: 'New Job',
        description: 'Test description',
        schedule: '0 * * * *',
        command: '/usr/bin/new.sh',
        tags: ['test'],
      };

      const createdJob: CronJob = {
        ...newJobData,
        id: 'new-job-id',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(crontabService.addJob).mockResolvedValue(createdJob);

      const response = await request(app).post('/api/jobs').send(newJobData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('new-job-id');
      expect(response.body.message).toBe('Job created successfully');
    });

    it('validates schedule before creating job', async () => {
      const newJobData = {
        name: 'Invalid Job',
        schedule: 'invalid schedule',
        command: '/usr/bin/test.sh',
      };

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: false,
        error: 'Invalid cron expression',
      });

      const response = await request(app).post('/api/jobs').send(newJobData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid schedule');
      expect(crontabService.addJob).not.toHaveBeenCalled();
    });

    it('creates job with all optional fields', async () => {
      const newJobData = {
        name: 'Complex Job',
        description: 'Full featured job',
        schedule: '0 0 * * *',
        command: 'node script.js',
        env: { NODE_ENV: 'production' },
        workingDir: '/app',
        logFile: '/var/log/app.log',
        logStderr: '/var/log/app.err',
        tags: ['production', 'daily'],
      };

      const createdJob: CronJob = {
        ...newJobData,
        id: 'complex-job',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(crontabService.addJob).mockResolvedValue(createdJob);

      const response = await request(app).post('/api/jobs').send(newJobData);

      expect(response.status).toBe(201);
      expect(response.body.data.env).toEqual(newJobData.env);
      expect(response.body.data.workingDir).toBe(newJobData.workingDir);
      expect(response.body.data.tags).toEqual(newJobData.tags);
    });

    it('handles service errors during creation', async () => {
      const newJobData = {
        name: 'Error Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
      };

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(crontabService.addJob).mockRejectedValue(
        new Error('Failed to write crontab')
      );

      const response = await request(app).post('/api/jobs').send(newJobData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to write crontab');
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('updates existing job', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const updatedJob: CronJob = {
        id: 'job1',
        name: 'Updated Name',
        description: 'Updated description',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.updateJob).mockResolvedValue(updatedJob);

      const response = await request(app).put('/api/jobs/job1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.message).toBe('Job updated successfully');
    });

    it('validates schedule when updating', async () => {
      const updateData = {
        schedule: 'invalid schedule',
      };

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: false,
        error: 'Invalid cron expression',
      });

      const response = await request(app).put('/api/jobs/job1').send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid schedule');
      expect(crontabService.updateJob).not.toHaveBeenCalled();
    });

    it('does not validate when schedule not provided', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const updatedJob: CronJob = {
        id: 'job1',
        name: 'Updated Name',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.updateJob).mockResolvedValue(updatedJob);

      const response = await request(app).put('/api/jobs/job1').send(updateData);

      expect(response.status).toBe(200);
      expect(scheduleService.validateSchedule).not.toHaveBeenCalled();
    });

    it('returns 404 for non-existent job', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      vi.mocked(crontabService.updateJob).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/jobs/non-existent')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('updates enabled status', async () => {
      const updateData = {
        enabled: false,
      };

      const updatedJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.updateJob).mockResolvedValue(updatedJob);

      const response = await request(app).put('/api/jobs/job1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('deletes existing job', async () => {
      vi.mocked(crontabService.deleteJob).mockResolvedValue(true);

      const response = await request(app).delete('/api/jobs/job1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Job deleted successfully');
    });

    it('returns 404 for non-existent job', async () => {
      vi.mocked(crontabService.deleteJob).mockResolvedValue(false);

      const response = await request(app).delete('/api/jobs/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('handles service errors', async () => {
      vi.mocked(crontabService.deleteJob).mockRejectedValue(
        new Error('Failed to delete')
      );

      const response = await request(app).delete('/api/jobs/job1');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to delete');
    });
  });

  describe('POST /api/jobs/:id/toggle', () => {
    it('toggles job enabled state', async () => {
      const toggledJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.toggleJob).mockResolvedValue(toggledJob);

      const response = await request(app).post('/api/jobs/job1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.message).toBe('Job disabled successfully');
    });

    it('shows correct message when enabling', async () => {
      const toggledJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: '/usr/bin/test.sh',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.toggleJob).mockResolvedValue(toggledJob);

      const response = await request(app).post('/api/jobs/job1/toggle');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Job enabled successfully');
    });

    it('returns 404 for non-existent job', async () => {
      vi.mocked(crontabService.toggleJob).mockResolvedValue(null);

      const response = await request(app).post('/api/jobs/non-existent/toggle');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });
  });

  describe('POST /api/jobs/:id/run', () => {
    it('executes job command successfully', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'echo "test"',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      // Mock exec
      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, options: any, callback: any) => {
        callback(null, { stdout: 'test\n', stderr: '' });
        return {} as any;
      });

      const response = await request(app).post('/api/jobs/job1/run');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exitCode).toBe(0);
      expect(response.body.data.stdout).toBe('test\n');
      expect(response.body.data.duration).toBeDefined();
      expect(response.body.message).toBe('Job executed successfully');
    });

    it('executes job with environment variables', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'echo $TEST_VAR',
        enabled: true,
        env: { TEST_VAR: 'test_value' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      const { exec } = await import('child_process');
      let executedCommand = '';
      vi.mocked(exec).mockImplementation((cmd: any, options: any, callback: any) => {
        executedCommand = cmd;
        callback(null, { stdout: 'test_value\n', stderr: '' });
        return {} as any;
      });

      const response = await request(app).post('/api/jobs/job1/run');

      expect(response.status).toBe(200);
      expect(executedCommand).toContain('TEST_VAR="test_value"');
    });

    it('executes job with working directory', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'pwd',
        enabled: true,
        workingDir: '/tmp',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      const { exec } = await import('child_process');
      let executedCommand = '';
      vi.mocked(exec).mockImplementation((cmd: any, options: any, callback: any) => {
        executedCommand = cmd;
        callback(null, { stdout: '/tmp\n', stderr: '' });
        return {} as any;
      });

      const response = await request(app).post('/api/jobs/job1/run');

      expect(response.status).toBe(200);
      expect(executedCommand).toContain('cd /tmp');
    });

    it('handles command execution failure', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Test Job',
        schedule: '0 * * * *',
        command: 'false',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, options: any, callback: any) => {
        const error: any = new Error('Command failed');
        error.code = 1;
        error.stdout = '';
        error.stderr = 'command not found';
        callback(error);
        return {} as any;
      });

      const response = await request(app).post('/api/jobs/job1/run');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.data.exitCode).toBe(1);
      expect(response.body.data.stderr).toBeDefined();
      expect(response.body.error).toBe('Job execution failed');
    });

    it('returns 404 for non-existent job', async () => {
      vi.mocked(crontabService.getJobById).mockResolvedValue(null);

      const response = await request(app).post('/api/jobs/non-existent/run');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Job not found');
    });

    it('respects timeout for long-running commands', async () => {
      const mockJob: CronJob = {
        id: 'job1',
        name: 'Long Job',
        schedule: '0 * * * *',
        command: 'sleep 10',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(crontabService.getJobById).mockResolvedValue(mockJob);

      const { exec } = await import('child_process');
      vi.mocked(exec).mockImplementation((cmd: any, options: any, callback: any) => {
        expect(options.timeout).toBe(300000); // 5 minutes
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      await request(app).post('/api/jobs/job1/run');
    });
  });

  describe('POST /api/jobs/sync', () => {
    it('syncs and returns current jobs', async () => {
      const mockJobs: CronJob[] = [
        {
          id: 'job1',
          name: 'Test Job',
          schedule: '0 * * * *',
          command: '/usr/bin/test.sh',
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(crontabService.getAllJobs).mockResolvedValue(mockJobs);

      const response = await request(app).post('/api/jobs/sync');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockJobs);
      expect(response.body.message).toBe('Synced with crontab');
    });

    it('handles sync errors', async () => {
      vi.mocked(crontabService.getAllJobs).mockRejectedValue(
        new Error('Sync failed')
      );

      const response = await request(app).post('/api/jobs/sync');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Sync failed');
    });
  });
});
