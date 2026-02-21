import { useEffect, useState } from 'react';
import { FileText, FolderPlus, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const api = window.electronAPI;

interface LogButtonProps {
  logFile: string;
  workingDir?: string;
  showAlert: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  onOpenLog: (logPath: string, workingDir?: string) => void;
  isWsl?: boolean;
}

export function LogButton({ logFile, workingDir, showAlert, onOpenLog, isWsl }: LogButtonProps) {
  const { t } = useTranslation();
  const [dirExists, setDirExists] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isWsl) return;
    const checkDir = async () => {
      try {
        const response = await api.logs.checkDir(logFile, workingDir);
        if (response.success && response.data) {
          setDirExists(response.data.exists);
        }
      } catch (error) {
        console.error('Failed to check directory:', error);
      }
    };
    checkDir();
  }, [logFile, workingDir, isWsl]);

  // WSL 환경: mkdir -p && touch && tail -f 명령어 복사 버튼
  if (isWsl) {
    const lastSlash = logFile.lastIndexOf('/');
    const logDir = lastSlash > 0 ? logFile.substring(0, lastSlash) : '~';
    const wslCmd = `mkdir -p ${logDir} && touch ${logFile} && tail -f ${logFile}`;

    const handleCopy = () => {
      navigator.clipboard.writeText(wslCmd).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };

    return (
      <button onClick={handleCopy} className="command-link" title={wslCmd}>
        {copied ? <Check /> : <Copy />}
        {copied ? t('logs.copied') : t('logs.copyWslCmd')}
      </button>
    );
  }

  const handleCreateDir = async () => {
    try {
      const response = await api.logs.createDir(logFile, workingDir);
      if (response.success) {
        setDirExists(true);
      } else {
        showAlert(response.error || t('errors.createDirFailed'), 'error');
      }
    } catch (error) {
      showAlert(t('errors.createDirFailed'), 'error');
    }
  };

  const handleOpenLog = () => {
    onOpenLog(logFile, workingDir);
  };

  if (dirExists === null) {
    return null;
  }

  if (!dirExists) {
    return (
      <button
        onClick={handleCreateDir}
        className="command-link"
        style={{ color: '#ef4444', borderColor: '#ef4444' }}
        title={`${t('logs.createDir')}: ${logFile}`}
      >
        <FolderPlus />
        {t('logs.createDir')}
      </button>
    );
  }

  return (
    <button
      onClick={handleOpenLog}
      className="command-link"
      title={`${t('logs.openLog')}: ${logFile}`}
    >
      <FileText />
      {t('logs.log')}
    </button>
  );
}
