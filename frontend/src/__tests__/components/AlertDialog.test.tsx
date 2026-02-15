import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { AlertDialog, useAlertDialog, AlertType } from '../../components/AlertDialog';

describe('AlertDialog', () => {
  const defaultProps = {
    isOpen: true,
    message: 'Test message',
    onClose: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AlertDialog {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when isOpen is true', () => {
    render(<AlertDialog {...defaultProps} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('displays the message content', () => {
    render(<AlertDialog {...defaultProps} message="Custom alert message" />);
    expect(screen.getByText('Custom alert message')).toBeInTheDocument();
  });

  it('displays optional title when provided', () => {
    render(<AlertDialog {...defaultProps} title="Warning!" />);
    expect(screen.getByText('Warning!')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('common.close');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when confirm button is clicked', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    const confirmButton = screen.getByText('common.confirm');
    fireEvent.click(confirmButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    const overlay = screen.getByText('Test message').closest('.modal-overlay');
    fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents close when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    const modalContent = screen.getByText('Test message').closest('.modal');
    fireEvent.click(modalContent!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Enter key is pressed', () => {
    const onClose = vi.fn();
    render(<AlertDialog {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders info icon for info type', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="info" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders success icon for success type', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="success" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders error icon for error type', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="error" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders warning icon for warning type', () => {
    const { container } = render(<AlertDialog {...defaultProps} type="warning" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('defaults to info type when type is not specified', () => {
    const { container } = render(<AlertDialog {...defaultProps} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders Cron Manager logo', () => {
    render(<AlertDialog {...defaultProps} />);
    const logo = screen.getByAltText('Cron Manager');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src');
  });

  it('handles multiline messages with pre-wrap', () => {
    const multilineMessage = 'Line 1\nLine 2\nLine 3';
    render(<AlertDialog {...defaultProps} message={multilineMessage} />);

    expect(screen.getByText(multilineMessage)).toBeInTheDocument();
  });

  it('has scrollable content area for long messages', () => {
    const longMessage = 'A'.repeat(1000);
    render(<AlertDialog {...defaultProps} message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });
});

describe('useAlertDialog', () => {
  it('initializes with closed state', () => {
    const { result } = renderHook(() => useAlertDialog());

    expect(result.current.alert.isOpen).toBe(false);
    expect(result.current.alert.message).toBe('');
  });

  it('showAlert opens the dialog with message', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Test alert');
    });

    expect(result.current.alert.isOpen).toBe(true);
    expect(result.current.alert.message).toBe('Test alert');
  });

  it('showAlert sets the alert type', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Error occurred', 'error');
    });

    expect(result.current.alert.type).toBe('error');
  });

  it('showAlert sets optional title', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Message', 'warning', 'Warning Title');
    });

    expect(result.current.alert.title).toBe('Warning Title');
  });

  it('defaults to info type when type not provided', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Default message');
    });

    expect(result.current.alert.type).toBe('info');
  });

  it('closeAlert closes the dialog', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Test');
    });

    expect(result.current.alert.isOpen).toBe(true);

    act(() => {
      result.current.closeAlert();
    });

    expect(result.current.alert.isOpen).toBe(false);
  });

  it('preserves alert data when closing', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('Test message', 'success', 'Success');
    });

    act(() => {
      result.current.closeAlert();
    });

    expect(result.current.alert.isOpen).toBe(false);
    expect(result.current.alert.message).toBe('Test message');
    expect(result.current.alert.type).toBe('success');
    expect(result.current.alert.title).toBe('Success');
  });

  it('can show multiple alerts in sequence', () => {
    const { result } = renderHook(() => useAlertDialog());

    act(() => {
      result.current.showAlert('First alert', 'info');
    });
    expect(result.current.alert.message).toBe('First alert');

    act(() => {
      result.current.closeAlert();
    });

    act(() => {
      result.current.showAlert('Second alert', 'error');
    });
    expect(result.current.alert.message).toBe('Second alert');
    expect(result.current.alert.type).toBe('error');
  });
});
