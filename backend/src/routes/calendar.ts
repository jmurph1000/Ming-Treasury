import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, country } = req.query;
    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const targetCountry = country || 'USA';
    const { rows } = await query(
      'SELECT date, name, is_federal FROM bank_holidays WHERE year = $1 AND country = $2 ORDER BY date',
      [targetYear, targetCountry]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting holidays', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/validate/:date', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.params;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const { rows } = await query(
      'SELECT name FROM bank_holidays WHERE date = $1',
      [date]
    );
    const isHoliday = rows.length > 0;
    const isBusinessDay = !isWeekend && !isHoliday;
    res.json({
      success: true,
      data: {
        date,
        isBusinessDay,
        isWeekend,
        isHoliday,
        holidayName: isHoliday ? rows[0].name : null,
      },
    });
  } catch (error) {
    logger.error('Error validating date', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/next-business-day', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from } = req.query;
    let date = from ? new Date(from as string) : new Date();
    const { rows: holidays } = await query(
      'SELECT date FROM bank_holidays WHERE date >= $1 AND date <= $1 + INTERVAL \'14 days\'',
      [date.toISOString().split('T')[0]]
    );
    const holidayDates = new Set(holidays.map((h: { date: Date }) => h.date.toISOString().split('T')[0]));
    for (let i = 0; i < 14; i++) {
      date.setDate(date.getDate() + (i === 0 ? 0 : 1));
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        res.json({ success: true, data: { nextBusinessDay: dateStr } });
        return;
      }
    }
    res.json({ success: true, data: { nextBusinessDay: null } });
  } catch (error) {
    logger.error('Error getting next business day', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/batch-windows', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM batch_windows WHERE is_active = true ORDER BY cutoff_time');
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting batch windows', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
