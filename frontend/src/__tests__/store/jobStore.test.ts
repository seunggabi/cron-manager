import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJobStore } from '../../store/jobStore';
import type { CronJob } from '@cron-manager/shared';

// Mock the API module
vi.mock('../../lib/api', () => ({
  jobsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggle: vi.fn(),
    run: vi.fn(),
    sync: vi.fn(),
  },
}));

import { jobsApi } from '../../lib/api';

describe('jobStore', () => {
  const mockJob: CronJob = {
    id: '1',
    name: 'Test Job',
    schedule: '0 * * * *',
    command: '/usr/bin/test.sh',
    enabled: true,
    lastRun: null,
    nextRun: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useJobStore.setState({
      jobs: [],
      loading: false,
      error: null,
      selectedJob: null,
    });
  });

  describe('fetchJobs', () => {
    it('fetches jobs successfully', async () => {
      (jobsApi.getAll as any).mockResolvedValue([mockJob]);

      await useJobStore.getState().fetchJobs();

      expect(useJobStore.getState().jobs).toEqual([mockJob]);
      expect(useJobStore.getState().loading).toBe(false);
      expect(useJobStore.getState().error).toBe(null);
    });

    it('sets loading state while fetching', async () => {
      (jobsApi.getAll as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const promise = useJobStore.getState().fetchJobs();
      expect(useJobStore.getState().loading).toBe(true);

      await promise;
      expect(useJobStore.getState().loading).toBe(false);
    });

    it('handles fetch errors', async () => {
      (jobsApi.getAll as any).mockRejectedValue(new Error('Network error'));

      await useJobStore.getState().fetchJobs();

      expect(useJobStore.getState().error).toBe('Network error');
      expect(useJobStore.getState().loading).toBe(false);
    });
  });

  describe('createJob', () => {
    it('creates a job successfully', async () => {
      const newJobData = {
        name: 'New Job',
        schedule: '0 0 * * *',
        command: '/usr/bin/new.sh',
      };

      (jobsApi.create as any).mockResolvedValue({ ...mockJob, ...newJobData });

      await useJobStore.getState().createJob(newJobData);

      expect(useJobStore.getState().jobs).toHaveLength(1);
      expect(useJobStore.getState().jobs[0].name).toBe('New Job');
    });

    it('handles create errors', async () => {
      (jobsApi.create as any).mockRejectedValue(new Error('Create failed'));

      await expect(
        useJobStore.getState().createJob({})
      ).rejects.toThrow('Create failed');

      expect(useJobStore.getState().error).toBe('Create failed');
    });
  });

  describe('updateJob', () => {
    beforeEach(() => {
      useJobStore.setState({ jobs: [mockJob] });
    });

    it('updates a job successfully', async () => {
      const updates = { name: 'Updated Job' };
      (jobsApi.update as any).mockResolvedValue({ ...mockJob, ...updates });

      await useJobStore.getState().updateJob('1', updates);

      expect(useJobStore.getState().jobs[0].name).toBe('Updated Job');
    });

    it('only updates the target job', async () => {
      const job2 = { ...mockJob, id: '2', name: 'Job 2' };
      useJobStore.setState({ jobs: [mockJob, job2] });

      (jobsApi.update as any).mockResolvedValue({ ...mockJob, name: 'Updated' });

      await useJobStore.getState().updateJob('1', { name: 'Updated' });

      expect(useJobStore.getState().jobs[0].name).toBe('Updated');
      expect(useJobStore.getState().jobs[1].name).toBe('Job 2');
    });

    it('handles update errors', async () => {
      (jobsApi.update as any).mockRejectedValue(new Error('Update failed'));

      await expect(
        useJobStore.getState().updateJob('1', {})
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteJob', () => {
    beforeEach(() => {
      useJobStore.setState({ jobs: [mockJob] });
    });

    it('deletes a job successfully', async () => {
      (jobsApi.delete as any).mockResolvedValue(undefined);

      await useJobStore.getState().deleteJob('1');

      expect(useJobStore.getState().jobs).toHaveLength(0);
    });

    it('only deletes the target job', async () => {
      const job2 = { ...mockJob, id: '2', name: 'Job 2' };
      useJobStore.setState({ jobs: [mockJob, job2] });

      (jobsApi.delete as any).mockResolvedValue(undefined);

      await useJobStore.getState().deleteJob('1');

      expect(useJobStore.getState().jobs).toHaveLength(1);
      expect(useJobStore.getState().jobs[0].id).toBe('2');
    });

    it('handles delete errors', async () => {
      (jobsApi.delete as any).mockRejectedValue(new Error('Delete failed'));

      await expect(
        useJobStore.getState().deleteJob('1')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('toggleJob', () => {
    beforeEach(() => {
      useJobStore.setState({ jobs: [mockJob] });
    });

    it('toggles job enabled state', async () => {
      (jobsApi.toggle as any).mockResolvedValue({ ...mockJob, enabled: false });

      await useJobStore.getState().toggleJob('1');

      expect(useJobStore.getState().jobs[0].enabled).toBe(false);
    });

    it('handles toggle errors', async () => {
      (jobsApi.toggle as any).mockRejectedValue(new Error('Toggle failed'));

      await expect(
        useJobStore.getState().toggleJob('1')
      ).rejects.toThrow('Toggle failed');
    });
  });

  describe('runJob', () => {
    it('runs a job and returns result', async () => {
      const runResult = { success: true, output: 'Job completed' };
      (jobsApi.run as any).mockResolvedValue(runResult);

      const result = await useJobStore.getState().runJob('1');

      expect(result).toEqual(runResult);
      expect(jobsApi.run).toHaveBeenCalledWith('1');
    });

    it('handles run errors', async () => {
      (jobsApi.run as any).mockRejectedValue(new Error('Run failed'));

      await expect(
        useJobStore.getState().runJob('1')
      ).rejects.toThrow('Run failed');
    });
  });

  describe('syncJobs', () => {
    it('syncs jobs successfully', async () => {
      const syncedJobs = [mockJob, { ...mockJob, id: '2' }];
      (jobsApi.sync as any).mockResolvedValue(syncedJobs);

      await useJobStore.getState().syncJobs();

      expect(useJobStore.getState().jobs).toEqual(syncedJobs);
    });

    it('handles sync errors', async () => {
      (jobsApi.sync as any).mockRejectedValue(new Error('Sync failed'));

      await useJobStore.getState().syncJobs();

      expect(useJobStore.getState().error).toBe('Sync failed');
    });
  });

  describe('setSelectedJob', () => {
    it('sets selected job', () => {
      useJobStore.getState().setSelectedJob(mockJob);

      expect(useJobStore.getState().selectedJob).toEqual(mockJob);
    });

    it('clears selected job when null', () => {
      useJobStore.setState({ selectedJob: mockJob });

      useJobStore.getState().setSelectedJob(null);

      expect(useJobStore.getState().selectedJob).toBe(null);
    });
  });

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const initialState = useJobStore.getState();

      expect(initialState.jobs).toEqual([]);
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBe(null);
      expect(initialState.selectedJob).toBe(null);
    });
  });
});
