import { Router } from 'express';
import { scheduleService } from '../services/schedule.service';
import { ParseScheduleRequest, NaturalLanguageRequest, ApiResponse } from '@cron-manager/shared';

const router = Router();

// POST /api/schedule/parse - Parse and validate cron expression
router.post('/parse', (req, res) => {
  try {
    const { schedule, count = 5 }: ParseScheduleRequest = req.body;

    if (!schedule) {
      return res.status(400).json({
        success: false,
        error: 'Schedule is required',
      } as ApiResponse);
    }

    const validation = scheduleService.validateSchedule(schedule);

    if (!validation.valid) {
      return res.json({
        success: true,
        data: {
          valid: false,
          error: validation.error,
        },
      } as ApiResponse);
    }

    const nextRuns = scheduleService.getNextRuns(schedule, count);
    const humanReadable = scheduleService.toHumanReadable(schedule);

    res.json({
      success: true,
      data: {
        valid: true,
        nextRuns,
        humanReadable,
      },
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// POST /api/schedule/from-natural - Convert natural language to cron
router.post('/from-natural', (req, res) => {
  try {
    const { text }: NaturalLanguageRequest = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      } as ApiResponse);
    }

    const result = scheduleService.fromNaturalLanguage(text);

    if (!result.schedule) {
      return res.json({
        success: true,
        data: {
          error: 'Could not parse natural language',
          confidence: result.confidence,
        },
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: result,
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

// GET /api/schedule/presets - Get schedule presets
router.get('/presets', (req, res) => {
  try {
    const presets = scheduleService.getPresets();

    res.json({
      success: true,
      data: presets,
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    } as ApiResponse);
  }
});

export default router;
