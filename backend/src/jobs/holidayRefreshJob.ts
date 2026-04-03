import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

/**
 * Official Federal Reserve K.8 holidays.
 * https://www.federalreserve.gov/aboutthefed/k8.htm
 *
 * When a holiday falls on Saturday, the preceding Friday is observed.
 * When a holiday falls on Sunday, the following Monday is observed.
 */

interface FedHoliday {
  date: string;   // YYYY-MM-DD (observed date)
  name: string;
}

/**
 * Attempt to fetch and parse the Federal Reserve K.8 holiday page for the
 * given year.  Returns an array of { date, name } or null on failure.
 */
async function fetchK8Holidays(year: number): Promise<FedHoliday[] | null> {
  try {
    const url = 'https://www.federalreserve.gov/aboutthefed/k8.htm';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GustoTreasuryPortal/1.0 (holiday-refresh)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      logger.error(`K.8 fetch failed: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();
    return parseK8Html(html, year);
  } catch (error) {
    logger.error('K.8 fetch error', { error: (error as Error).message });
    return null;
  }
}

/**
 * Parse the K.8 HTML page.  The Fed page contains a table with rows like:
 *   <td>January 1</td><td>New Year's Day</td>
 * We look for the section covering the target year and extract dates.
 */
function parseK8Html(html: string, year: number): FedHoliday[] | null {
  const holidays: FedHoliday[] = [];

  // The Fed page lists holidays in a table.  Each row typically has
  // a date cell (e.g. "January 1") and a name cell (e.g. "New Year's Day").
  // We use a broad regex to capture month + day pairs near holiday names.
  const monthNames: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };

  // Match patterns like "January 1" or "January 19" inside table cells
  // The Fed page uses <td> elements, sometimes with asterisks for observed dates
  const cellPattern = /<td[^>]*>\s*(?:<[^>]+>\s*)*([A-Za-z]+)\s+(\d{1,2})\s*\*?\s*(?:<[^>]+>\s*)*<\/td>/gi;
  let match;
  const yearStr = String(year);

  // Check if this year is actually present on the page
  if (!html.includes(yearStr)) {
    logger.warn(`Year ${year} not found on K.8 page`);
    return null;
  }

  // Try to isolate the section for the target year
  // The Fed page typically has year headers; find content between this year and next
  const yearIdx = html.indexOf(yearStr);
  const nextYearIdx = html.indexOf(String(year + 1), yearIdx + 4);
  const section = nextYearIdx > yearIdx
    ? html.slice(yearIdx, nextYearIdx)
    : html.slice(yearIdx);

  while ((match = cellPattern.exec(section)) !== null) {
    const monthStr = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const monthNum = monthNames[monthStr];
    if (!monthNum || day < 1 || day > 31) continue;

    const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Try to find the holiday name in the next <td> after this match
    const afterMatch = section.slice(match.index + match[0].length);
    const nameMatch = afterMatch.match(/<td[^>]*>\s*(?:<[^>]+>\s*)*([^<]+)/);
    const name = nameMatch ? nameMatch[1].replace(/\s*\*.*$/, '').trim() : 'Federal Holiday';

    if (name && !holidays.some(h => h.date === dateStr)) {
      holidays.push({ date: dateStr, name });
    }
  }

  if (holidays.length < 8) {
    // Federal Reserve always has 11 holidays; if we parsed fewer than 8 something went wrong
    logger.warn(`K.8 parse returned only ${holidays.length} holidays for ${year} — likely parse error`);
    return null;
  }

  return holidays;
}

/**
 * Insert parsed holidays into bank_holidays using INSERT OR IGNORE.
 * Returns the count of newly inserted rows.
 */
async function insertHolidays(holidays: FedHoliday[], year: number): Promise<number> {
  let inserted = 0;
  for (const h of holidays) {
    const { rowCount } = await query(
      `INSERT OR IGNORE INTO bank_holidays (date, name, country, year, is_federal) VALUES ($1, $2, 'USA', $3, 1)`,
      [h.date, h.name, year]
    );
    if (rowCount > 0) inserted++;
  }
  return inserted;
}

/**
 * Log a result to system_change_log.
 */
async function logChange(description: string): Promise<void> {
  await query(
    `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, affected_component)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['System', 'Holiday Schedule Update', description, 'system', 'System (Auto)', 'bank_holidays']
  );
}

/**
 * Send an alert notification to treasury admins.
 */
async function sendAdminAlert(subject: string, body: string): Promise<void> {
  // Insert an in-app notification visible to admins
  await query(
    `INSERT INTO notifications (type, channel, subject, body, status, created_at)
     VALUES ($1, $2, $3, $4, $5, datetime('now'))`,
    ['holiday_refresh_alert', 'in_app', subject, body, 'generated']
  );
}

/**
 * Main job: fetch K.8 holidays for the NEXT year and insert them.
 * Designed to run on December 1st each year via cron.
 * Can also be called manually with an explicit targetYear.
 */
export async function runHolidayRefreshJob(targetYear?: number): Promise<void> {
  const year = targetYear ?? new Date().getFullYear() + 1;
  logger.info(`Holiday refresh job started for year ${year}`);

  const holidays = await fetchK8Holidays(year);

  if (!holidays) {
    const msg = `Failed to fetch/parse Federal Reserve K.8 holidays for ${year}. Manual update required.`;
    logger.error(msg);
    await logChange(msg);
    await sendAdminAlert(
      `[Treasury Portal] Holiday Refresh Failed — ${year}`,
      `<p>The automatic Federal Reserve K.8 holiday refresh for <strong>${year}</strong> failed.</p>
       <p>Please manually verify and update the bank holidays table at
       <a href="https://www.federalreserve.gov/aboutthefed/k8.htm">federalreserve.gov/aboutthefed/k8.htm</a>.</p>`
    );
    return;
  }

  const inserted = await insertHolidays(holidays, year);
  const msg = `Auto-fetched Federal Reserve K.8 holidays for ${year}: ${holidays.length} holidays found, ${inserted} new records inserted`;
  logger.info(msg);
  await logChange(msg);
}
