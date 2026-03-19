import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';
import { google, sheets_v4 } from 'googleapis';

// Google Sheets IDs
const CASH_SPREADSHEET_ID = '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE';
const FORECAST_SPREADSHEET_ID = '1Byfis_uaLgWIjRmKGb6G5ROxPwRIF62TdhacOXRa890';

// Runlayer MCP proxy endpoint
const RUNLAYER_MCP_URL = 'https://gusto.runlayer.com/api/v1/proxy/67c072b8-017b-4ef2-96ac-e5c1b3c5a0be/mcp';

// ── MCP Proxy approach (primary) ──────────────────────────────────────────────

let mcpRequestId = 0;

async function mcpCall(method: string, params: Record<string, any> = {}): Promise<any> {
  const token = process.env.RUNLAYER_ACCESS_TOKEN;
  if (!token) throw new Error('RUNLAYER_ACCESS_TOKEN not set');

  const body = { jsonrpc: '2.0', id: ++mcpRequestId, method, params };
  const res = await fetch(RUNLAYER_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MCP proxy error (${res.status}): ${errText}`);
  }

  const json = await res.json() as any;
  if (json.error) {
    throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
  }
  return json.result;
}

/** Discover the Google Sheets read tool from the MCP server */
async function findSheetsReadTool(): Promise<string> {
  const result = await mcpCall('tools/list');
  const tools: Array<{ name: string; description?: string }> = result?.tools || [];

  logger.info(`MCP tools available: ${tools.map(t => t.name).join(', ')}`);

  // Look for a tool that reads spreadsheet values — common names across MCP GSheets implementations
  const candidates = [
    'get_spreadsheet_values', 'read_spreadsheet', 'sheets_get_values',
    'google_sheets_read', 'get_values', 'read_sheet', 'spreadsheet_read',
    'sheets_read', 'get_sheet_data', 'read_google_sheet',
  ];

  for (const name of candidates) {
    if (tools.find(t => t.name === name)) return name;
  }

  // Fuzzy match: any tool name containing 'sheet' and ('read' or 'get' or 'value')
  const fuzzy = tools.find(t => {
    const n = t.name.toLowerCase();
    return n.includes('sheet') && (n.includes('read') || n.includes('get') || n.includes('value'));
  });
  if (fuzzy) return fuzzy.name;

  // If there's only one tool (besides help), use it
  const nonHelp = tools.filter(t => !t.name.includes('help'));
  if (nonHelp.length === 1) return nonHelp[0].name;

  throw new Error(`No Google Sheets read tool found. Available tools: ${tools.map(t => t.name).join(', ')}`);
}

async function fetchSheetDataViaMcp(spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  logger.info(`[MCP] Fetching sheet "${sheetName}" from spreadsheet ${spreadsheetId.substring(0, 12)}...`);

  // Initialize MCP session
  await mcpCall('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'gusto-treasury-backend', version: '1.0' },
  });

  const toolName = await findSheetsReadTool();
  logger.info(`[MCP] Using tool: ${toolName}`);

  const result = await mcpCall('tools/call', {
    name: toolName,
    arguments: {
      spreadsheet_id: spreadsheetId,
      spreadsheetId: spreadsheetId,
      range: sheetName,
      sheet_name: sheetName,
      sheetName: sheetName,
    },
  });

  // MCP tools return content as an array of content blocks
  let values: any[][] = [];
  const content = result?.content || [];
  for (const block of content) {
    if (block.type === 'text') {
      try {
        const parsed = JSON.parse(block.text);
        if (Array.isArray(parsed)) {
          values = parsed;
        } else if (parsed.values && Array.isArray(parsed.values)) {
          values = parsed.values;
        }
      } catch {
        // If it's CSV-like text, parse rows
        const lines = block.text.split('\n').filter((l: string) => l.trim());
        values = lines.map((l: string) => l.split(',').map((c: string) => {
          const trimmed = c.trim();
          const num = Number(trimmed);
          return isNaN(num) ? trimmed : num;
        }));
      }
    }
  }

  const maxCols = values.reduce((m: number, r: any[]) => Math.max(m, r?.length || 0), 0);
  logger.info(`[MCP] Fetched ${values.length} rows from "${sheetName}", max width: ${maxCols} columns`);
  return values.length > 0 ? values : null;
}

// ── googleapis SDK approach (fallback) ────────────────────────────────────────

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (keyFile) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      logger.info('Using Google service account key file for Sheets auth');
      return google.sheets({ version: 'v4', auth });
    } catch (e) {
      logger.warn(`Failed to load service account key file: ${(e as Error).message}`);
    }
  }

  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyJson) {
    try {
      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      logger.info('Using Google service account key from env var for Sheets auth');
      return google.sheets({ version: 'v4', auth });
    } catch (e) {
      logger.warn(`Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${(e as Error).message}`);
    }
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) {
    logger.info('Using Google API key for Sheets auth');
    return google.sheets({ version: 'v4', auth: apiKey });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    await auth.getClient();
    logger.info('Using Application Default Credentials for Sheets auth');
    return google.sheets({ version: 'v4', auth });
  } catch (e) {
    // ADC not available
  }

  throw new Error(
    'No Google Sheets credentials found. Set RUNLAYER_ACCESS_TOKEN for MCP proxy, ' +
    'or one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_KEY, ' +
    'GOOGLE_SHEETS_API_KEY, or configure ADC (gcloud auth application-default login)'
  );
}

async function fetchSheetDataViaApi(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  logger.info(`[API] Fetching sheet "${sheetName}" from spreadsheet ${spreadsheetId.substring(0, 12)}...`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });

  const values = response.data.values || [];
  const maxCols = values.reduce((m: number, r: any[]) => Math.max(m, r?.length || 0), 0);
  logger.info(`[API] Fetched ${values.length} rows from "${sheetName}", max width: ${maxCols} columns`);
  return values;
}

// ── Unified fetch with MCP-first fallback ─────────────────────────────────────

type SheetFetcher = (spreadsheetId: string, sheetName: string) => Promise<any[][] | null>;

async function createSheetFetcher(): Promise<SheetFetcher> {
  // 1. Try Runlayer MCP proxy
  if (process.env.RUNLAYER_ACCESS_TOKEN) {
    logger.info('RUNLAYER_ACCESS_TOKEN is set — using MCP proxy for Google Sheets');
    return fetchSheetDataViaMcp;
  }

  // 2. Fall back to googleapis SDK
  logger.info('RUNLAYER_ACCESS_TOKEN not set — trying googleapis SDK fallback');
  const sheets = await getSheetsClient();
  return (spreadsheetId: string, sheetName: string) => fetchSheetDataViaApi(sheets, spreadsheetId, sheetName);
}

// ── Date parsing helpers ──────────────────────────────────────────────────────

function parseExcelDate(serial: number): string | null {
  if (!serial || serial < 1) return null;
  const utcDays = serial - 25569;
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

// ── Ingestion functions ───────────────────────────────────────────────────────

async function ingestCashBalances(fetchSheet: SheetFetcher, sheetName: string, accountType: 'corporate' | 'customer', maxDays: number = 30): Promise<number> {
  const rows = await fetchSheet(CASH_SPREADSHEET_ID, sheetName);
  if (!rows || rows.length < 5) {
    logger.warn(`No data found in sheet ${sheetName}`);
    return 0;
  }

  const { rowIdx: headerRowIdx, dateStartCol } = findHeaderRow(rows);

  if (headerRowIdx < 0 || dateStartCol < 0) {
    logger.warn(`Could not find date header row in ${sheetName}`);
    return 0;
  }

  logger.info(`${sheetName}: header row index=${headerRowIdx}, date start col=${dateStartCol}`);

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

  const recentDates = dateColumns.slice(-maxDays);
  logger.info(`${sheetName}: ingesting ${recentDates.length} most recent dates (${recentDates[0]?.date} to ${recentDates[recentDates.length - 1]?.date})`);

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

async function ingestCorpForecast(fetchSheet: SheetFetcher, maxWeeks: number = 8): Promise<number> {
  const rows = await fetchSheet(FORECAST_SPREADSHEET_ID, 'Forecast');
  if (!rows || rows.length < 3) {
    logger.warn('No data found in Forecast sheet');
    return 0;
  }

  let dateStartCol = 7;
  let headerRowIdx = 0;

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

export async function runTreasuryDataIngestion(): Promise<{ corporate: number; customer: number; forecast: number }> {
  logger.info('Treasury data ingestion job started');
  const results = { corporate: 0, customer: 0, forecast: 0 };

  let fetchSheet: SheetFetcher;
  try {
    fetchSheet = await createSheetFetcher();
  } catch (error) {
    const msg = (error as Error).message;
    logger.error(msg);
    logIngestion('cash_balances', 'corporate_cash_gsheet', 0, 'error', msg);
    logIngestion('cash_balances', 'customer_cash_gsheet', 0, 'error', msg);
    logIngestion('corp_forecast', 'corp_forecast_gsheet', 0, 'error', msg);
    return results;
  }

  // Corporate Cash
  try {
    results.corporate = await ingestCashBalances(fetchSheet, 'Corporate Cash Position', 'corporate');
    logIngestion('cash_balances', 'corporate_cash_gsheet', results.corporate, results.corporate > 0 ? 'success' : 'no_data');
    logger.info(`Ingested ${results.corporate} corporate cash balance records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('cash_balances', 'corporate_cash_gsheet', 0, 'error', msg);
    logger.error('Corporate cash ingestion failed', { error: msg });
  }

  // Customer Cash (Gustomer)
  try {
    results.customer = await ingestCashBalances(fetchSheet, 'Gustomer Cash Position', 'customer');
    logIngestion('cash_balances', 'customer_cash_gsheet', results.customer, results.customer > 0 ? 'success' : 'no_data');
    logger.info(`Ingested ${results.customer} customer cash balance records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('cash_balances', 'customer_cash_gsheet', 0, 'error', msg);
    logger.error('Customer cash ingestion failed', { error: msg });
  }

  // Corporate Cash Forecast
  try {
    results.forecast = await ingestCorpForecast(fetchSheet);
    logIngestion('corp_forecast', 'corp_forecast_gsheet', results.forecast, results.forecast > 0 ? 'success' : 'no_data');
    logger.info(`Ingested ${results.forecast} corporate forecast records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('corp_forecast', 'corp_forecast_gsheet', 0, 'error', msg);
    logger.error('Corporate forecast ingestion failed', { error: msg });
  }

  const total = results.corporate + results.customer + results.forecast;
  logger.info(`Treasury data ingestion completed: ${total} total records (corp=${results.corporate}, cust=${results.customer}, forecast=${results.forecast})`);
  return results;
}
