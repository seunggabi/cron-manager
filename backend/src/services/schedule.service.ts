import { Cron } from 'croner';

export class ScheduleService {
  /**
   * Validate cron expression
   */
  validateSchedule(schedule: string): { valid: boolean; error?: string } {
    try {
      // Normalize whitespace before validation
      const normalized = schedule.trim().replace(/\s+/g, ' ');
      new Cron(normalized);
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
      let currentDate = new Date();

      for (let i = 0; i < count; i++) {
        const next = cron.nextRun(currentDate);
        if (next) {
          runs.push(new Date(next));
          // Move to 1ms after this run for the next iteration
          currentDate = new Date(next.getTime() + 1);
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
   * Parse natural language to cron expression
   * Simple implementation - can be extended
   */
  fromNaturalLanguage(text: string): { schedule?: string; confidence: number } {
    const lower = text.toLowerCase().trim();

    const patterns = [
      { regex: /매분(마다)?/, schedule: '* * * * *', confidence: 1.0 },
      { regex: /매시간(마다)?/, schedule: '0 * * * *', confidence: 1.0 },
      { regex: /매일/, schedule: '0 0 * * *', confidence: 1.0 },
      { regex: /매주/, schedule: '0 0 * * 0', confidence: 0.8 },
      { regex: /매월/, schedule: '0 0 1 * *', confidence: 0.8 },
      { regex: /(\d+)분마다/, schedule: (match: RegExpMatchArray) => `*/${match[1]} * * * *`, confidence: 1.0 },
      { regex: /(\d+)시간마다/, schedule: (match: RegExpMatchArray) => `0 */${match[1]} * * *`, confidence: 1.0 },
      { regex: /오전\s*(\d+)시/, schedule: (match: RegExpMatchArray) => `0 ${match[1]} * * *`, confidence: 0.9 },
      { regex: /오후\s*(\d+)시/, schedule: (match: RegExpMatchArray) => `0 ${parseInt(match[1]) + 12} * * *`, confidence: 0.9 },
      { regex: /(\d+)시\s*(\d+)분/, schedule: (match: RegExpMatchArray) => `${match[2]} ${match[1]} * * *`, confidence: 0.9 },
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern.regex);
      if (match) {
        let schedule: string;
        if (typeof pattern.schedule === 'function') {
          schedule = pattern.schedule(match);
        } else {
          schedule = pattern.schedule;
        }
        return { schedule, confidence: pattern.confidence };
      }
    }

    return { confidence: 0 };
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
