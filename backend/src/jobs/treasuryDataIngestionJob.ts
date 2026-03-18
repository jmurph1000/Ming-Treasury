import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

// Google Sheets IDs
const CASH_SPREADSHEET_ID = '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE';
const FORECAST_SPREADSHEET_ID = '1Byfis_uaLgWIjRmKGb6G5ROxPwRIF62TdhacOXRa890';

// Google Sheets API key from env
function getApiKey(): string | null {
  return process.env.GOOGLE_SHEETS_API_KEY || null;
}

async function fetchSheetData(spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn('GOOGLE_SHEETS_API_KEY not set — skipping GSheet ingestion');
    return null;
  }

  const range = encodeURIComponent(`'${sheetName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.values || [];
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

function isSkipRow(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  const lower = name.trim().toLowerCase();
  return lower === '' || lower.includes('total') || lower.includes('subtotal') || lower.startsWith('corporate cash') || lower.startsWith('gustomer cash') || lower.startsWith('previous');
}

async function ingestCashBalances(sheetName: string, accountType: 'corporate' | 'customer', maxDays: number = 30): Promise<number> {
  const rows = await fetchSheetData(CASH_SPREADSHEET_ID, sheetName);
  if (!rows || rows.length < 5) {
    logger.warn(`No data found in sheet ${sheetName}`);
    return 0;
  }

  // Find the header row with dates (usually row index 3, i.e. row 4 in the sheet)
  let headerRowIdx = -1;
  let dateStartCol = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 1; j < row.length; j++) {
      const val = row[j];
      // Check if it's a number that looks like an Excel date serial (> 40000 = ~2009+)
      if (typeof val === 'number' && val > 40000 && val < 60000) {
        headerRowIdx = i;
        dateStartCol = j;
        break;
      }
      // Also check for date strings
      if (typeof val === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(val.trim())) {
        headerRowIdx = i;
        dateStartCol = j;
        break;
      }
    }
    if (headerRowIdx >= 0) break;
  }

  if (headerRowIdx < 0) {
    logger.warn(`Could not find date header row in ${sheetName}`);
    return 0;
  }

  // Parse date columns
  const headerRow = rows[headerRowIdx];
  const dateColumns: { col: number; date: string }[] = [];
  for (let j = dateStartCol; j < headerRow.length; j++) {
    const val = headerRow[j];
    let dateStr: string | null = null;
    if (typeof val === 'number') {
      dateStr = parseExcelDate(val);
    } else if (typeof val === 'string') {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        dateStr = parsed.toISOString().split('T')[0];
      }
    }
    if (dateStr) {
      dateColumns.push({ col: j, date: dateStr });
    }
  }

  // Take the most recent N date columns (up to maxDays worth of unique dates)
  const recentDates = dateColumns.slice(-maxDays);

  // UPSERT data rows
  const upsert = db.prepare(`
    INSERT INTO cash_balance_snapshots (account_name, account_type, balance_date, balance, currency, source, ingested_at)
    VALUES (?, ?, ?, ?, 'USD', 'treasury_flash_gsheet', datetime('now'))
    ON CONFLICT(account_name, balance_date) DO UPDATE SET
      balance = excluded.balance,
      account_type = excluded.account_type,
      ingested_at = datetime('now')
  `);

  let count = 0;
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const accountName = String(row[0]).trim();
    if (isSkipRow(accountName)) continue;

    for (const { col, date } of recentDates) {
      const val = row[col];
      if (val == null || val === '' || val === '-') continue;
      const balance = typeof val === 'number' ? val : parseFloat(String(val).replace(/[,$]/g, ''));
      if (isNaN(balance)) continue;

      upsert.run(accountName, accountType, date, balance);
      count++;
    }
  }

  return count;
}

async function ingestCorpForecast(maxWeeks: number = 8): Promise<number> {
  const rows = await fetchSheetData(FORECAST_SPREADSHEET_ID, 'Forecast');
  if (!rows || rows.length < 3) {
    logger.warn('No data found in Forecast sheet');
    return 0;
  }

  // Column C (idx 2) = account names, Column F (idx 5) = min balance,
  // Column G (idx 6) = responsible person, Date columns start from H (idx 7)
  const headerRow = rows[0] || rows[1]; // Try first two rows for headers
  const dateStartCol = 7; // Column H

  // Parse date columns from header
  const dateColumns: { col: number; date: string }[] = [];
  if (headerRow) {
    for (let j = dateStartCol; j < headerRow.length; j++) {
      const val = headerRow[j];
      let dateStr: string | null = null;
      if (typeof val === 'number') {
        dateStr = parseExcelDate(val);
      } else if (typeof val === 'string') {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString().split('T')[0];
      }
      if (dateStr) dateColumns.push({ col: j, date: dateStr });
    }
  }

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
  for (let i = 1; i < rows.length; i++) {
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
