import { useState, useEffect, useCallback, useRef } from 'react';

interface ColumnWidths {
  [columnName: string]: number;
}

interface UseResizableColumnsResult {
  columnWidths: ColumnWidths;
  getColumnStyle: (columnName: string) => React.CSSProperties;
  handleMouseDown: (columnName: string) => (e: React.MouseEvent) => void;
  ResizeHandle: React.FC<{ columnName: string }>;
}

export function useResizableColumns(
  tableId: string,
  defaultWidths: ColumnWidths
): UseResizableColumnsResult {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const saved = localStorage.getItem(`table-widths-${tableId}`);
      return saved ? { ...defaultWidths, ...JSON.parse(saved) } : defaultWidths;
    } catch {
      return defaultWidths;
    }
  });

  const resizingRef = useRef<{
    columnName: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Save to localStorage whenever widths change
  useEffect(() => {
    try {
      localStorage.setItem(`table-widths-${tableId}`, JSON.stringify(columnWidths));
    } catch (error) {
      console.error('Failed to save column widths:', error);
    }
  }, [columnWidths, tableId]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;

    const { columnName, startX, startWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + delta); // Minimum 80px

    setColumnWidths((prev) => ({
      ...prev,
      [columnName]: newWidth,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    if (resizingRef.current) {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, []);

  useEffect(() => {
    if (resizingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (columnName: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      resizingRef.current = {
        columnName,
        startX: e.clientX,
        startWidth: columnWidths[columnName] || defaultWidths[columnName] || 100,
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnWidths, defaultWidths]
  );

  const getColumnStyle = useCallback(
    (columnName: string): React.CSSProperties => {
      const width = columnWidths[columnName] || defaultWidths[columnName];
      return {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        position: 'relative',
      };
    },
    [columnWidths, defaultWidths]
  );

  const ResizeHandle: React.FC<{ columnName: string }> = ({ columnName }) => (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown(columnName)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // Reset to default width on double-click
        setColumnWidths((prev) => ({
          ...prev,
          [columnName]: defaultWidths[columnName],
        }));
      }}
    />
  );

  return {
    columnWidths,
    getColumnStyle,
    handleMouseDown,
    ResizeHandle,
  };
}
