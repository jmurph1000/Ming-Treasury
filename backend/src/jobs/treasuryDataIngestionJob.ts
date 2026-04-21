import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Google Sheets IDs
const CASH_SPREADSHEET_ID = '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE';
const FORECAST_SPREADSHEET_ID = '1Byfis_uaLgWIjRmKGb6G5ROxPwRIF62TdhacOXRa890';

// Runlayer MCP proxy
const RUNLAYER_MCP_URL = 'https://gusto.runlayer.com/api/v1/proxy/67c072b8-017b-4ef2-96ac-e5c1b3c5a0be/mcp';

// ── Get Runlayer access token ─────────────────────────────────────────────────

function getRunlayerToken(): string | null {
  // 1. Env var (set manually or by scripts/runlayer-auth.mjs)
  if (process.env.RUNLAYER_ACCESS_TOKEN) {
    return process.env.RUNLAYER_ACCESS_TOKEN;
  }

  // 2. Token file saved by auth script
  const tokenFile = resolve(process.cwd(), '.runlayer-token.json');
  if (existsSync(tokenFile)) {
    try {
      const data = JSON.parse(readFileSync(tokenFile, 'utf8'));
      if (data.access_token && data.expires_at > Date.now()) {
        return data.access_token;
      }
      // Token expired — try refresh
      if (data.refresh_token && data.client_id) {
        logger.info('Runlayer token expired, will attempt refresh');
        return null; // Refresh handled async in getRunlayerTokenAsync
      }
    } catch (e) {
      logger.warn(`Failed to read .runlayer-token.json: ${(e as Error).message}`);
    }
  }

  // 3. Claude Code's stored credentials
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const credsFile = resolve(home, '.claude', '.credentials.json');
  if (existsSync(credsFile)) {
    try {
      const creds = JSON.parse(readFileSync(credsFile, 'utf8'));
      const entries = creds?.mcpOAuth || {};
      for (const [key, val] of Object.entries(entries) as [string, any][]) {
        if (key.startsWith('gsheets') && val.accessToken) {
          if (!val.expiresAt || val.expiresAt > Date.now()) {
            logger.info('Using access token from Claude Code credentials');
            return val.accessToken;
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  return null;
}

async function refreshRunlayerToken(): Promise<string | null> {
  const tokenFile = resolve(process.cwd(), '.runlayer-token.json');
  if (!existsSync(tokenFile)) return null;

  try {
    const data = JSON.parse(readFileSync(tokenFile, 'utf8'));
    if (!data.refresh_token || !data.client_id) return null;

    const res = await fetch('https://gusto.runlayer.com/api/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: data.refresh_token,
        client_id: data.client_id,
      }).toString(),
    });

    const tokenData = await res.json() as any;
    if (tokenData.access_token) {
      const { writeFileSync } = await import('fs');
      writeFileSync(tokenFile, JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || data.refresh_token,
        expires_at: Date.now() + (tokenData.expires_in || 3600) * 1000,
        client_id: data.client_id,
      }, null, 2));
      logger.info('Runlayer token refreshed successfully');
      return tokenData.access_token;
    }
  } catch (e) {
    logger.warn(`Failed to refresh Runlayer token: ${(e as Error).message}`);
  }
  return null;
}

// ── MCP JSON-RPC calls ────────────────────────────────────────────────────────

let mcpRequestId = 0;

async function mcpCall(token: string, method: string, params: Record<string, any> = {}): Promise<any> {
  const body = { jsonrpc: '2.0', id: ++mcpRequestId, method, params };
  const res = await fetch(RUNLAYER_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

async function discoverSheetsTool(token: string): Promise<string> {
  const result = await mcpCall(token, 'tools/list');
  const tools: Array<{ name: string }> = result?.tools || [];
  logger.info(`MCP tools available: ${tools.map(t => t.name).join(', ')}`);

  // Match common GSheets tool names
  const candidates = [
    'fetch', 'get_spreadsheet_values', 'read_spreadsheet', 'sheets_get_values',
    'google_sheets_read', 'get_values', 'read_sheet', 'get_sheet_data',
  ];
  for (const name of candidates) {
    if (tools.find(t => t.name === name)) return name;
  }

  // Fuzzy match
  const fuzzy = tools.find(t => {
    const n = t.name.toLowerCase();
    return n.includes('sheet') && (n.includes('read') || n.includes('get') || n.includes('value'));
  });
  if (fuzzy) return fuzzy.name;

  const nonHelp = tools.filter(t => !t.name.includes('help'));
  if (nonHelp.length === 1) return nonHelp[0].name;

  throw new Error(`No Sheets read tool found. Available: ${tools.map(t => t.name).join(', ')}`);
}

async function fetchSheetDataViaMcp(token: string, spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  logger.info(`[MCP] Fetching "${sheetName}" from ${spreadsheetId.substring(0, 12)}...`);

  await mcpCall(token, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'gusto-treasury-backend', version: '1.0' },
  });

  const toolName = await discoverSheetsTool(token);
  logger.info(`[MCP] Using tool: ${toolName}`);

  const result = await mcpCall(token, 'tools/call', {
    name: toolName,
    arguments: {
      spreadsheet_id: spreadsheetId,
      spreadsheetId: spreadsheetId,
      range: sheetName,
      sheet_name: sheetName,
      sheetName: sheetName,
    },
  });

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

// ── googleapis SDK fallback ───────────────────────────────────────────────────

async function fetchSheetDataViaApi(spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
  const { google } = await import('googleapis');

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  let sheets;

  if (keyFile) {
    const auth = new google.auth.GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    sheets = google.sheets({ version: 'v4', auth });
  } else if (keyJson) {
    const credentials = JSON.parse(keyJson);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    sheets = google.sheets({ version: 'v4', auth });
  } else if (apiKey) {
    sheets = google.sheets({ version: 'v4', auth: apiKey });
  } else {
    const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth });
  }

  logger.info(`[API] Fetching "${sheetName}" from ${spreadsheetId.substring(0, 12)}...`);
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

// ── Unified sheet fetcher ─────────────────────────────────────────────────────

type SheetFetcher = (spreadsheetId: string, sheetName: string) => Promise<any[][] | null>;

async function createSheetFetcher(): Promise<SheetFetcher> {
  // 1. Try Runlayer MCP token
  let token = getRunlayerToken();
  if (!token) {
    token = await refreshRunlayerToken();
  }

  if (token) {
    logger.info('Using Runlayer MCP proxy for Google Sheets');
    return (id, name) => fetchSheetDataViaMcp(token!, id, name);
  }

  // 2. Fall back to googleapis SDK
  logger.info('No Runlayer token — trying googleapis SDK');
  return fetchSheetDataViaApi;
}

// ── Date parsing ──────────────────────────────────────────────────────────────

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
  if (lower === '') return true;
  if (lower.includes('total') || lower.includes('subtotal')) return true;
  if (lower.startsWith('corporate cash') || lower.startsWith('gustomer cash') || lower.startsWith('previous')) return true;
  // Skip cashflow section rows that shouldn't be treated as accounts
  if (lower.startsWith('additions') || lower.startsWith('subtractions') || lower.startsWith('beginning')) return true;
  if (lower.startsWith('ending cash') || lower.startsWith('material adjustment')) return true;
  if (lower.startsWith('target') || lower === 'miss' || lower === 'actual') return true;
  if (lower.includes('(fcst)') || lower.includes('(actual)') || lower.includes('(variance)')) return true;
  if (lower.startsWith('revenue inflow') || lower.startsWith('payroll') || lower.startsWith('sublease')) return true;
  if (lower.startsWith('m/e fbos') || lower.startsWith('morgan stanley') || lower.startsWith('restricted cash')) return true;
  return false;
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

// ── Ingestion ─────────────────────────────────────────────────────────────────

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

  logger.info(`${sheetName}: header row=${headerRowIdx}, date start col=${dateStartCol}`);

  const headerRow = rows[headerRowIdx];
  const dateColumns: { col: number; date: string }[] = [];
  for (let j = dateStartCol; j < headerRow.length; j++) {
    const dateStr = parseDateValue(headerRow[j]);
    if (dateStr) dateColumns.push({ col: j, date: dateStr });
  }

  logger.info(`${sheetName}: ${dateColumns.length} date columns, earliest=${dateColumns[0]?.date}, latest=${dateColumns[dateColumns.length - 1]?.date}`);

  if (dateColumns.length === 0) {
    logger.warn(`No parseable date columns in ${sheetName}`);
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

async function ingestCorpForecast(fetchSheet: SheetFetcher, maxWeeks: number = 104): Promise<number> {
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

  logger.info(`Forecast: ${dateColumns.length} date columns, taking last ${maxWeeks}`);
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

// ── Cash flow ingestion (additions, subtractions, ending cash) ───────────────

function findRowText(row: any[]): string {
  // Find the deepest non-empty text among the first 6 columns
  for (let i = 5; i >= 0; i--) {
    const val = row[i];
    if (val != null && String(val).trim() !== '') {
      const s = String(val).trim();
      // Skip pure numbers in these columns
      if (typeof val === 'number' && i >= 4) continue;
      if (/^[\d,.$()-]+$/.test(s)) continue;
      return s;
    }
  }
  return '';
}

function classifyLineItem(name: string): { baseName: string; lineType: 'forecast' | 'actual' | 'variance' } {
  const trimmed = name.trim();
  if (trimmed.endsWith('(actual)') || trimmed.endsWith('(actuals)')) {
    return { baseName: trimmed.replace(/\s*\(actuals?\)\s*$/, '').trim(), lineType: 'actual' };
  }
  if (trimmed.endsWith('(variance)')) {
    return { baseName: trimmed.replace(/\s*\(variance\)\s*$/, '').trim(), lineType: 'variance' };
  }
  if (trimmed.endsWith('(fcst)')) {
    return { baseName: trimmed.replace(/\s*\(fcst\)\s*$/, '').trim(), lineType: 'forecast' };
  }
  return { baseName: trimmed, lineType: 'forecast' };
}

async function ingestCorpCashflow(fetchSheet: SheetFetcher, maxWeeks: number = 104): Promise<number> {
  const rows = await fetchSheet(FORECAST_SPREADSHEET_ID, 'Forecast');
  if (!rows || rows.length < 10) {
    logger.warn('No data found in Forecast sheet for cashflow ingestion');
    return 0;
  }

  // Detect header row with dates (same logic as ingestCorpForecast)
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

  const recentDates = dateColumns.slice(-maxWeeks);
  logger.info(`Cashflow: ${dateColumns.length} total date cols, taking last ${recentDates.length}`);

  if (recentDates.length === 0) {
    logger.warn('Cashflow: no date columns found');
    return 0;
  }

  // Walk rows and detect sections
  type Section = 'beginning' | 'additions' | 'subtractions' | 'ending' | 'adjustments' | 'other';
  let currentSection: Section = 'beginning';

  const upsert = db.prepare(`
    INSERT INTO corp_cashflow_items (line_item, category, line_type, flow_date, amount, frequency, responsible_person, source, ingested_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'corp_forecast_gsheet', datetime('now'))
    ON CONFLICT(line_item, category, line_type, flow_date) DO UPDATE SET
      amount = excluded.amount,
      frequency = excluded.frequency,
      responsible_person = excluded.responsible_person,
      ingested_at = datetime('now')
  `);

  let count = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const text = findRowText(row);
    if (!text) continue;
    const textLower = text.toLowerCase();

    // Detect section transitions
    if (textLower === 'additions') { currentSection = 'additions'; continue; }
    if (textLower === 'subtractions') { currentSection = 'subtractions'; continue; }
    if (textLower.startsWith('ending cash')) { currentSection = 'ending'; }
    if (textLower === 'actual' && currentSection === 'ending') { /* stay in ending */ }
    if (textLower.startsWith('material adjustments')) { currentSection = 'adjustments'; continue; }
    if (textLower.startsWith('m/e fbos')) { currentSection = 'other'; continue; }

    // Skip beginning section (handled by existing ingestCorpForecast)
    if (currentSection === 'beginning') continue;
    // Skip adjustments and other sections
    if (currentSection === 'adjustments' || currentSection === 'other') continue;

    // Determine category and line type
    let category: string;
    let lineType: 'forecast' | 'actual' | 'variance';
    let baseName: string;

    if (currentSection === 'ending') {
      category = 'ending';
      if (textLower.startsWith('ending cash')) {
        baseName = 'Ending Cash';
        lineType = 'forecast';
      } else if (textLower === 'actual') {
        baseName = 'Ending Cash';
        lineType = 'actual';
      } else if (textLower.startsWith('variance') && textLower.includes('$')) {
        baseName = 'Ending Cash';
        lineType = 'variance';
      } else if (textLower.startsWith('target')) {
        baseName = 'TARGET';
        lineType = 'forecast';
      } else if (textLower === 'miss' || textLower.startsWith('variance') && textLower.includes('%')) {
        continue; // Skip percentage variance and miss rows
      } else {
        continue;
      }
    } else {
      // Additions or Subtractions
      const isSubtotal = textLower.startsWith('subtotal');
      const classified = classifyLineItem(text);
      baseName = classified.baseName;
      lineType = classified.lineType;

      if (isSubtotal) {
        category = currentSection === 'additions' ? 'addition_total' : 'subtraction_total';
        baseName = 'Subtotal';
      } else {
        category = currentSection === 'additions' ? 'addition' : 'subtraction';
      }
    }

    // Extract frequency and responsible person
    const frequency = (typeof row[5] === 'string' && row[5].trim()) ? row[5].trim() : null;
    const responsible = (row[6] && typeof row[6] === 'string' && row[6].trim()) ? row[6].trim() : null;

    // Extract values for each date column
    for (const { col, date } of recentDates) {
      const val = row[col];
      if (val == null || val === '' || val === '-') continue;

      let amount: number;
      if (typeof val === 'number') {
        amount = val;
      } else {
        // Handle parenthesized negatives like (19,170,000.00)
        const str = String(val).trim();
        const isNeg = str.startsWith('(') && str.endsWith(')');
        const cleaned = str.replace(/[(),$]/g, '');
        amount = parseFloat(cleaned);
        if (isNaN(amount)) continue;
        if (isNeg) amount = -amount;
      }

      upsert.run(baseName, category, lineType, date, amount, frequency, responsible);
      count++;
    }
  }

  logger.info(`Cashflow: upserted ${count} records`);
  return count;
}

function logIngestion(module: string, source: string, recordsIngested: number, status: string, errorMessage?: string) {
  db.prepare(`
    INSERT INTO treasury_ingestion_log (module, source, records_ingested, status, error_message, ingested_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(module, source, recordsIngested, status, errorMessage || null);
}

export async function runTreasuryDataIngestion(): Promise<{ corporate: number; customer: number; forecast: number; cashflow: number }> {
  logger.info('Treasury data ingestion job started');
  const results = { corporate: 0, customer: 0, forecast: 0, cashflow: 0 };

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

  // Corporate Cash Flow (additions, subtractions, ending cash)
  try {
    results.cashflow = await ingestCorpCashflow(fetchSheet);
    logIngestion('corp_cashflow', 'corp_forecast_gsheet', results.cashflow, results.cashflow > 0 ? 'success' : 'no_data');
    logger.info(`Ingested ${results.cashflow} corporate cashflow records`);
  } catch (error) {
    const msg = (error as Error).message;
    logIngestion('corp_cashflow', 'corp_forecast_gsheet', 0, 'error', msg);
    logger.error('Corporate cashflow ingestion failed', { error: msg });
  }

  const total = results.corporate + results.customer + results.forecast + results.cashflow;
  logger.info(`Treasury data ingestion completed: ${total} total records (corp=${results.corporate}, cust=${results.customer}, forecast=${results.forecast}, cashflow=${results.cashflow})`);
  return results;
}
