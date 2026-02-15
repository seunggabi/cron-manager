import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.electronAPI
global.window.electronAPI = {
  jobs: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggle: vi.fn(),
    run: vi.fn(),
    sync: vi.fn(),
  },
  env: {
    getGlobal: vi.fn(),
    updateGlobalVar: vi.fn(),
    deleteGlobalVar: vi.fn(),
  },
  backups: {
    list: vi.fn(),
    restore: vi.fn(),
    diff: vi.fn(),
  },
  config: {
    getBackupConfig: vi.fn(),
    updateBackupConfig: vi.fn(),
  },
  files: {
    open: vi.fn(),
  },
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Simple mock that returns the key with params if provided
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
    i18n: {
      changeLanguage: vi.fn(),
      language: 'en',
    },
  }),
  Trans: ({ children }: any) => children,
}));
