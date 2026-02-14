import { Router } from 'express';
import { crontabService } from '../services/crontab.service';
import { scheduleService } from '../services/schedule.service';
import { CreateJobRequest, UpdateJobRequest, ApiResponse } from '@cron-manager/shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// GET /api/jobs - Get all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await crontabService.getAllJobs();

    // Calculate next run for each job
    for (const job of jobs) {
      if (job.enabled) {
        const nextRuns = scheduleService.getNextRuns(job.schedule, 1);
        job.nextRun = nextRuns[0];
      }
    }

    res.json({
      success: true,
      data: jobs,
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// GET /api/jobs/:id - Get job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await crontabService.getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      } as ApiResponse);
    }

    // Calculate next runs
    if (job.enabled) {
      const nextRuns = scheduleService.getNextRuns(job.schedule, 5);
      job.nextRun = nextRuns[0];
    }

    res.json({
      success: true,
      data: job,
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// POST /api/jobs - Create new job
router.post('/', async (req, res) => {
  try {
    const data: CreateJobRequest = req.body;

    // Validate schedule
    const validation = scheduleService.validateSchedule(data.schedule);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid schedule: ${validation.error}`,
      } as ApiResponse);
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

    res.status(201).json({
      success: true,
      data: job,
      message: 'Job created successfully',
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', async (req, res) => {
  try {
    const data: UpdateJobRequest = req.body;

    // Validate schedule if provided
    if (data.schedule) {
      const validation = scheduleService.validateSchedule(data.schedule);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: `Invalid schedule: ${validation.error}`,
        } as ApiResponse);
      }
    }

    const job = await crontabService.updateJob(req.params.id, data);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: job,
      message: 'Job updated successfully',
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await crontabService.deleteJob(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Job deleted successfully',
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// POST /api/jobs/:id/toggle - Toggle job enabled/disabled
router.post('/:id/toggle', async (req, res) => {
  try {
    const job = await crontabService.toggleJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: job,
      message: `Job ${job.enabled ? 'enabled' : 'disabled'} successfully`,
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// POST /api/jobs/:id/run - Run job immediately (test mode)
router.post('/:id/run', async (req, res) => {
  try {
    const job = await crontabService.getJobById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      } as ApiResponse);
    }

    // Build command with environment variables
    let command = job.command;

    if (job.workingDir) {
      command = `cd ${job.workingDir} && ${command}`;
    }

    if (job.env && Object.keys(job.env).length > 0) {
      const envVars = Object.entries(job.env)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      command = `${envVars} ${command}`;
    }

    // Execute command
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes timeout
      });

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: {
          exitCode: 0,
          stdout,
          stderr,
          duration,
        },
        message: 'Job executed successfully',
      } as ApiResponse);
    } catch (execError: any) {
      const duration = Date.now() - startTime;

      res.json({
        success: false,
        data: {
          exitCode: execError.code || 1,
          stdout: execError.stdout || '',
          stderr: execError.stderr || execError.message,
          duration,
        },
        error: 'Job execution failed',
      } as ApiResponse);
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// POST /api/jobs/sync - Sync with current crontab
router.post('/sync', async (req, res) => {
  try {
    const jobs = await crontabService.getAllJobs();

    res.json({
      success: true,
      data: jobs,
      message: 'Synced with crontab',
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

export default router;
