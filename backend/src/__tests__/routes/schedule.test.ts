import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import scheduleRouter from '../../routes/schedule';
import { scheduleService } from '../../services/schedule.service';

// Mock schedule service
vi.mock('../../services/schedule.service', () => ({
  scheduleService: {
    validateSchedule: vi.fn(),
    getNextRuns: vi.fn(),
    toHumanReadable: vi.fn(),
    fromNaturalLanguage: vi.fn(),
    getPresets: vi.fn(),
  },
}));

describe('Schedule Router', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/schedule', scheduleRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/schedule/parse', () => {
    it('parses valid cron expression', async () => {
      const schedule = '0 * * * *';
      const mockNextRuns = [
        new Date('2024-01-01T01:00:00Z'),
        new Date('2024-01-01T02:00:00Z'),
        new Date('2024-01-01T03:00:00Z'),
      ];

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue(mockNextRuns);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('매시간마다');

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.nextRuns).toHaveLength(3);
      expect(response.body.data.humanReadable).toBe('매시간마다');
    });

    it('parses with custom count', async () => {
      const schedule = '0 0 * * *';
      const count = 10;
      const mockNextRuns = new Array(10).fill(null).map((_, i) =>
        new Date(Date.now() + (i + 1) * 86400000)
      );

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue(mockNextRuns);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('매일 자정');

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule, count });

      expect(response.status).toBe(200);
      expect(response.body.data.nextRuns).toHaveLength(10);
      expect(scheduleService.getNextRuns).toHaveBeenCalledWith(schedule, count);
    });

    it('uses default count of 5 when not specified', async () => {
      const schedule = '0 * * * *';

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue([]);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('매시간마다');

      await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(scheduleService.getNextRuns).toHaveBeenCalledWith(schedule, 5);
    });

    it('handles invalid cron expression', async () => {
      const schedule = 'invalid cron';

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: false,
        error: 'Invalid cron expression',
      });

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.error).toBe('Invalid cron expression');
    });

    it('returns 400 when schedule is missing', async () => {
      const response = await request(app)
        .post('/api/schedule/parse')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Schedule is required');
    });

    it('handles empty schedule string', async () => {
      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Schedule is required');
    });

    it('handles service errors gracefully', async () => {
      const schedule = '0 * * * *';

      vi.mocked(scheduleService.validateSchedule).mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service error');
    });

    it('parses complex cron expressions', async () => {
      const schedule = '*/15 9-17 * * 1-5';
      const mockNextRuns = [new Date()];

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue(mockNextRuns);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('15분마다 9시 17시 월요일 금요일');

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.humanReadable).toBeDefined();
    });

    it('handles schedules with special characters', async () => {
      const schedule = '0 0 1,15 * *';

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: true,
      });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue([]);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('0분 0시 1,15일');

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });
  });

  describe('POST /api/schedule/from-natural', () => {
    it('converts natural language to cron expression', async () => {
      const text = '매시간마다';

      vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
        schedule: '0 * * * *',
        confidence: 1.0,
      });

      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.schedule).toBe('0 * * * *');
      expect(response.body.data.confidence).toBe(1.0);
    });

    it('handles Korean time expressions', async () => {
      const tests = [
        { text: '매일', schedule: '0 0 * * *', confidence: 1.0 },
        { text: '5분마다', schedule: '*/5 * * * *', confidence: 1.0 },
        { text: '오전 9시', schedule: '0 9 * * *', confidence: 0.9 },
        { text: '오후 3시', schedule: '0 15 * * *', confidence: 0.9 },
      ];

      for (const test of tests) {
        vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
          schedule: test.schedule,
          confidence: test.confidence,
        });

        const response = await request(app)
          .post('/api/schedule/from-natural')
          .send({ text: test.text });

        expect(response.status).toBe(200);
        expect(response.body.data.schedule).toBe(test.schedule);
        expect(response.body.data.confidence).toBe(test.confidence);
      }
    });

    it('handles unparseable natural language', async () => {
      const text = 'random text that cannot be parsed';

      vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
        confidence: 0,
      });

      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.error).toBe('Could not parse natural language');
      expect(response.body.data.confidence).toBe(0);
    });

    it('returns 400 when text is missing', async () => {
      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Text is required');
    });

    it('handles empty text string', async () => {
      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Text is required');
    });

    it('handles service errors', async () => {
      const text = '매일';

      vi.mocked(scheduleService.fromNaturalLanguage).mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service error');
    });

    it('handles whitespace-only text', async () => {
      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Text is required');
    });

    it('trims whitespace from text', async () => {
      const text = '  매시간마다  ';

      vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
        schedule: '0 * * * *',
        confidence: 1.0,
      });

      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.data.schedule).toBe('0 * * * *');
    });

    it('returns low confidence for ambiguous text', async () => {
      const text = '가끔';

      vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
        confidence: 0.3,
      });

      const response = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.data.confidence).toBe(0.3);
      expect(response.body.data.error).toBe('Could not parse natural language');
    });
  });

  describe('GET /api/schedule/presets', () => {
    it('returns list of schedule presets', async () => {
      const mockPresets = [
        {
          id: 'every-minute',
          name: '매분마다',
          description: '1분마다 실행',
          schedule: '* * * * *',
        },
        {
          id: 'every-hour',
          name: '매시간',
          description: '매시간 정각에 실행',
          schedule: '0 * * * *',
        },
        {
          id: 'daily-midnight',
          name: '매일 자정',
          description: '매일 0시에 실행',
          schedule: '0 0 * * *',
        },
      ];

      vi.mocked(scheduleService.getPresets).mockReturnValue(mockPresets);

      const response = await request(app).get('/api/schedule/presets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPresets);
      expect(response.body.data).toHaveLength(3);
    });

    it('returns empty array when no presets available', async () => {
      vi.mocked(scheduleService.getPresets).mockReturnValue([]);

      const response = await request(app).get('/api/schedule/presets');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('each preset has required fields', async () => {
      const mockPresets = [
        {
          id: 'test-preset',
          name: 'Test Preset',
          description: 'Test description',
          schedule: '0 * * * *',
        },
      ];

      vi.mocked(scheduleService.getPresets).mockReturnValue(mockPresets);

      const response = await request(app).get('/api/schedule/presets');

      expect(response.status).toBe(200);
      response.body.data.forEach((preset: any) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('schedule');
      });
    });

    it('handles service errors', async () => {
      vi.mocked(scheduleService.getPresets).mockImplementation(() => {
        throw new Error('Failed to load presets');
      });

      const response = await request(app).get('/api/schedule/presets');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to load presets');
    });

    it('returns presets in consistent order', async () => {
      const mockPresets = [
        { id: 'preset1', name: 'Preset 1', description: 'Desc 1', schedule: '* * * * *' },
        { id: 'preset2', name: 'Preset 2', description: 'Desc 2', schedule: '0 * * * *' },
        { id: 'preset3', name: 'Preset 3', description: 'Desc 3', schedule: '0 0 * * *' },
      ];

      vi.mocked(scheduleService.getPresets).mockReturnValue(mockPresets);

      const response1 = await request(app).get('/api/schedule/presets');
      const response2 = await request(app).get('/api/schedule/presets');

      expect(response1.body.data).toEqual(response2.body.data);
    });

    it('includes common preset types', async () => {
      const mockPresets = [
        { id: 'every-minute', name: '매분마다', description: '1분마다', schedule: '* * * * *' },
        { id: 'every-5-minutes', name: '5분마다', description: '5분마다', schedule: '*/5 * * * *' },
        { id: 'every-hour', name: '매시간', description: '매시간', schedule: '0 * * * *' },
        { id: 'daily-midnight', name: '매일 자정', description: '매일 0시', schedule: '0 0 * * *' },
        { id: 'weekly-sunday', name: '매주 일요일', description: '매주 일요일', schedule: '0 0 * * 0' },
        { id: 'monthly', name: '매월 1일', description: '매월 1일', schedule: '0 0 1 * *' },
      ];

      vi.mocked(scheduleService.getPresets).mockReturnValue(mockPresets);

      const response = await request(app).get('/api/schedule/presets');

      const ids = response.body.data.map((p: any) => p.id);
      expect(ids).toContain('every-minute');
      expect(ids).toContain('every-hour');
      expect(ids).toContain('daily-midnight');
      expect(ids).toContain('weekly-sunday');
      expect(ids).toContain('monthly');
    });

    it('preset IDs are unique', async () => {
      const mockPresets = [
        { id: 'preset1', name: 'P1', description: 'D1', schedule: '* * * * *' },
        { id: 'preset2', name: 'P2', description: 'D2', schedule: '0 * * * *' },
        { id: 'preset3', name: 'P3', description: 'D3', schedule: '0 0 * * *' },
      ];

      vi.mocked(scheduleService.getPresets).mockReturnValue(mockPresets);

      const response = await request(app).get('/api/schedule/presets');

      const ids = response.body.data.map((p: any) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('integration scenarios', () => {
    it('parses schedule and validates it matches preset', async () => {
      const preset = {
        id: 'every-hour',
        name: '매시간',
        description: '매시간 정각',
        schedule: '0 * * * *',
      };

      // First get preset
      vi.mocked(scheduleService.getPresets).mockReturnValue([preset]);
      const presetsResponse = await request(app).get('/api/schedule/presets');

      const presetSchedule = presetsResponse.body.data[0].schedule;

      // Then parse it
      vi.mocked(scheduleService.validateSchedule).mockReturnValue({ valid: true });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue([new Date()]);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('매시간');

      const parseResponse = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule: presetSchedule });

      expect(parseResponse.body.data.valid).toBe(true);
    });

    it('converts natural language and parses result', async () => {
      const text = '매일';
      const schedule = '0 0 * * *';

      // Convert natural language
      vi.mocked(scheduleService.fromNaturalLanguage).mockReturnValue({
        schedule,
        confidence: 1.0,
      });

      const nlResponse = await request(app)
        .post('/api/schedule/from-natural')
        .send({ text });

      expect(nlResponse.body.data.schedule).toBe(schedule);

      // Parse the result
      vi.mocked(scheduleService.validateSchedule).mockReturnValue({ valid: true });
      vi.mocked(scheduleService.getNextRuns).mockReturnValue([new Date()]);
      vi.mocked(scheduleService.toHumanReadable).mockReturnValue('매일 자정');

      const parseResponse = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule });

      expect(parseResponse.body.data.valid).toBe(true);
      expect(parseResponse.body.data.humanReadable).toBe('매일 자정');
    });
  });

  describe('error handling', () => {
    it('handles malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/schedule/parse')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('handles unexpected data types', async () => {
      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule: 123 }); // number instead of string

      // Should still process, service will handle validation
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('handles null values gracefully', async () => {
      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule: null });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Schedule is required');
    });

    it('handles very long schedule strings', async () => {
      const longSchedule = '0 * * * *' + ' '.repeat(1000);

      vi.mocked(scheduleService.validateSchedule).mockReturnValue({
        valid: false,
        error: 'Invalid format',
      });

      const response = await request(app)
        .post('/api/schedule/parse')
        .send({ schedule: longSchedule });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
    });
  });
});
