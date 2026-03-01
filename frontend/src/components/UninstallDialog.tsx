import { useState } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import logoSvg from '/logo.svg';

interface UninstallDialogProps {
  onClose: () => void;
}

export function UninstallDialog({ onClose }: UninstallDialogProps) {
  const [removeCrontabJobs, setRemoveCrontabJobs] = useState(false);
  const [step, setStep] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [log, setLog] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleUninstall = async () => {
    setStep('running');
    setLog([]);

    try {
      // Step 1: cleanup data via IPC
      const result = await window.electronAPI.uninstall.cleanupData({ removeCrontabJobs });
      if (result.success && result.data) {
        setLog(result.data);
      }

      // Step 2: launch uninstall.bat
      await window.electronAPI.uninstall.runScript();

      setStep('done');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Uninstall failed.');
      setStep('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={step === 'confirm' ? onClose : undefined}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <button onClick={onClose} className="modal-close" aria-label="Close" disabled={step === 'running'}>
            <X />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '8px 40px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logoSvg} alt="Cron Manager" style={{ width: 28, height: 28 }} />
            <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              Cron Manager
            </span>
          </div>

          {/* Icon */}
          <div style={{ color: '#ef4444' }}>
            <Trash2 size={44} />
          </div>

          {step === 'confirm' && (
            <>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: 'var(--text-primary)' }}>
                Uninstall Cron Manager?
              </h3>

              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, width: '100%' }}>
                <p style={{ margin: '0 0 10px' }}>The following will be permanently removed:</p>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><code style={{ fontSize: 12 }}>%USERPROFILE%\.cron-manager</code> (backups, config, locks)</li>
                  <li><code style={{ fontSize: 12 }}>WSL: ~/.cron-manager</code></li>
                  <li>Electron app cache &amp; data</li>
                  <li>Cron Manager application files</li>
                </ul>
              </div>

              {/* Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                <input
                  type="checkbox"
                  checked={removeCrontabJobs}
                  onChange={(e) => setRemoveCrontabJobs(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
                Also remove all crontab jobs managed by Cron Manager
              </label>

              {/* Warning */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: '#ef4444',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                This action cannot be undone.
              </div>
            </>
          )}

          {step === 'running' && (
            <>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                Removing...
              </h3>
              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  minHeight: 80,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {log.length === 0 ? (
                  <span>Cleaning up data...</span>
                ) : (
                  log.map((line, i) => <span key={i}>✓ {line}</span>)
                )}
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                Uninstall started
              </h3>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.7 }}>
                App data has been removed.<br />
                The uninstaller window should appear shortly.
              </div>
              {log.length > 0 && (
                <div
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {log.map((line, i) => <span key={i}>✓ {line}</span>)}
                </div>
              )}
            </>
          )}

          {step === 'error' && (
            <>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#ef4444' }}>
                Uninstall failed
              </h3>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
                {errorMessage}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'center', gap: 10 }}>
          {step === 'confirm' && (
            <>
              <button onClick={onClose} className="btn" style={{ minWidth: 100 }}>
                Cancel
              </button>
              <button
                onClick={handleUninstall}
                className="btn btn-danger"
                style={{ minWidth: 120, background: '#ef4444', color: '#fff', border: 'none' }}
              >
                Uninstall
              </button>
            </>
          )}
          {(step === 'done' || step === 'error') && (
            <button onClick={onClose} className="btn btn-primary" style={{ minWidth: 100 }}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
