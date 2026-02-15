import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NextRunCell } from '../../components/NextRunCell';

describe('NextRunCell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders "-" when nextRun is null', () => {
    render(<NextRunCell nextRun={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders full date format when time is more than 5 minutes away', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    render(<NextRunCell nextRun={futureDate.toISOString()} />);

    // Should show full date format, not countdown
    const displayedText = screen.getByText(/\d{4}-\d{2}-\d{2}/);
    expect(displayedText).toBeInTheDocument();
  });

  it('renders full date format when time has passed', () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    render(<NextRunCell nextRun={pastDate.toISOString()} />);

    const displayedText = screen.getByText(/\d{4}-\d{2}-\d{2}/);
    expect(displayedText).toBeInTheDocument();
  });

  it('renders countdown in mm:ss format when less than 5 minutes away', () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    render(<NextRunCell nextRun={futureDate.toISOString()} />);

    // Should show countdown format
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('shows orange color when 2-5 minutes remaining', () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    const { container } = render(<NextRunCell nextRun={futureDate.toISOString()} />);

    const element = container.querySelector('.next-run');
    expect(element).toHaveStyle({ color: '#f59e0b' });
  });

  it('shows red color when 1-2 minutes remaining', () => {
    const futureDate = new Date(Date.now() + 90 * 1000); // 1.5 minutes
    const { container } = render(<NextRunCell nextRun={futureDate.toISOString()} />);

    const element = container.querySelector('.next-run');
    expect(element).toHaveStyle({ color: '#ef4444' });
  });

  it('shows red with pulse class when less than 1 minute remaining', () => {
    const futureDate = new Date(Date.now() + 30 * 1000); // 30 seconds
    const { container } = render(<NextRunCell nextRun={futureDate.toISOString()} />);

    const element = container.querySelector('.next-run');
    expect(element).toHaveClass('urgent-pulse');
    expect(element).toHaveStyle({ color: '#ef4444' });
  });

  it('updates countdown every second', async () => {
    const futureDate = new Date(Date.now() + 65 * 1000); // 1:05 remaining
    render(<NextRunCell nextRun={futureDate.toISOString()} />);

    // Initial state: 01:05
    expect(screen.getByText('01:05')).toBeInTheDocument();

    // Advance 1 second
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText('01:04')).toBeInTheDocument();
    });
  });

  it('formats countdown with leading zeros', () => {
    const futureDate = new Date(Date.now() + 125 * 1000); // 2:05
    render(<NextRunCell nextRun={futureDate.toISOString()} />);

    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('handles countdown reaching zero gracefully', async () => {
    const futureDate = new Date(Date.now() + 2000); // 2 seconds
    render(<NextRunCell nextRun={futureDate.toISOString()} />);

    expect(screen.getByText('00:02')).toBeInTheDocument();

    // Advance past the target time
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      // Should switch to date format when time passes
      const element = screen.getByText(/\d{4}-\d{2}-\d{2}/);
      expect(element).toBeInTheDocument();
    });
  });

  it('cleans up interval on unmount', () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 1000);
    const { unmount } = render(<NextRunCell nextRun={futureDate.toISOString()} />);

    const intervalCount = vi.getTimerCount();
    unmount();

    // Interval should be cleared
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resets when nextRun changes from null to a date', () => {
    const { rerender } = render(<NextRunCell nextRun={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();

    const futureDate = new Date(Date.now() + 3 * 60 * 1000);
    rerender(<NextRunCell nextRun={futureDate.toISOString()} />);

    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('updates when nextRun prop changes', () => {
    const date1 = new Date(Date.now() + 2 * 60 * 1000);
    const { rerender } = render(<NextRunCell nextRun={date1.toISOString()} />);

    const initialText = screen.getByText(/\d{2}:\d{2}/).textContent;

    const date2 = new Date(Date.now() + 4 * 60 * 1000);
    rerender(<NextRunCell nextRun={date2.toISOString()} />);

    const updatedText = screen.getByText(/\d{2}:\d{2}/).textContent;
    expect(updatedText).not.toBe(initialText);
  });
});
