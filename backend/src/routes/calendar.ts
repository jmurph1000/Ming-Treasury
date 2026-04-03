import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

// GET /api/calendar/holidays — fetch holidays by year/country
router.get('/holidays', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, country } = req.query;
    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();

    let sql: string;
    let params: any[];

    if (country) {
      sql = 'SELECT date, name, country, is_federal FROM bank_holidays WHERE year = $1 AND country = $2 ORDER BY date';
      params = [targetYear, country];
    } else {
      // Return all countries so the frontend can build a combined blocked-dates set
      sql = 'SELECT date, name, country, is_federal FROM bank_holidays WHERE year = $1 ORDER BY date';
      params = [targetYear];
    }

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting holidays', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

// GET /api/calendar/holidays/all — fetch all holidays for multiple years (for calendar picker)
router.get('/holidays/all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT date, name, country, is_federal FROM bank_holidays ORDER BY date'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting all holidays', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * Parse a YYYY-MM-DD string into year/month/day parts without timezone shift.
 * Using new Date('2026-07-04') can shift to July 3 in western timezones because
 * date-only strings are parsed as UTC midnight.
 */
function parseDateParts(dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Use UTC constructor to avoid timezone shift, then get UTC day of week
  const utc = new Date(Date.UTC(y, m - 1, d));
  return { year: y, month: m, day: d, dayOfWeek: utc.getUTCDay() };
}

// GET /api/calendar/validate/:date — check if a date is a business day
router.get('/validate/:date', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date } = req.params;
    const { dayOfWeek } = parseDateParts(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Only US holidays block payments; Canadian holidays are informational
    const { rows } = await query(
      'SELECT name, country FROM bank_holidays WHERE date = $1',
      [date]
    );
    const isHoliday = rows.some((r: { country: string }) => r.country === 'USA');
    const holidayNames = rows.map((r: { name: string; country: string }) =>
      `${r.name} (${r.country === 'CAN' ? 'Canada' : 'US'})`
    );
    const isBusinessDay = !isWeekend && !isHoliday;

    // Find next business day if this isn't one
    let nextBusinessDay: string | null = null;
    if (!isBusinessDay) {
      nextBusinessDay = await findNextBusinessDay(date);
    }

    res.json({
      success: true,
      data: {
        date,
        isBusinessDay,
        isWeekend,
        isHoliday,
        holidayName: isHoliday ? holidayNames.join('; ') : null,
        nextBusinessDay,
      },
    });
  } catch (error) {
    logger.error('Error validating date', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

// GET /api/calendar/next-business-day — find next valid business day
router.get('/next-business-day', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from } = req.query;
    const fromDate = from ? String(from) : new Date().toISOString().split('T')[0];
    const result = await findNextBusinessDay(fromDate);
    res.json({ success: true, data: { nextBusinessDay: result } });
  } catch (error) {
    logger.error('Error getting next business day', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

// GET /api/calendar/batch-windows — get batch processing windows
router.get('/batch-windows', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM batch_windows WHERE is_active = 1 ORDER BY cutoff_time');
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting batch windows', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * Find the next business day starting from (but not including) the given date.
 * Searches up to 14 days forward.
 */
async function findNextBusinessDay(fromDateStr: string): Promise<string | null> {
  // Load all holidays in the search window
  const { rows: holidays } = await query(
    `SELECT date FROM bank_holidays WHERE date >= $1 AND date <= date($1, '+14 days') AND country = 'USA'`,
    [fromDateStr]
  );
  const holidayDates = new Set(holidays.map((h: { date: string }) => h.date));

  // Parse the starting date
  const [y, m, d] = fromDateStr.split('-').map(Number);
  const current = new Date(Date.UTC(y, m - 1, d));

  for (let i = 1; i <= 14; i++) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dow = current.getUTCDay();
    const dateStr = current.toISOString().split('T')[0];
    if (dow !== 0 && dow !== 6 && !holidayDates.has(dateStr)) {
      return dateStr;
    }
  }
  return null;
}

export default router;
