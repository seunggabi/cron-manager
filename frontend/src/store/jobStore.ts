import { create } from 'zustand';
import type { CronJob } from '@cron-manager/shared';
import { jobsApi } from '../lib/api';

interface JobStore {
  jobs: CronJob[];
  loading: boolean;
  error: string | null;
  selectedJob: CronJob | null;

  fetchJobs: () => Promise<void>;
  createJob: (job: any) => Promise<void>;
  updateJob: (id: string, updates: any) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  toggleJob: (id: string) => Promise<void>;
  runJob: (id: string) => Promise<any>;
  syncJobs: () => Promise<void>;
  setSelectedJob: (job: CronJob | null) => void;
}

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  loading: false,
  error: null,
  selectedJob: null,

  fetchJobs: async () => {
    set({ loading: true, error: null });
    try {
      const jobs = await jobsApi.getAll();
      set({ jobs, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createJob: async (jobData) => {
    set({ loading: true, error: null });
    try {
      const newJob = await jobsApi.create(jobData);
      set((state) => ({
        jobs: [...state.jobs, newJob],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateJob: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedJob = await jobsApi.update(id, updates);
      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteJob: async (id) => {
    set({ loading: true, error: null });
    try {
      await jobsApi.delete(id);
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  toggleJob: async (id) => {
    try {
      const updatedJob = await jobsApi.toggle(id);
      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === id ? updatedJob : job)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  runJob: async (id) => {
    try {
      const result = await jobsApi.run(id);
      return result;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  syncJobs: async () => {
    set({ loading: true, error: null });
    try {
      const jobs = await jobsApi.sync();
      set({ jobs, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setSelectedJob: (job) => {
    set({ selectedJob: job });
  },
}));
