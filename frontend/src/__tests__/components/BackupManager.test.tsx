import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupManager } from '../../components/BackupManager';

const mockApi = window.electronAPI;

describe('BackupManager', () => {
  const mockBackups = [
    {
      filename: 'backup-2024-01-15.json',
      timestamp: new Date('2024-01-15T10:00:00Z'),
      path: '/backups/backup-2024-01-15.json',
      size: 1024,
    },
    {
      filename: 'backup-2024-01-14.json',
      timestamp: new Date('2024-01-14T10:00:00Z'),
      path: '/backups/backup-2024-01-14.json',
      size: 2048,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.backups.list = vi.fn().mockResolvedValue({
      success: true,
      data: mockBackups,
    });
    mockApi.config.getBackupConfig = vi.fn().mockResolvedValue({
      success: true,
      data: { maxBackups: 10, maxBackupDays: 7 },
    });
  });

  it('fetches and displays backups on mount', async () => {
    render(<BackupManager />);

    await waitFor(() => {
      expect(screen.getByText('backup-2024-01-15.json')).toBeInTheDocument();
      expect(screen.getByText('backup-2024-01-14.json')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockApi.backups.list = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<BackupManager />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('shows empty state when no backups exist', async () => {
    mockApi.backups.list = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    });

    render(<BackupManager />);

    await waitFor(() => {
      expect(screen.getByText('backups.noBackups')).toBeInTheDocument();
    });
  });

  it('displays backup file sizes correctly', async () => {
    render(<BackupManager />);

    await waitFor(() => {
      expect(screen.getByText('1.0 KB')).toBeInTheDocument();
      expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });
  });

  it('marks most recent backup as latest', async () => {
    render(<BackupManager />);

    await waitFor(() => {
      expect(screen.getByText('common.latest')).toBeInTheDocument();
    });
  });

  describe('Backup configuration', () => {
    it('loads backup configuration on mount', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        const maxBackupsInput = screen.getByDisplayValue('10');
        const maxDaysInput = screen.getByDisplayValue('7');
        expect(maxBackupsInput).toBeInTheDocument();
        expect(maxDaysInput).toBeInTheDocument();
      });
    });

    it('updates backup configuration', async () => {
      mockApi.config.updateBackupConfig = vi.fn().mockResolvedValue({ success: true });

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      });

      const maxBackupsInput = screen.getByDisplayValue('10');
      await userEvent.clear(maxBackupsInput);
      await userEvent.type(maxBackupsInput, '20');

      const saveButton = screen.getByText('common.save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApi.config.updateBackupConfig).toHaveBeenCalledWith(20, 7);
      });
    });

    it('enforces minimum value of 1 for maxBackups', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      });

      const maxBackupsInput = screen.getByDisplayValue('10') as HTMLInputElement;
      await userEvent.clear(maxBackupsInput);
      await userEvent.type(maxBackupsInput, '0');

      // Input should be corrected to minimum of 1
      fireEvent.change(maxBackupsInput, { target: { value: '0' } });
      expect(maxBackupsInput.value).toBe('1');
    });

    it('shows alert when trying to save invalid config', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      });

      const maxBackupsInput = screen.getByDisplayValue('10') as HTMLInputElement;

      // Manually set to invalid value (bypassing input validation)
      Object.defineProperty(maxBackupsInput, 'value', { value: '0', writable: true });

      const saveButton = screen.getByText('common.save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('errors.minBackups');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Backup actions', () => {
    it('opens backup file when open button clicked', async () => {
      mockApi.files.open = vi.fn().mockResolvedValue(undefined);

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('common.open')[0]).toBeInTheDocument();
      });

      const openButton = screen.getAllByText('common.open')[0];
      fireEvent.click(openButton);

      await waitFor(() => {
        expect(mockApi.files.open).toHaveBeenCalledWith('/backups/backup-2024-01-15.json');
      });
    });

    it('restores backup after confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockApi.backups.restore = vi.fn().mockResolvedValue({ success: true });

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('backups.restore')[0]).toBeInTheDocument();
      });

      const restoreButton = screen.getAllByText('backups.restore')[0];
      fireEvent.click(restoreButton);

      expect(confirmSpy).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockApi.backups.restore).toHaveBeenCalledWith('/backups/backup-2024-01-15.json');
        expect(alertSpy).toHaveBeenCalledWith('success.backupRestored');
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('does not restore when confirmation cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      mockApi.backups.restore = vi.fn();

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('backups.restore')[0]).toBeInTheDocument();
      });

      const restoreButton = screen.getAllByText('backups.restore')[0];
      fireEvent.click(restoreButton);

      expect(mockApi.backups.restore).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('shows diff when compare button clicked', async () => {
      mockApi.backups.diff = vi.fn().mockResolvedValue({
        success: true,
        data: {
          diff: [
            { type: 'add', line: 'new line' },
            { type: 'remove', line: 'old line' },
            { type: 'same', line: 'unchanged line' },
          ],
        },
      });

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('backups.compare')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getAllByText('backups.compare')[0];
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('backups.compareTitle')).toBeInTheDocument();
        expect(screen.getByText('new line')).toBeInTheDocument();
        expect(screen.getByText('old line')).toBeInTheDocument();
      });
    });

    it('closes diff modal when close button clicked', async () => {
      mockApi.backups.diff = vi.fn().mockResolvedValue({
        success: true,
        data: { diff: [{ type: 'same', line: 'test' }] },
      });

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('backups.compare')[0]).toBeInTheDocument();
      });

      const compareButton = screen.getAllByText('backups.compare')[0];
      fireEvent.click(compareButton);

      await waitFor(() => {
        expect(screen.getByText('backups.compareTitle')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button');
      const modalCloseButton = closeButtons.find(btn =>
        btn.querySelector('svg') && btn.closest('.modal-header')
      );

      if (modalCloseButton) {
        fireEvent.click(modalCloseButton);

        await waitFor(() => {
          expect(screen.queryByText('backups.compareTitle')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Search and filter', () => {
    it('filters backups by filename', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByText('backup-2024-01-15.json')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('backups.searchPlaceholder');
      await userEvent.type(searchInput, '01-15');

      expect(screen.getByText('backup-2024-01-15.json')).toBeInTheDocument();
      expect(screen.queryByText('backup-2024-01-14.json')).not.toBeInTheDocument();
    });

    it('clears search when clear button clicked', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('backups.searchPlaceholder')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('backups.searchPlaceholder') as HTMLInputElement;
      await userEvent.type(searchInput, 'test');

      const clearButton = screen.getByTitle('backups.clearSearch');
      fireEvent.click(clearButton);

      expect(searchInput.value).toBe('');
    });
  });

  describe('Sorting', () => {
    it('sorts by timestamp descending by default', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        const filenames = screen.getAllByText(/backup-2024/);
        expect(filenames[0].textContent).toContain('01-15');
        expect(filenames[1].textContent).toContain('01-14');
      });
    });

    it('toggles sort direction when clicking column header', async () => {
      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getByText('backups.table.timestamp')).toBeInTheDocument();
      });

      const timestampHeader = screen.getByText('backups.table.timestamp');
      fireEvent.click(timestampHeader);

      await waitFor(() => {
        const filenames = screen.getAllByText(/backup-2024/);
        expect(filenames[0].textContent).toContain('01-14');
        expect(filenames[1].textContent).toContain('01-15');
      });
    });
  });

  describe('Error handling', () => {
    it('shows error alert when loading backups fails', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockApi.backups.list = vi.fn().mockResolvedValue({
        success: false,
        error: 'Load failed',
      });

      render(<BackupManager />);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Load failed');
      });

      alertSpy.mockRestore();
    });

    it('shows error when restore fails', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockApi.backups.restore = vi.fn().mockResolvedValue({
        success: false,
        error: 'Restore failed',
      });

      render(<BackupManager />);

      await waitFor(() => {
        expect(screen.getAllByText('backups.restore')[0]).toBeInTheDocument();
      });

      const restoreButton = screen.getAllByText('backups.restore')[0];
      fireEvent.click(restoreButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Restore failed');
      });

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });
});
