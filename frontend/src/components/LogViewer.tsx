import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const api = window.electronAPI;

interface LogViewerProps {
  logPath: string;
  workingDir?: string;
  onClose: () => void;
  fullScreen?: boolean;
}

export function LogViewer({ logPath, workingDir, onClose, fullScreen }: LogViewerProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines([]);
    setError(null);

    const offData = api.logs.onData((chunk: string) => {
      const newLines = chunk.split('\n').filter((l: string) => l !== '');
      setLines((prev) => [...prev, ...newLines]);
    });

    const offError = api.logs.onError((err: string) => {
      setError(err);
    });

    const offClose = api.logs.onClose(() => {
      setError('Stream closed.');
    });

    api.logs.startStream(logPath, workingDir).then((res: any) => {
      if (res && !res.success) {
        setError(res.error || 'Failed to start log stream');
      }
    }).catch((err: any) => {
      setError(err?.message || 'Failed to start log stream');
    });

    return () => {
      api.logs.stopStream();
      offData();
      offError();
      offClose();
    };
  }, [logPath, workingDir]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        flexShrink: 0,
      }}
    >
      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#8b949e' }}>
        tail -f <span style={{ color: '#e6edf3' }}>{logPath}</span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8b949e', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Auto-scroll
        </label>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '2px', display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  const logContent = (
    <div
      ref={contentRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6',
        color: '#e6edf3',
      }}
    >
      {lines.length === 0 && !error && (
        <span style={{ color: '#8b949e' }}>Waiting for log output…</span>
      )}
      {lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {line}
        </div>
      ))}
      {error && (
        <div style={{ color: '#f85149', marginTop: '8px' }}>{error}</div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  // Full-screen mode: fill the entire OS window (used in detached log windows)
  if (fullScreen) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#0d1117',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {header}
        {logContent}
      </div>
    );
  }

  // Modal overlay mode (inline in App)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#0d1117',
          borderRadius: '8px',
          width: '80vw',
          height: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {header}
        {logContent}
      </div>
    </div>
  );
}
