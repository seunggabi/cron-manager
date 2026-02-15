import { Cron } from 'croner';

export class ScheduleService {
  /**
   * Validate cron expression
   */
  validateSchedule(schedule: string): { valid: boolean; error?: string } {
    try {
      new Cron(schedule);
      return { valid: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid schedule';
      return { valid: false, error: message };
    }
  }

  /**
   * Get next run times for a cron expression
   */
  getNextRuns(schedule: string, count: number = 5): Date[] {
    try {
      const cron = new Cron(schedule);
      const runs: Date[] = [];

      // Use nextRuns method if available (more efficient)
      if (typeof (cron as any).nextRuns === 'function') {
        const nextRuns = (cron as any).nextRuns(count);
        return nextRuns || [];
      }

      // Fallback: manually iterate
      let currentTime = new Date();
      for (let i = 0; i < count; i++) {
        const next = cron.nextRun(currentTime);
        if (next) {
          runs.push(next);
          // Use this run as the reference for the next iteration
          currentTime = new Date(next.getTime() + 1000); // Add 1 second
        } else {
          break;
        }
      }

      return runs;
    } catch {
      return [];
    }
  }

  /**
   * Convert cron expression to human-readable format
   */
  toHumanReadable(schedule: string): string {
    const parts = schedule.trim().split(/\s+/);

    if (parts.length < 5) {
      return 'schedule.humanReadable.invalidSchedule';
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Simple cases - return translation keys
    if (schedule === '* * * * *') {
      return 'schedule.humanReadable.everyMinute';
    }
    if (schedule === '0 * * * *') {
      return 'schedule.humanReadable.everyHour';
    }
    if (schedule === '0 0 * * *') {
      return 'schedule.humanReadable.dailyMidnight';
    }
    if (schedule === '0 0 * * 0') {
      return 'schedule.humanReadable.weeklySunday';
    }
    if (schedule === '0 0 1 * *') {
      return 'schedule.humanReadable.monthly';
    }

    const result: string[] = [];

    // Minute
    if (minute === '*') {
      result.push('every minute');
    } else if (minute.includes('/')) {
      const interval = minute.split('/')[1];
      result.push(`every ${interval} minutes`);
    } else if (minute.includes(',')) {
      result.push(`minute ${minute}`);
    } else {
      result.push(`minute ${minute}`);
    }

    // Hour
    if (hour !== '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1];
        result.push(`every ${interval} hours`);
      } else if (hour.includes(',')) {
        result.push(`hour ${hour}`);
      } else {
        result.push(`hour ${hour}`);
      }
    }

    // Day of month
    if (dayOfMonth !== '*') {
      if (dayOfMonth.includes('/')) {
        const interval = dayOfMonth.split('/')[1];
        result.push(`every ${interval} days`);
      } else {
        result.push(`day ${dayOfMonth}`);
      }
    }

    // Month
    if (month !== '*') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (month.includes(',')) {
        const months = month.split(',').map(m => monthNames[parseInt(m) - 1] || m);
        result.push(months.join(', '));
      } else {
        result.push(monthNames[parseInt(month) - 1] || month);
      }
    }

    // Day of week
    if (dayOfWeek !== '*') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (dayOfWeek.includes(',')) {
        const days = dayOfWeek.split(',').map(d => dayNames[parseInt(d)] || d);
        result.push(days.join(', '));
      } else {
        result.push(dayNames[parseInt(dayOfWeek)] || dayOfWeek);
      }
    }

    return result.join(' ') || schedule;
  }

  /**
   * Get schedule presets
   */
  getPresets() {
    return [
      {
        id: 'every-minute',
        name: 'Every Minute',
        description: 'Run every minute',
        nameKey: 'schedule.presets.everyMinute.name',
        descriptionKey: 'schedule.presets.everyMinute.description',
        schedule: '* * * * *'
      },
      {
        id: 'every-5-minutes',
        name: 'Every 5 Minutes',
        description: 'Run every 5 minutes',
        nameKey: 'schedule.presets.every5Minutes.name',
        descriptionKey: 'schedule.presets.every5Minutes.description',
        schedule: '*/5 * * * *'
      },
      {
        id: 'every-10-minutes',
        name: 'Every 10 Minutes',
        description: 'Run every 10 minutes',
        nameKey: 'schedule.presets.every10Minutes.name',
        descriptionKey: 'schedule.presets.every10Minutes.description',
        schedule: '*/10 * * * *'
      },
      {
        id: 'every-15-minutes',
        name: 'Every 15 Minutes',
        description: 'Run every 15 minutes',
        nameKey: 'schedule.presets.every15Minutes.name',
        descriptionKey: 'schedule.presets.every15Minutes.description',
        schedule: '*/15 * * * *'
      },
      {
        id: 'every-30-minutes',
        name: 'Every 30 Minutes',
        description: 'Run every 30 minutes',
        nameKey: 'schedule.presets.every30Minutes.name',
        descriptionKey: 'schedule.presets.every30Minutes.description',
        schedule: '*/30 * * * *'
      },
      {
        id: 'every-hour',
        name: 'Every Hour',
        description: 'Run every hour',
        nameKey: 'schedule.presets.everyHour.name',
        descriptionKey: 'schedule.presets.everyHour.description',
        schedule: '0 * * * *'
      },
      {
        id: 'every-2-hours',
        name: 'Every 2 Hours',
        description: 'Run every 2 hours',
        nameKey: 'schedule.presets.every2Hours.name',
        descriptionKey: 'schedule.presets.every2Hours.description',
        schedule: '0 */2 * * *'
      },
      {
        id: 'every-6-hours',
        name: 'Every 6 Hours',
        description: 'Run every 6 hours',
        nameKey: 'schedule.presets.every6Hours.name',
        descriptionKey: 'schedule.presets.every6Hours.description',
        schedule: '0 */6 * * *'
      },
      {
        id: 'daily-midnight',
        name: 'Daily at Midnight',
        description: 'Run daily at midnight',
        nameKey: 'schedule.presets.dailyMidnight.name',
        descriptionKey: 'schedule.presets.dailyMidnight.description',
        schedule: '0 0 * * *'
      },
      {
        id: 'daily-6am',
        name: 'Daily at 6 AM',
        description: 'Run daily at 6 AM',
        nameKey: 'schedule.presets.daily6am.name',
        descriptionKey: 'schedule.presets.daily6am.description',
        schedule: '0 6 * * *'
      },
      {
        id: 'daily-9am',
        name: 'Daily at 9 AM',
        description: 'Run daily at 9 AM',
        nameKey: 'schedule.presets.daily9am.name',
        descriptionKey: 'schedule.presets.daily9am.description',
        schedule: '0 9 * * *'
      },
      {
        id: 'daily-6pm',
        name: 'Daily at 6 PM',
        description: 'Run daily at 6 PM',
        nameKey: 'schedule.presets.daily6pm.name',
        descriptionKey: 'schedule.presets.daily6pm.description',
        schedule: '0 18 * * *'
      },
      {
        id: 'weekly-sunday',
        name: 'Weekly on Sunday',
        description: 'Run every Sunday at midnight',
        nameKey: 'schedule.presets.weeklySunday.name',
        descriptionKey: 'schedule.presets.weeklySunday.description',
        schedule: '0 0 * * 0'
      },
      {
        id: 'weekly-monday',
        name: 'Weekly on Monday',
        description: 'Run every Monday at midnight',
        nameKey: 'schedule.presets.weeklyMonday.name',
        descriptionKey: 'schedule.presets.weeklyMonday.description',
        schedule: '0 0 * * 1'
      },
      {
        id: 'monthly',
        name: 'Monthly on 1st',
        description: 'Run on 1st of every month',
        nameKey: 'schedule.presets.monthly.name',
        descriptionKey: 'schedule.presets.monthly.description',
        schedule: '0 0 1 * *'
      },
      {
        id: 'workday-9am',
        name: 'Weekdays at 9 AM',
        description: 'Run Mon-Fri at 9 AM',
        nameKey: 'schedule.presets.workday9am.name',
        descriptionKey: 'schedule.presets.workday9am.description',
        schedule: '0 9 * * 1-5'
      },
    ];
  }
}

export const scheduleService = new ScheduleService();
