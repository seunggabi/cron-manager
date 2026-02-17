import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobForm } from '../../components/JobForm';
import type { CronJob } from '@cron-manager/shared';

describe('JobForm', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('New Job Mode', () => {
    it('renders create mode when no job provided', () => {
      render(<JobForm {...defaultProps} />);
      expect(screen.getByText('jobs.newCronJob')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<JobForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('jobs.form.envExample')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('* * * * *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('jobs.form.commandPlaceholder')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('jobs.form.namePlaceholder')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('jobs.form.descriptionPlaceholder')).toBeInTheDocument();
    });

    it('submits form with required fields only', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/backup.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'bin/backup.sh',
            schedule: '0 * * * *',
            command: '/usr/bin/backup.sh',
          })
        );
      });
    });

    it('parses environment variables correctly', async () => {
      render(<JobForm {...defaultProps} />);

      const envInput = screen.getByPlaceholderText('jobs.form.envExample');
      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(envInput, 'NODE_ENV=production\nPATH=/usr/bin\nAPI_KEY=secret123');
      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            env: {
              NODE_ENV: 'production',
              PATH: '/usr/bin',
              API_KEY: 'secret123',
            },
          })
        );
      });
    });

    it('handles environment variables with = in value', async () => {
      render(<JobForm {...defaultProps} />);

      const envInput = screen.getByPlaceholderText('jobs.form.envExample');
      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(envInput, 'CONNECTION_STRING=user=admin;password=test123');
      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            env: {
              CONNECTION_STRING: 'user=admin;password=test123',
            },
          })
        );
      });
    });

    it('auto-generates name from command when name is empty', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/local/bin/scripts/backup.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'scripts/backup.sh',
          })
        );
      });
    });

    it('uses provided name instead of auto-generated', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');
      const nameInput = screen.getByPlaceholderText('jobs.form.namePlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/script.sh');
      await userEvent.type(nameInput, 'Custom Job Name');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Custom Job Name',
          })
        );
      });
    });

    it('auto-extracts log file from >> redirection', async () => {
      render(<JobForm {...defaultProps} />);

      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');
      await userEvent.type(commandInput, '/usr/bin/script.sh >> /var/log/output.log');

      await waitFor(() => {
        const logFileInput = screen.getByPlaceholderText('jobs.form.logFileInfo') as HTMLInputElement;
        expect(logFileInput.value).toBe('/var/log/output.log');
      });
    });

    it('renders preset schedule buttons', () => {
      render(<JobForm {...defaultProps} />);

      expect(screen.getByText('jobs.form.presets.everyMinute')).toBeInTheDocument();
      expect(screen.getByText('jobs.form.presets.every5Minutes')).toBeInTheDocument();
      expect(screen.getByText('jobs.form.presets.hourly')).toBeInTheDocument();
      expect(screen.getByText('jobs.form.presets.daily')).toBeInTheDocument();
      expect(screen.getByText('jobs.form.presets.daily9am')).toBeInTheDocument();
      expect(screen.getByText('jobs.form.presets.weekdays9am')).toBeInTheDocument();
    });

    it('applies preset schedule when preset button clicked', async () => {
      render(<JobForm {...defaultProps} />);

      const hourlyPreset = screen.getByText('jobs.form.presets.hourly');
      fireEvent.click(hourlyPreset);

      const scheduleInput = screen.getByPlaceholderText('* * * * *') as HTMLInputElement;
      expect(scheduleInput.value).toBe('0 * * * *');
    });
  });

  describe('Edit Job Mode', () => {
    const existingJob: CronJob = {
      id: '123',
      name: 'Existing Job',
      description: 'Test description',
      schedule: '0 0 * * *',
      command: '/usr/bin/backup.sh',
      logFile: '/var/log/backup.log',
      env: {
        NODE_ENV: 'production',
        DEBUG: 'true',
      },
      enabled: true,
      lastRun: null,
      nextRun: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('renders edit mode title when job provided', () => {
      render(<JobForm {...defaultProps} job={existingJob} />);
      expect(screen.getByText('jobs.editJob')).toBeInTheDocument();
    });

    it('pre-fills form with existing job data', () => {
      render(<JobForm {...defaultProps} job={existingJob} />);

      expect((screen.getByPlaceholderText('* * * * *') as HTMLInputElement).value).toBe('0 0 * * *');
      expect((screen.getByPlaceholderText('jobs.form.commandPlaceholder') as HTMLInputElement).value).toBe('/usr/bin/backup.sh');
      expect((screen.getByPlaceholderText('jobs.form.namePlaceholder') as HTMLInputElement).value).toBe('Existing Job');
      expect((screen.getByPlaceholderText('jobs.form.descriptionPlaceholder') as HTMLTextAreaElement).value).toBe('Test description');
      expect((screen.getByPlaceholderText('jobs.form.logFileInfo') as HTMLInputElement).value).toBe('/var/log/backup.log');
    });

    it('pre-fills environment variables in correct format', () => {
      render(<JobForm {...defaultProps} job={existingJob} />);

      const envInput = screen.getByPlaceholderText('jobs.form.envExample') as HTMLTextAreaElement;
      expect(envInput.value).toBe('NODE_ENV=production\nDEBUG=true');
    });

    it('shows edit submit button text', () => {
      render(<JobForm {...defaultProps} job={existingJob} />);
      expect(screen.getByText('jobs.form.submitEdit')).toBeInTheDocument();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('closes modal on Escape key', () => {
      render(<JobForm {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('submits form on Ctrl+Enter in textarea', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');
      const descriptionInput = screen.getByPlaceholderText('jobs.form.descriptionPlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      fireEvent.keyDown(descriptionInput, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('submits form on Cmd+Enter in input', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      fireEvent.keyDown(commandInput, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Modal behavior', () => {
    it('closes modal when close button clicked', () => {
      render(<JobForm {...defaultProps} />);

      const closeButton = screen.getByLabelText('jobs.form.closeForm');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when cancel button clicked', () => {
      render(<JobForm {...defaultProps} />);

      const cancelButton = screen.getByText('common.cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes modal when overlay clicked', () => {
      render(<JobForm {...defaultProps} />);

      const overlay = screen.getByText('jobs.newCronJob').closest('.modal-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when modal content clicked', () => {
      render(<JobForm {...defaultProps} />);

      const modal = screen.getByText('jobs.newCronJob').closest('.modal');
      fireEvent.click(modal!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Form validation', () => {
    it('marks schedule field as required', () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      expect(scheduleInput).toHaveAttribute('required');
    });

    it('marks command field as required', () => {
      render(<JobForm {...defaultProps} />);

      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');
      expect(commandInput).toHaveAttribute('required');
    });

    it('log file field is read-only', () => {
      render(<JobForm {...defaultProps} />);

      const logFileInput = screen.getByPlaceholderText('jobs.form.logFileInfo');
      expect(logFileInput).toHaveAttribute('readonly');
    });
  });

  describe('Edge cases', () => {
    it('handles empty environment variables', async () => {
      render(<JobForm {...defaultProps} />);

      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.not.objectContaining({
            env: expect.anything(),
          })
        );
      });
    });

    it('ignores empty lines in environment variables', async () => {
      render(<JobForm {...defaultProps} />);

      const envInput = screen.getByPlaceholderText('jobs.form.envExample');
      const scheduleInput = screen.getByPlaceholderText('* * * * *');
      const commandInput = screen.getByPlaceholderText('jobs.form.commandPlaceholder');

      await userEvent.type(envInput, 'NODE_ENV=prod\n\n\nDEBUG=true');
      await userEvent.type(scheduleInput, '0 * * * *');
      await userEvent.type(commandInput, '/usr/bin/test.sh');

      const submitButton = screen.getByText('jobs.form.submit');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            env: {
              NODE_ENV: 'prod',
              DEBUG: 'true',
            },
          })
        );
      });
    });

    it('handles job with null optional fields', () => {
      const minimalJob: CronJob = {
        id: '456',
        name: 'Minimal Job',
        schedule: '* * * * *',
        command: '/bin/echo "test"',
        enabled: true,
        lastRun: null,
        nextRun: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<JobForm {...defaultProps} job={minimalJob} />);

      expect((screen.getByPlaceholderText('jobs.form.descriptionPlaceholder') as HTMLTextAreaElement).value).toBe('');
      expect((screen.getByPlaceholderText('jobs.form.logFileInfo') as HTMLInputElement).value).toBe('');
    });
  });
});
