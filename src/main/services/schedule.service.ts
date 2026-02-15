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
      result.push('매분');
    } else if (minute.includes('/')) {
      const interval = minute.split('/')[1];
      result.push(`${interval}분마다`);
    } else if (minute.includes(',')) {
      result.push(`${minute}분`);
    } else {
      result.push(`${minute}분`);
    }

    // Hour
    if (hour !== '*') {
      if (hour.includes('/')) {
        const interval = hour.split('/')[1];
        result.push(`${interval}시간마다`);
      } else if (hour.includes(',')) {
        result.push(`${hour}시`);
      } else {
        result.push(`${hour}시`);
      }
    }

    // Day of month
    if (dayOfMonth !== '*') {
      if (dayOfMonth.includes('/')) {
        const interval = dayOfMonth.split('/')[1];
        result.push(`${interval}일마다`);
      } else {
        result.push(`${dayOfMonth}일`);
      }
    }

    // Month
    if (month !== '*') {
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      if (month.includes(',')) {
        const months = month.split(',').map(m => monthNames[parseInt(m) - 1] || m);
        result.push(months.join(', '));
      } else {
        result.push(monthNames[parseInt(month) - 1] || month);
      }
    }

    // Day of week
    if (dayOfWeek !== '*') {
      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
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
        name: '매분마다',
        description: '1분마다 실행',
        nameKey: 'schedule.presets.everyMinute.name',
        descriptionKey: 'schedule.presets.everyMinute.description',
        schedule: '* * * * *'
      },
      {
        id: 'every-5-minutes',
        name: '5분마다',
        description: '5분마다 실행',
        nameKey: 'schedule.presets.every5Minutes.name',
        descriptionKey: 'schedule.presets.every5Minutes.description',
        schedule: '*/5 * * * *'
      },
      {
        id: 'every-10-minutes',
        name: '10분마다',
        description: '10분마다 실행',
        nameKey: 'schedule.presets.every10Minutes.name',
        descriptionKey: 'schedule.presets.every10Minutes.description',
        schedule: '*/10 * * * *'
      },
      {
        id: 'every-15-minutes',
        name: '15분마다',
        description: '15분마다 실행',
        nameKey: 'schedule.presets.every15Minutes.name',
        descriptionKey: 'schedule.presets.every15Minutes.description',
        schedule: '*/15 * * * *'
      },
      {
        id: 'every-30-minutes',
        name: '30분마다',
        description: '30분마다 실행',
        nameKey: 'schedule.presets.every30Minutes.name',
        descriptionKey: 'schedule.presets.every30Minutes.description',
        schedule: '*/30 * * * *'
      },
      {
        id: 'every-hour',
        name: '매시간',
        description: '매시간 정각에 실행',
        nameKey: 'schedule.presets.everyHour.name',
        descriptionKey: 'schedule.presets.everyHour.description',
        schedule: '0 * * * *'
      },
      {
        id: 'every-2-hours',
        name: '2시간마다',
        description: '2시간마다 실행',
        nameKey: 'schedule.presets.every2Hours.name',
        descriptionKey: 'schedule.presets.every2Hours.description',
        schedule: '0 */2 * * *'
      },
      {
        id: 'every-6-hours',
        name: '6시간마다',
        description: '6시간마다 실행',
        nameKey: 'schedule.presets.every6Hours.name',
        descriptionKey: 'schedule.presets.every6Hours.description',
        schedule: '0 */6 * * *'
      },
      {
        id: 'daily-midnight',
        name: '매일 자정',
        description: '매일 0시에 실행',
        nameKey: 'schedule.presets.dailyMidnight.name',
        descriptionKey: 'schedule.presets.dailyMidnight.description',
        schedule: '0 0 * * *'
      },
      {
        id: 'daily-6am',
        name: '매일 오전 6시',
        description: '매일 6시에 실행',
        nameKey: 'schedule.presets.daily6am.name',
        descriptionKey: 'schedule.presets.daily6am.description',
        schedule: '0 6 * * *'
      },
      {
        id: 'daily-9am',
        name: '매일 오전 9시',
        description: '매일 9시에 실행',
        nameKey: 'schedule.presets.daily9am.name',
        descriptionKey: 'schedule.presets.daily9am.description',
        schedule: '0 9 * * *'
      },
      {
        id: 'daily-6pm',
        name: '매일 오후 6시',
        description: '매일 18시에 실행',
        nameKey: 'schedule.presets.daily6pm.name',
        descriptionKey: 'schedule.presets.daily6pm.description',
        schedule: '0 18 * * *'
      },
      {
        id: 'weekly-sunday',
        name: '매주 일요일',
        description: '매주 일요일 자정',
        nameKey: 'schedule.presets.weeklySunday.name',
        descriptionKey: 'schedule.presets.weeklySunday.description',
        schedule: '0 0 * * 0'
      },
      {
        id: 'weekly-monday',
        name: '매주 월요일',
        description: '매주 월요일 자정',
        nameKey: 'schedule.presets.weeklyMonday.name',
        descriptionKey: 'schedule.presets.weeklyMonday.description',
        schedule: '0 0 * * 1'
      },
      {
        id: 'monthly',
        name: '매월 1일',
        description: '매월 1일 자정',
        nameKey: 'schedule.presets.monthly.name',
        descriptionKey: 'schedule.presets.monthly.description',
        schedule: '0 0 1 * *'
      },
      {
        id: 'workday-9am',
        name: '평일 오전 9시',
        description: '월~금 9시',
        nameKey: 'schedule.presets.workday9am.name',
        descriptionKey: 'schedule.presets.workday9am.description',
        schedule: '0 9 * * 1-5'
      },
    ];
  }
}

export const scheduleService = new ScheduleService();
