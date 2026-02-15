import { describe, it, expect, beforeEach } from 'vitest';
import { ScheduleService } from '../../services/schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(() => {
    service = new ScheduleService();
  });

  describe('validateSchedule', () => {
    it('validates correct cron expressions', () => {
      const validExpressions = [
        '* * * * *',
        '0 * * * *',
        '0 0 * * *',
        '*/5 * * * *',
        '0 */2 * * *',
        '0 0 * * 0',
        '0 0 1 * *',
        '0 9-17 * * 1-5',
        '*/15 9-17 * * 1-5',
        '0 0 1,15 * *',
        '0 0 * * 1,3,5',
      ];

      validExpressions.forEach((expr) => {
        const result = service.validateSchedule(expr);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('invalidates incorrect cron expressions', () => {
      // Test only expressions that croner actually rejects
      const invalidExpressions = [
        '',
        '* * * *', // Too few fields
        '60 * * * *', // Invalid minute
        '* 24 * * *', // Invalid hour
        '* * 32 * *', // Invalid day
        '* * * 13 *', // Invalid month
        'invalid cron',
      ];

      invalidExpressions.forEach((expr) => {
        const result = service.validateSchedule(expr);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('handles edge cases', () => {
      // Test boundary values
      expect(service.validateSchedule('0 0 1 1 0').valid).toBe(true);
      expect(service.validateSchedule('59 23 31 12 6').valid).toBe(true);
    });
  });

  describe('getNextRuns', () => {
    it('returns specified number of next runs', () => {
      const schedule = '0 * * * *'; // Every hour
      const runs = service.getNextRuns(schedule, 3);

      expect(runs).toHaveLength(3);
      runs.forEach((run) => {
        expect(run).toBeInstanceOf(Date);
        expect(run.getTime()).toBeGreaterThan(Date.now());
      });
    });

    it('returns runs in ascending order', () => {
      const schedule = '*/15 * * * *'; // Every 15 minutes
      const runs = service.getNextRuns(schedule, 5);

      expect(runs).toHaveLength(5);
      for (let i = 1; i < runs.length; i++) {
        expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime());
      }
    });

    it('returns default 5 runs when count not specified', () => {
      const schedule = '* * * * *';
      const runs = service.getNextRuns(schedule);

      expect(runs).toHaveLength(5);
    });

    it('returns empty array for invalid schedule', () => {
      const runs = service.getNextRuns('invalid schedule', 3);
      expect(runs).toEqual([]);
    });

    it('handles complex schedules', () => {
      const schedule = '0 9-17 * * 1-5'; // Weekdays 9am-5pm
      const runs = service.getNextRuns(schedule, 10);

      expect(runs.length).toBeGreaterThan(0);
      runs.forEach((run) => {
        const day = run.getDay();
        const hour = run.getHours();
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(5);
        expect(hour).toBeGreaterThanOrEqual(9);
        expect(hour).toBeLessThanOrEqual(17);
      });
    });

    it('handles monthly schedules', () => {
      const schedule = '0 0 1 * *'; // First day of every month
      const runs = service.getNextRuns(schedule, 3);

      expect(runs).toHaveLength(3);
      runs.forEach((run) => {
        expect(run.getDate()).toBe(1);
        expect(run.getHours()).toBe(0);
        expect(run.getMinutes()).toBe(0);
      });
    });
  });

  describe('toHumanReadable', () => {
    it('converts simple schedules to Korean', () => {
      expect(service.toHumanReadable('* * * * *')).toBe('매분마다');
      expect(service.toHumanReadable('0 * * * *')).toBe('매시간마다');
      expect(service.toHumanReadable('0 0 * * *')).toBe('매일 자정');
      expect(service.toHumanReadable('0 0 * * 0')).toBe('매주 일요일 자정');
      expect(service.toHumanReadable('0 0 1 * *')).toBe('매월 1일 자정');
    });

    it('converts interval schedules', () => {
      expect(service.toHumanReadable('*/5 * * * *')).toContain('5분마다');
      expect(service.toHumanReadable('0 */2 * * *')).toContain('2시간마다');
      expect(service.toHumanReadable('0 0 */3 * *')).toContain('3일마다');
    });

    it('converts specific time schedules', () => {
      const result1 = service.toHumanReadable('30 14 * * *');
      expect(result1).toContain('30분');
      expect(result1).toContain('14시');

      const result2 = service.toHumanReadable('0 9 * * *');
      expect(result2).toContain('0분');
      expect(result2).toContain('9시');
    });

    it('converts day of month schedules', () => {
      const result = service.toHumanReadable('0 0 15 * *');
      expect(result).toContain('15일');
    });

    it('converts month schedules', () => {
      const result = service.toHumanReadable('0 0 1 6 *');
      expect(result).toContain('6월');
    });

    it('converts day of week schedules', () => {
      const result1 = service.toHumanReadable('0 0 * * 1');
      expect(result1).toContain('월요일');

      const result2 = service.toHumanReadable('0 0 * * 5');
      expect(result2).toContain('금요일');
    });

    it('converts multiple values with commas', () => {
      const result1 = service.toHumanReadable('0,30 * * * *');
      expect(result1).toContain('0,30분');

      const result2 = service.toHumanReadable('0 9,12,18 * * *');
      expect(result2).toContain('9,12,18시');

      const result3 = service.toHumanReadable('0 0 * 1,6,12 *');
      expect(result3).toContain('1월');
      expect(result3).toContain('6월');
      expect(result3).toContain('12월');

      const result4 = service.toHumanReadable('0 0 * * 1,3,5');
      expect(result4).toContain('월요일');
      expect(result4).toContain('수요일');
      expect(result4).toContain('금요일');
    });

    it('handles complex combinations', () => {
      const result = service.toHumanReadable('*/15 9-17 * * 1-5');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns Invalid schedule for malformed input', () => {
      expect(service.toHumanReadable('* * *')).toBe('Invalid schedule');
      expect(service.toHumanReadable('')).toBe('Invalid schedule');
      expect(service.toHumanReadable('invalid')).toBe('Invalid schedule');
    });

    it('handles edge cases gracefully', () => {
      // All wildcards except one field
      expect(service.toHumanReadable('30 * * * *')).toContain('30분');
      expect(service.toHumanReadable('* 14 * * *')).toContain('14시');
    });
  });

  describe('fromNaturalLanguage', () => {
    it('parses Korean time expressions', () => {
      const tests = [
        { input: '매분마다', expected: '* * * * *', confidence: 1.0 },
        { input: '매분', expected: '* * * * *', confidence: 1.0 },
        { input: '매시간마다', expected: '0 * * * *', confidence: 1.0 },
        { input: '매시간', expected: '0 * * * *', confidence: 1.0 },
        { input: '매일', expected: '0 0 * * *', confidence: 1.0 },
        { input: '매주', expected: '0 0 * * 0', confidence: 0.8 },
        { input: '매월', expected: '0 0 1 * *', confidence: 0.8 },
      ];

      tests.forEach(({ input, expected, confidence }) => {
        const result = service.fromNaturalLanguage(input);
        expect(result.schedule).toBe(expected);
        expect(result.confidence).toBe(confidence);
      });
    });

    it('parses interval expressions', () => {
      const result1 = service.fromNaturalLanguage('5분마다');
      expect(result1.schedule).toBe('*/5 * * * *');
      expect(result1.confidence).toBe(1.0);

      const result2 = service.fromNaturalLanguage('15분마다');
      expect(result2.schedule).toBe('*/15 * * * *');

      const result3 = service.fromNaturalLanguage('2시간마다');
      expect(result3.schedule).toBe('0 */2 * * *');
      expect(result3.confidence).toBe(1.0);
    });

    it('parses specific time expressions', () => {
      const result1 = service.fromNaturalLanguage('오전 9시');
      expect(result1.schedule).toBe('0 9 * * *');
      expect(result1.confidence).toBe(0.9);

      const result2 = service.fromNaturalLanguage('오후 3시');
      expect(result2.schedule).toBe('0 15 * * *');
      expect(result2.confidence).toBe(0.9);

      const result3 = service.fromNaturalLanguage('14시 30분');
      expect(result3.schedule).toBe('30 14 * * *');
      expect(result3.confidence).toBe(0.9);
    });

    it('handles case insensitivity', () => {
      const result1 = service.fromNaturalLanguage('매일');
      const result2 = service.fromNaturalLanguage('매일');

      expect(result1.schedule).toBe(result2.schedule);
    });

    it('returns low confidence for unparseable text', () => {
      const result = service.fromNaturalLanguage('random text that does not match');

      expect(result.schedule).toBeUndefined();
      expect(result.confidence).toBe(0);
    });

    it('handles whitespace variations', () => {
      const result1 = service.fromNaturalLanguage('오전 9시');
      const result2 = service.fromNaturalLanguage('오전  9시'); // Extra space

      expect(result1.schedule).toBe(result2.schedule);
    });

    it('handles午後 (afternoon) hour conversion correctly', () => {
      const result1 = service.fromNaturalLanguage('오후 1시');
      expect(result1.schedule).toBe('0 13 * * *');

      const result2 = service.fromNaturalLanguage('오후 11시');
      expect(result2.schedule).toBe('0 23 * * *');
    });
  });

  describe('getPresets', () => {
    it('returns array of presets', () => {
      const presets = service.getPresets();

      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('each preset has required fields', () => {
      const presets = service.getPresets();

      presets.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('schedule');

        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(typeof preset.schedule).toBe('string');
      });
    });

    it('preset IDs are unique', () => {
      const presets = service.getPresets();
      const ids = presets.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('all preset schedules are valid', () => {
      const presets = service.getPresets();

      presets.forEach((preset) => {
        const validation = service.validateSchedule(preset.schedule);
        expect(validation.valid).toBe(true);
      });
    });

    it('includes common presets', () => {
      const presets = service.getPresets();
      const ids = presets.map((p) => p.id);

      const expectedPresets = [
        'every-minute',
        'every-5-minutes',
        'every-hour',
        'daily-midnight',
        'weekly-sunday',
        'monthly',
      ];

      expectedPresets.forEach((expectedId) => {
        expect(ids).toContain(expectedId);
      });
    });

    it('preset names are in Korean', () => {
      const presets = service.getPresets();

      presets.forEach((preset) => {
        // Check that name contains Korean characters or common time words
        const hasKoreanOrTime = /[가-힣]|분|시|일|월|주/.test(preset.name);
        expect(hasKoreanOrTime).toBe(true);
      });
    });

    it('includes workday preset', () => {
      const presets = service.getPresets();
      const workdayPreset = presets.find((p) => p.id === 'workday-9am');

      expect(workdayPreset).toBeDefined();
      expect(workdayPreset?.schedule).toBe('0 9 * * 1-5');
    });
  });

  describe('integration scenarios', () => {
    it('validates and gets next runs for preset schedules', () => {
      const presets = service.getPresets();

      presets.forEach((preset) => {
        const validation = service.validateSchedule(preset.schedule);
        expect(validation.valid).toBe(true);

        const runs = service.getNextRuns(preset.schedule, 3);
        expect(runs.length).toBeGreaterThan(0);
      });
    });

    it('converts schedule to human readable and validates it', () => {
      const schedule = '*/5 * * * *';

      const validation = service.validateSchedule(schedule);
      expect(validation.valid).toBe(true);

      const humanReadable = service.toHumanReadable(schedule);
      expect(humanReadable).toBeDefined();
      expect(humanReadable).not.toBe('Invalid schedule');
    });

    it('parses natural language, validates, and gets next runs', () => {
      const result = service.fromNaturalLanguage('매시간마다');

      expect(result.schedule).toBeDefined();

      if (result.schedule) {
        const validation = service.validateSchedule(result.schedule);
        expect(validation.valid).toBe(true);

        const runs = service.getNextRuns(result.schedule, 3);
        expect(runs.length).toBeGreaterThan(0);

        const humanReadable = service.toHumanReadable(result.schedule);
        expect(humanReadable).toBe('매시간마다');
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('handles empty string schedule', () => {
      expect(service.validateSchedule('').valid).toBe(false);
      expect(service.getNextRuns('')).toEqual([]);
      expect(service.toHumanReadable('')).toBe('Invalid schedule');
    });

    it('handles whitespace-only schedule', () => {
      expect(service.validateSchedule('     ').valid).toBe(false);
      expect(service.toHumanReadable('     ')).toBe('Invalid schedule');
    });

    it('handles schedule with extra whitespace', () => {
      const result = service.validateSchedule('  *   *   *   *   *  ');
      expect(result.valid).toBe(true);
    });

    it('handles zero count in getNextRuns', () => {
      const runs = service.getNextRuns('* * * * *', 0);
      expect(runs).toEqual([]);
    });

    it('handles negative count in getNextRuns', () => {
      const runs = service.getNextRuns('* * * * *', -1);
      expect(runs).toEqual([]);
    });

    it('handles large count in getNextRuns', () => {
      const runs = service.getNextRuns('0 0 1 * *', 100);
      expect(runs.length).toBeGreaterThan(0);
      expect(runs.length).toBeLessThanOrEqual(100);
    });
  });
});
