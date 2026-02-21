import { useEffect, useState } from 'react';
import { FileText, FolderPlus } from 'lucide-react';
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

  // WSL 환경: LogViewer 모달 열기 + 터미널 열기 버튼 둘 다 제공
  if (isWsl) {
    const handleOpenTerminal = async () => {
      try {
        await api.logs.openWslTerminal(logFile);
      } catch (error) {
        showAlert(t('errors.openFolderFailed'), 'error');
      }
    };

    return (
      <>
        <button
          onClick={() => onOpenLog(logFile, workingDir)}
          className="command-link"
          title={`${t('logs.openLog')}: ${logFile}`}
        >
          <FileText />
          {t('logs.log')}
        </button>
        <button
          onClick={handleOpenTerminal}
          className="command-link"
          title={`${t('logs.copyWslCmd')}: ${logFile}`}
        >
          <FolderPlus />
          {t('logs.openTerminal')}
        </button>
      </>
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
