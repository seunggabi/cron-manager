import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import logoSvg from '/logo.svg';

export type AlertType = 'info' | 'success' | 'error' | 'warning';

interface AlertDialogProps {
  isOpen: boolean;
  type?: AlertType;
  title?: string;
  message: string;
  onClose: () => void;
}

export function AlertDialog({ isOpen, type = 'info', title, message, onClose }: AlertDialogProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleEnter);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    info: <Info size={48} />,
    success: <CheckCircle size={48} />,
    error: <XCircle size={48} />,
    warning: <AlertCircle size={48} />,
  };

  const colors = {
    info: '#3b82f6',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
  };

  const Icon = icons[type];
  const color = colors[type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <button onClick={onClose} className="modal-close" aria-label={t('common.close')}>
            <X />
          </button>
        </div>

        <div style={{
          textAlign: 'center',
          padding: '20px 40px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <img
              src={logoSvg}
              alt="Cron Manager"
              style={{
                width: '32px',
                height: '32px',
              }}
            />
            <span style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              Cron Manager
            </span>
          </div>

          {/* Icon */}
          <div style={{ color }}>
            {Icon}
          </div>

          {/* Title */}
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              {title}
            </h3>
          )}

          {/* Message */}
          <div style={{
            fontSize: '15px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '300px',
            overflowY: 'auto',
            width: '100%'
          }}>
            {message}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            autoFocus
            style={{ minWidth: '120px' }}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for using alert dialog
export function useAlertDialog() {
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    message: '',
  });

  const showAlert = (message: string, type: AlertType = 'info', title?: string) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  return {
    alert,
    showAlert,
    closeAlert,
  };
}
