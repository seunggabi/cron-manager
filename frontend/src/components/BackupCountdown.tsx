import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface BackupCountdownProps {
  deletionTime: Date;
}

export function BackupCountdown({ deletionTime }: BackupCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(deletionTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('삭제 예정');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format as hh:mm:ss
      const hh = String(hours).padStart(2, '0');
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      setTimeLeft(`${hh}:${mm}:${ss}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deletionTime]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      color: '#dc2626',
      fontWeight: 600,
      fontSize: '12px',
      width: '100%',
    }}>
      <AlertTriangle size={14} />
      <span>{timeLeft}</span>
    </div>
  );
}
