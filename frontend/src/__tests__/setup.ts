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
    reorder: vi.fn(),
    checkPermission: vi.fn().mockResolvedValue({ success: true, data: { hasPermission: true } }),
    testIn1Minute: vi.fn(),
  },
  schedule: {
    parse: vi.fn(),
    getPresets: vi.fn(),
  },
  env: {
    getGlobal: vi.fn(),
    setGlobal: vi.fn(),
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
  logs: {
    open: vi.fn(),
    checkDir: vi.fn(),
    createDir: vi.fn(),
    create: vi.fn(),
  },
  files: {
    open: vi.fn(),
  },
};

// Mock localStorage with actual in-memory implementation
class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock() as any;

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
