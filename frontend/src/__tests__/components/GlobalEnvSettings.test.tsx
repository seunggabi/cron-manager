import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalEnvSettings } from '../../components/GlobalEnvSettings';

const mockShowAlert = vi.fn();
vi.mock('../../components/AlertDialog', () => ({
  useAlertDialog: () => ({
    showAlert: mockShowAlert,
    alert: { isOpen: false, type: 'info', message: '' },
    closeAlert: vi.fn(),
  }),
}));

const mockApi = window.electronAPI;

describe('GlobalEnvSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowAlert.mockClear();
  });

  it('fetches and displays environment variables on mount', async () => {
    mockApi.env.getGlobal = vi.fn().mockResolvedValue({
      success: true,
      data: {
        NODE_ENV: 'production',
        PATH: '/usr/local/bin:/usr/bin',
        API_KEY: 'secret123',
      },
    });

    render(<GlobalEnvSettings />);

    await waitFor(() => {
      expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('PATH')).toBeInTheDocument();
      expect(screen.getByText('API_KEY')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockApi.env.getGlobal = vi.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<GlobalEnvSettings />);
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('shows empty state when no variables exist', async () => {
    mockApi.env.getGlobal = vi.fn().mockResolvedValue({
      success: true,
      data: {},
    });

    render(<GlobalEnvSettings />);

    await waitFor(() => {
      expect(screen.getByText('env.noVars')).toBeInTheDocument();
    });
  });

  describe('Add new variable', () => {
    beforeEach(() => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: true,
        data: {},
      });
    });

    it('adds a new environment variable', async () => {
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({ success: true });
      mockApi.env.getGlobal = vi.fn()
        .mockResolvedValueOnce({ success: true, data: {} })
        .mockResolvedValueOnce({
          success: true,
          data: { NEW_VAR: 'test_value' },
        });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.table.keyPlaceholder')).toBeInTheDocument();
      });

      const keyInput = screen.getByPlaceholderText('env.table.keyPlaceholder');
      const valueInput = screen.getByPlaceholderText('env.table.valuePlaceholder');
      const addButton = screen.getByText('common.add');

      await userEvent.type(keyInput, 'NEW_VAR');
      await userEvent.type(valueInput, 'test_value');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockApi.env.updateGlobalVar).toHaveBeenCalledWith('NEW_VAR', 'test_value');
      });
    });

    it('clears input fields after successful add', async () => {
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({ success: true });
      mockApi.env.getGlobal = vi.fn()
        .mockResolvedValueOnce({ success: true, data: {} })
        .mockResolvedValueOnce({ success: true, data: { KEY: 'value' } });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.table.keyPlaceholder')).toBeInTheDocument();
      });

      const keyInput = screen.getByPlaceholderText('env.table.keyPlaceholder');
      const valueInput = screen.getByPlaceholderText('env.table.valuePlaceholder');
      const addButton = screen.getByText('common.add');

      await userEvent.type(keyInput, 'TEST_KEY');
      await userEvent.type(valueInput, 'test_value');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockApi.env.updateGlobalVar).toHaveBeenCalled();
      });

      await waitFor(() => {
        const updatedKeyInput = screen.getByPlaceholderText('env.table.keyPlaceholder') as HTMLInputElement;
        const updatedValueInput = screen.getByPlaceholderText('env.table.valuePlaceholder') as HTMLInputElement;
        expect(updatedKeyInput.value).toBe('');
        expect(updatedValueInput.value).toBe('');
      });
    });

    it('shows alert when key is empty', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.table.keyPlaceholder')).toBeInTheDocument();
      });

      const addButton = screen.getByText('common.add');
      fireEvent.click(addButton);

      expect(mockShowAlert).toHaveBeenCalledWith('errors.enterKey', 'error');
    });

    it('allows adding variable with Enter key', async () => {
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({ success: true });
      mockApi.env.getGlobal = vi.fn()
        .mockResolvedValueOnce({ success: true, data: {} })
        .mockResolvedValueOnce({ success: true, data: { KEY: 'value' } });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.table.valuePlaceholder')).toBeInTheDocument();
      });

      const keyInput = screen.getByPlaceholderText('env.table.keyPlaceholder');
      const valueInput = screen.getByPlaceholderText('env.table.valuePlaceholder');

      await userEvent.type(keyInput, 'TEST');
      await userEvent.type(valueInput, 'value');
      fireEvent.keyDown(valueInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockApi.env.updateGlobalVar).toHaveBeenCalled();
      });
    });
  });

  describe('Edit variable', () => {
    beforeEach(() => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: true,
        data: {
          EXISTING_KEY: 'old_value',
        },
      });
    });

    it('enters edit mode when edit button clicked', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('EXISTING_KEY')).toBeInTheDocument();
      });

      const editButton = screen.getByTitle('common.edit');
      fireEvent.click(editButton);

      // Should show input field with current value
      const editInput = screen.getByDisplayValue('old_value');
      expect(editInput).toBeInTheDocument();
    });

    it('updates variable value', async () => {
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({ success: true });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('EXISTING_KEY')).toBeInTheDocument();
      });

      const editButton = screen.getByTitle('common.edit');
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('old_value');
      await userEvent.clear(editInput);
      await userEvent.type(editInput, 'new_value');

      const saveButton = screen.getByTitle('common.save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockApi.env.updateGlobalVar).toHaveBeenCalledWith('EXISTING_KEY', 'new_value');
      });
    });

    it('saves edit with Enter key', async () => {
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({ success: true });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('EXISTING_KEY')).toBeInTheDocument();
      });

      const editButton = screen.getByTitle('common.edit');
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('old_value');
      await userEvent.clear(editInput);
      await userEvent.type(editInput, 'new_value');
      fireEvent.keyDown(editInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockApi.env.updateGlobalVar).toHaveBeenCalledWith('EXISTING_KEY', 'new_value');
      });
    });

    it('cancels edit with Escape key', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('EXISTING_KEY')).toBeInTheDocument();
      });

      const editButton = screen.getByTitle('common.edit');
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('old_value');
      fireEvent.keyDown(editInput, { key: 'Escape' });

      // Should exit edit mode
      await waitFor(() => {
        expect(screen.queryByDisplayValue('old_value')).not.toBeInTheDocument();
      });
    });

    it('cancels edit when cancel button clicked', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('EXISTING_KEY')).toBeInTheDocument();
      });

      const editButton = screen.getByTitle('common.edit');
      fireEvent.click(editButton);

      const cancelButton = screen.getByTitle('common.cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('old_value')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete variable', () => {
    beforeEach(() => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: true,
        data: {
          TO_DELETE: 'value',
        },
      });
    });

    it('deletes variable after confirmation', async () => {
      mockApi.env.deleteGlobalVar = vi.fn().mockResolvedValue({ success: true });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('TO_DELETE')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('common.delete');
      fireEvent.click(deleteButton);

      // Click the confirm button in the dialog
      await waitFor(() => {
        expect(screen.getByText('common.confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('common.confirm');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.env.deleteGlobalVar).toHaveBeenCalledWith('TO_DELETE');
      });
    });

    it('does not delete when confirmation cancelled', async () => {
      mockApi.env.deleteGlobalVar = vi.fn();

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('TO_DELETE')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTitle('common.delete');
      fireEvent.click(deleteButton);

      // Click the cancel button in the dialog
      await waitFor(() => {
        expect(screen.getByText('common.cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('common.cancel');
      fireEvent.click(cancelButton);

      expect(mockApi.env.deleteGlobalVar).not.toHaveBeenCalled();
    });
  });

  describe('Search functionality', () => {
    beforeEach(() => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: true,
        data: {
          NODE_ENV: 'production',
          DEBUG: 'false',
          API_KEY: 'secret123',
          DATABASE_URL: 'postgres://localhost',
        },
      });
    });

    it('filters variables by key', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('env.searchPlaceholder');
      await userEvent.type(searchInput, 'NODE');

      expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument();
      expect(screen.queryByText('API_KEY')).not.toBeInTheDocument();
    });

    it('filters variables by value', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('production')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('env.searchPlaceholder');
      await userEvent.type(searchInput, 'production');

      expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
      expect(screen.queryByText('DEBUG')).not.toBeInTheDocument();
    });

    it('shows clear button when search has text', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.searchPlaceholder')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('env.searchPlaceholder');
      await userEvent.type(searchInput, 'test');

      expect(screen.getByTitle('env.clearSearch')).toBeInTheDocument();
    });

    it('clears search when clear button clicked', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.searchPlaceholder')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('env.searchPlaceholder') as HTMLInputElement;
      await userEvent.type(searchInput, 'test');

      const clearButton = screen.getByTitle('env.clearSearch');
      fireEvent.click(clearButton);

      expect(searchInput.value).toBe('');
    });
  });

  describe('Sorting functionality', () => {
    beforeEach(() => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: true,
        data: {
          ZEBRA: 'last',
          ALPHA: 'first',
          BETA: 'middle',
        },
      });
    });

    it('shows natural order by default (no sort)', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('ALPHA')).toBeInTheDocument();
      });

      // Natural order: ZEBRA, ALPHA, BETA (insertion order from API)
      const rows = screen.getAllByText(/ALPHA|BETA|ZEBRA/);
      expect(rows[0].textContent).toBe('ZEBRA');
      expect(rows[1].textContent).toBe('ALPHA');
      expect(rows[2].textContent).toBe('BETA');
    });

    it('sorts by key ascending when clicking key column header', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('ALPHA')).toBeInTheDocument();
      });

      const keyHeader = screen.getByText('env.table.key');
      fireEvent.click(keyHeader);

      // Should be ascending
      await waitFor(() => {
        const rows = screen.getAllByText(/ALPHA|BETA|ZEBRA/);
        expect(rows[0].textContent).toBe('ALPHA');
        expect(rows[1].textContent).toBe('BETA');
        expect(rows[2].textContent).toBe('ZEBRA');
      });
    });

    it('sorts by value when value column clicked', async () => {
      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByText('first')).toBeInTheDocument();
      });

      const valueHeader = screen.getByText('env.table.value');
      fireEvent.click(valueHeader);

      await waitFor(() => {
        const values = screen.getAllByText(/first|middle|last/);
        expect(values[0].textContent).toBe('first');
        expect(values[1].textContent).toBe('last');
        expect(values[2].textContent).toBe('middle');
      });
    });
  });

  describe('Error handling', () => {
    it('shows error alert when loading fails', async () => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({
        success: false,
        error: 'Failed to load',
      });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Failed to load', 'error');
      });
    });

    it('shows error when add fails', async () => {
      mockApi.env.getGlobal = vi.fn().mockResolvedValue({ success: true, data: {} });
      mockApi.env.updateGlobalVar = vi.fn().mockResolvedValue({
        success: false,
        error: 'Add failed',
      });

      render(<GlobalEnvSettings />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('env.table.keyPlaceholder')).toBeInTheDocument();
      });

      const keyInput = screen.getByPlaceholderText('env.table.keyPlaceholder');
      const addButton = screen.getByText('common.add');

      await userEvent.type(keyInput, 'TEST');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockShowAlert).toHaveBeenCalledWith('Add failed', 'error');
      });
    });
  });
});
