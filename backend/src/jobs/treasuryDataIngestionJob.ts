import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

// Google Sheets IDs
const CASH_SPREADSHEET_ID = '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE';
const FORECAST_SPREADSHEET_ID = '1Byfis_uaLgWIjRmKGb6G5ROxPwRIF62TdhacOXRa890';

// Google Sheets API key from env
function getApiKey(): string | null {
  return process.env.GOOGLE_SHEETS_API_KEY || null;
}

/**
 * Fetch sheet data. Uses the full sheet range to ensure all columns are returned,
 * including hundreds of date columns extending to the right.
 */
async function fetchSheetData(spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('GOOGLE_SHEETS_API_KEY not set — skipping GSheet ingestion');
    return null;
  }

  // Use A1:ZZZ1000 to ensure we capture all columns (sheets can have hundreds of date columns)
  const range = encodeURIComponent(`'${sheetName}'!A1:ZZZ1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const values = data.values || [];
  logger.info(`Fetched ${values.length} rows from "${sheetName}", max columns: ${values.reduce((m: number, r: any[]) => Math.max(m, r?.length || 0), 0)}`);
  return values;
}

function parseExcelDate(serial: number): string | null {
  if (!serial || serial < 1) return null;
  // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
  const utcDays = serial - 25569; // offset to Unix epoch
  const ms = utcDays * 86400000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function isDateValue(val: any): boolean {
  if (typeof val === 'number' && val > 40000 && val < 60000) return true;
  if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(val.trim())) return true;
  return false;
}

function parseDateValue(val: any): string | null {
  if (typeof val === 'number') return parseExcelDate(val);
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  }
  return null;
}

function isSkipRow(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  const lower = name.trim().toLowerCase();
  return lower === '' || lower.includes('total') || lower.includes('subtotal') || lower.startsWith('corporate cash') || lower.startsWith('gustomer cash') || lower.startsWith('previous');
}

/**
 * Find the header row containing date values by scanning first 10 rows.
 * Pick the row with the MOST date-like values (handles sheets where row 3 or 4 has dates).
 */
function findHeaderRow(rows: any[][]): { rowIdx: number; dateStartCol: number } {
  let bestRowIdx = -1;
  let bestDateCount = 0;
  let bestDateStartCol = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    let dateCount = 0;
    let firstDateCol = -1;
    for (let j = 1; j < row.length; j++) {
      if (isDateValue(row[j])) {
        dateCount++;
        if (firstDateCol < 0) firstDateCol = j;
      }
    }
    if (dateCount > bestDateCount) {
      bestDateCount = dateCount;
      bestRowIdx = i;
      bestDateStartCol = firstDateCol;
    }
  }

  return { rowIdx: bestRowIdx, dateStartCol: bestDateStartCol };
}

async function ingestCashBalances(sheetName: string, accountType: 'corporate' | 'customer', maxDays: number = 30): Promise<number> {
  const rows = await fetchSheetData(CASH_SPREADSHEET_ID, sheetName);
  if (!rows || rows.length < 5) {
    logger.warn(`No data found in sheet ${sheetName}`);
    return 0;
  }

  // Find the header row with the most date values
  const { rowIdx: headerRowIdx, dateStartCol } = findHeaderRow(rows);

  if (headerRowIdx < 0 || dateStartCol < 0) {
    logger.warn(`Could not find date header row in ${sheetName}`);
    return 0;
  }

  logger.info(`${sheetName}: header row index=${headerRowIdx}, date start col=${dateStartCol}`);

  // Parse ALL date columns from the header row
  const headerRow = rows[headerRowIdx];
  const dateColumns: { col: number; date: string }[] = [];
  for (let j = dateStartCol; j < headerRow.length; j++) {
    const dateStr = parseDateValue(headerRow[j]);
    if (dateStr) {
      dateColumns.push({ col: j, date: dateStr });
    }
  }

  logger.info(`${sheetName}: found ${dateColumns.length} date columns, earliest: ${dateColumns[0]?.date}, latest: ${dateColumns[dateColumns.length - 1]?.date}`);

  if (dateColumns.length === 0) {
    logger.warn(`No parseable date columns found in ${sheetName}`);
    return 0;
  }

  // Take the RIGHTMOST N date columns (most recent dates)
  const recentDates = dateColumns.slice(-maxDays);
  logger.info(`${sheetName}: ingesting ${recentDates.length} most recent dates (${recentDates[0]?.date} to ${recentDates[recentDates.length - 1]?.date})`);

  // UPSERT data rows
  const upsert = db.prepare(`
    INSERT INTO cash_balance_snapshots (account_name, account_type, balance_date, balance, currency, bank, source, ingested_at)
    VALUES (?, ?, ?, ?, 'USD', ?, 'treasury_flash_gsheet', datetime('now'))
    ON CONFLICT(account_name, balance_date) DO UPDATE SET
      balance = excluded.balance,
      account_type = excluded.account_type,
      bank = COALESCE(excluded.bank, bank),
      ingested_at = datetime('now')
  `);

  let count = 0;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const accountName = String(row[0]).trim();
    if (isSkipRow(accountName)) continue;

    // Try to extract bank name from account name (e.g., "Chase AP -9329" → "JPMorgan Chase")
    const bank = extractBankName(accountName);

    for (const { col, date } of recentDates) {
      const val = row[col];
      if (val == null || val === '' || val === '-') continue;
      const balance = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
      if (isNaN(balance)) continue;

      upsert.run(accountName, accountType, date, balance, bank);
      count++;
    }
  }

  logger.info(`${sheetName}: upserted ${count} balance records`);
  return count;
}

function extractBankName(accountName: string): string | null {
  const lower = accountName.toLowerCase();
  if (lower.includes('chase') || lower.includes('jpm')) return 'JPMorgan Chase';
  if (lower.includes('bofa') || lower.includes('bank of america') || lower.includes('b of a')) return 'Bank of America';
  if (lower.includes('citi')) return 'Citibank';
  if (lower.includes('wells')) return 'Wells Fargo';
  if (lower.includes('goldman') || lower.includes('gs ')) return 'Goldman Sachs';
  if (lower.includes('morgan stanley') || lower.includes('ms ')) return 'Morgan Stanley';
  if (lower.includes('bnp')) return 'BNP Paribas';
  if (lower.includes('silicon valley') || lower.includes('svb')) return 'Silicon Valley Bank';
  if (lower.includes('fifth third')) return 'Fifth Third Bank';
  if (lower.includes('pnc')) return 'PNC Bank';
  if (lower.includes('us bank') || lower.includes('usb')) return 'US Bank';
  return null;
}

async function ingestCorpForecast(maxWeeks: number = 8): Promise<number> {
  const rows = await fetchSheetData(FORECAST_SPREADSHEET_ID, 'Forecast');
  if (!rows || rows.length < 3) {
    logger.warn('No data found in Forecast sheet');
    return 0;
  }

  // Column C (idx 2) = account names, Column F (idx 5) = min balance,
  // Column G (idx 6) = responsible person, Date columns start from H (idx 7)
  // But scan for the actual header row with dates
  let dateStartCol = 7;
  let headerRowIdx = 0;

  // Try to find the header row with dates in the first 5 rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 5; j < row.length; j++) {
      if (isDateValue(row[j])) {
        headerRowIdx = i;
        dateStartCol = j;
        break;
      }
    }
    if (headerRowIdx > 0 || dateStartCol !== 7) break;
  }

  const headerRow = rows[headerRowIdx];

  // Parse date columns from header
  const dateColumns: { col: number; date: string }[] = [];
  if (headerRow) {
    for (let j = dateStartCol; j < headerRow.length; j++) {
      const dateStr = parseDateValue(headerRow[j]);
      if (dateStr) dateColumns.push({ col: j, date: dateStr });
    }
  }

  logger.info(`Forecast: found ${dateColumns.length} date columns, taking last ${maxWeeks}`);

  const recentDates = dateColumns.slice(-maxWeeks);

  const upsert = db.prepare(`
    INSERT INTO corp_forecast_snapshots (account_name, forecast_date, forecast_amount, min_balance, responsible_person, source, ingested_at)
    VALUES (?, ?, ?, ?, ?, 'corp_forecast_gsheet', datetime('now'))
    ON CONFLICT(account_name, forecast_date) DO UPDATE SET
      forecast_amount = excluded.forecast_amount,
      min_balance = excluded.min_balance,
      responsible_person = excluded.responsible_person,
      ingested_at = datetime('now')
  `);

  let count = 0;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const accountName = row[2] ? String(row[2]).trim() : '';
    if (isSkipRow(accountName)) continue;

    const minBalance = typeof row[5] === 'number' ? row[5] : null;
    const responsible = row[6] ? String(row[6]).trim() : null;

    for (const { col, date } of recentDates) {
      const val = row[col];
      if (val == null || val === '' || val === '-') continue;
      const amount = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
      if (isNaN(amount)) continue;

      upsert.run(accountName, date, amount, minBalance, responsible);
      count++;
    }
  }

  logger.info(`Forecast: upserted ${count} records`);
  return count;
}

function logIngestion(module: string, source: string, recordsIngested: number, status: string, errorMessage?: string) {
  db.prepare(`
    INSERT INTO treasury_ingestion_log (module, source, records_ingested, status, error_message, ingested_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(module, source, recordsIngested, status, errorMessage || null);
}

export async function runTreasuryDataIngestion(): Promise<void> {
  logger.info('Treasury data ingestion job started');

  // Corporate Cash
  try {
    const count = await ingestCashBalances('Corporate Cash Position', 'corporate');
    logIngestion('cash_balances', 'corporate_cash_gsheet', count, 'success');
    logger.info(`Ingested ${count} corporate cash balance records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('cash_balances', 'corporate_cash_gsheet', 0, 'error', msg);
    logger.error('Corporate cash ingestion failed', { error: msg });
  }

  // Customer Cash (Gustomer)
  try {
    const count = await ingestCashBalances('Gustomer Cash Position', 'customer');
    logIngestion('cash_balances', 'customer_cash_gsheet', count, 'success');
    logger.info(`Ingested ${count} customer cash balance records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('cash_balances', 'customer_cash_gsheet', 0, 'error', msg);
    logger.error('Customer cash ingestion failed', { error: msg });
  }

  // Corporate Cash Forecast
  try {
    const count = await ingestCorpForecast();
    logIngestion('corp_forecast', 'corp_forecast_gsheet', count, 'success');
    logger.info(`Ingested ${count} corporate forecast records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('corp_forecast', 'corp_forecast_gsheet', 0, 'error', msg);
    logger.error('Corporate forecast ingestion failed', { error: msg });
  }

  logger.info('Treasury data ingestion job completed');
}
