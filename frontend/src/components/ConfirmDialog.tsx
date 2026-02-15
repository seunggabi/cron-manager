import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, X } from 'lucide-react';
import logoSvg from '/logo.svg';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <button onClick={onCancel} className="modal-close" aria-label={t('common.close')}>
            <X />
          </button>
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: '20px 40px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <img
              src={logoSvg}
              alt="Cron Manager"
              style={{
                width: '32px',
                height: '32px',
              }}
            />
            <span
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Cron Manager
            </span>
          </div>

          {/* Icon */}
          <div style={{ color: '#f59e0b' }}>
            <AlertCircle size={48} />
          </div>

          {/* Title */}
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h3>
          )}

          {/* Message */}
          <div
            style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '300px',
              overflowY: 'auto',
              width: '100%',
            }}
          >
            {message}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
          <button onClick={onCancel} className="btn" style={{ minWidth: '100px' }}>
            {cancelText || t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
            autoFocus
            style={{ minWidth: '100px' }}
          >
            {confirmText || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using confirm dialog
export function useConfirmDialog() {
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirm({
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          resolve(true);
          setConfirm((prev) => ({ ...prev, isOpen: false }));
        },
      });
    });
  };

  const closeConfirm = () => {
    setConfirm((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    showConfirm,
    closeConfirm,
  };
}
