import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizableColumns } from '../../hooks/useResizableColumns';

describe('useResizableColumns', () => {
  const defaultWidths = {
    col1: 100,
    col2: 200,
    col3: 150,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with default widths when no saved data', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    expect(result.current.columnWidths).toEqual(defaultWidths);
  });

  it('loads saved widths from localStorage', () => {
    const savedWidths = { col1: 150, col2: 250, col3: 200 };
    localStorage.setItem('table-widths-test-table', JSON.stringify(savedWidths));

    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    expect(result.current.columnWidths).toEqual(savedWidths);
  });

  it('merges saved widths with default widths', () => {
    const savedWidths = { col1: 150 }; // Only partial data saved
    localStorage.setItem('table-widths-test-table', JSON.stringify(savedWidths));

    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    expect(result.current.columnWidths).toEqual({
      col1: 150,
      col2: 200,
      col3: 150,
    });
  });

  it('falls back to defaults when localStorage data is corrupted', () => {
    localStorage.setItem('table-widths-test-table', 'invalid-json');

    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    expect(result.current.columnWidths).toEqual(defaultWidths);
  });

  it('returns correct column style with width properties', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    const style = result.current.getColumnStyle('col1');

    expect(style).toEqual({
      width: '100px',
      minWidth: '100px',
      maxWidth: '100px',
      position: 'relative',
    });
  });

  it('saves column widths to localStorage when changed', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    // Simulate a resize by calling handleMouseDown and mouse events
    act(() => {
      const mouseDownHandler = result.current.handleMouseDown('col1');
      mouseDownHandler({ clientX: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    // Simulate mouse move
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150 });
      document.dispatchEvent(mouseMoveEvent);
    });

    // Simulate mouse up
    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    const saved = localStorage.getItem('table-widths-test-table');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.col1).toBe(150); // 100 (startWidth) + 50 (delta)
  });

  it('enforces minimum width of 80px during resize', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    act(() => {
      const mouseDownHandler = result.current.handleMouseDown('col1');
      mouseDownHandler({ clientX: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    // Try to resize to less than 80px (delta = -50 from width 100 = 50px)
    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 50 });
      document.dispatchEvent(mouseMoveEvent);
    });

    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.columnWidths.col1).toBe(80); // Should be clamped to minimum
  });

  it('sets cursor style during resize', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    act(() => {
      const mouseDownHandler = result.current.handleMouseDown('col1');
      mouseDownHandler({ clientX: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');

    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('handles resize for different columns independently', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    // Resize col2
    act(() => {
      const mouseDownHandler = result.current.handleMouseDown('col2');
      mouseDownHandler({ clientX: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 180 });
      document.dispatchEvent(mouseMoveEvent);
    });

    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    expect(result.current.columnWidths.col1).toBe(100); // Unchanged
    expect(result.current.columnWidths.col2).toBe(280); // 200 + 80
    expect(result.current.columnWidths.col3).toBe(150); // Unchanged
  });

  it('renders ResizeHandle component', () => {
    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    expect(result.current.ResizeHandle).toBeDefined();
    expect(typeof result.current.ResizeHandle).toBe('function');
  });

  it('uses different localStorage keys for different table IDs', () => {
    const { result: result1 } = renderHook(() =>
      useResizableColumns('table-1', defaultWidths)
    );

    const { result: result2 } = renderHook(() =>
      useResizableColumns('table-2', defaultWidths)
    );

    // Both should start with defaults
    expect(result1.current.columnWidths).toEqual(defaultWidths);
    expect(result2.current.columnWidths).toEqual(defaultWidths);

    // Check they use different keys
    expect(localStorage.getItem('table-widths-table-1')).toBeTruthy();
    expect(localStorage.getItem('table-widths-table-2')).toBeTruthy();
  });

  it('handles localStorage.setItem errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock setItem to throw
    localStorage.setItem = vi.fn(() => {
      throw new Error('Quota exceeded');
    });

    const { result } = renderHook(() =>
      useResizableColumns('test-table', defaultWidths)
    );

    act(() => {
      const mouseDownHandler = result.current.handleMouseDown('col1');
      mouseDownHandler({ clientX: 100, preventDefault: vi.fn(), stopPropagation: vi.fn() } as any);
    });

    act(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 150 });
      document.dispatchEvent(mouseMoveEvent);
    });

    act(() => {
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
