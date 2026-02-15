import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface NextRunCellProps {
  nextRun: string | null;
}

export function NextRunCell({ nextRun }: NextRunCellProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [urgencyClass, setUrgencyClass] = useState<string>('');
  const [urgencyColor, setUrgencyColor] = useState<string>('');

  useEffect(() => {
    if (!nextRun) {
      setTimeLeft('-');
      setUrgencyClass('');
      setUrgencyColor('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(nextRun).getTime();
      const diff = target - now;

      // If time has passed or more than 5 minutes away, show normal date format
      if (diff < 0 || diff > 5 * 60 * 1000) {
        setTimeLeft(format(new Date(nextRun), 'yyyy-MM-dd HH:mm:ss'));
        setUrgencyClass('');
        setUrgencyColor('');
        return false; // Stop interval
      }

      // Calculate minutes and seconds
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      // Set countdown text in mm:ss format
      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      setTimeLeft(`${mm}:${ss}`);

      // Set urgency styling based on time left
      if (diff < 60 * 1000) {
        // Less than 1 minute: red + pulse
        setUrgencyClass('urgent-pulse');
        setUrgencyColor('#ef4444');
      } else if (diff < 2 * 60 * 1000) {
        // 1-2 minutes: red
        setUrgencyClass('');
        setUrgencyColor('#ef4444');
      } else if (diff < 5 * 60 * 1000) {
        // 2-5 minutes: orange
        setUrgencyClass('');
        setUrgencyColor('#f59e0b');
      }

      return true; // Continue interval
    };

    // Initial update
    const shouldContinue = updateCountdown();

    // Only set interval if countdown is active (within 5 minutes)
    if (!shouldContinue) {
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const shouldContinue = updateCountdown();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRun]);

  return (
    <div
      className={`next-run ${urgencyClass}`}
      style={{
        color: urgencyColor || 'var(--text-primary)',
        fontWeight: urgencyColor ? 700 : 600,
      }}
    >
      {timeLeft}
    </div>
  );
}
