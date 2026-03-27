#!/usr/bin/env node
/**
 * Daily Cash Balance Ingestion Script
 *
 * Reads the Treasury Flash spreadsheet via Runlayer MCP proxy (gsheets)
 * and inserts balance data into cash_balance_snapshots in treasury.db.
 *
 * Usage:
 *   node scripts/daily-cash-ingest.mjs                  # Try MCP proxy, then fallback
 *   node scripts/daily-cash-ingest.mjs --source=mcp     # MCP proxy only
 *   node scripts/daily-cash-ingest.mjs --source=csv     # CSV files only
 *
 * Scheduled: Weekdays 9:30 AM ET via Windows Task Scheduler
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'treasury.db');

// Spreadsheet config
const SPREADSHEET_ID = '1aH5mc6wlu_B83rRTN1vP53plUnG-RHQ2bkipXtViBkE';
const SHEETS = [
  { name: 'Corporate Cash Position', accountType: 'corporate' },
  { name: 'Gustomer Cash Position', accountType: 'customer' },
];

// Runlayer MCP proxy config
const RUNLAYER_PROXY_URL = 'https://gusto.runlayer.com/api/v1/proxy/67c072b8-017b-4ef2-96ac-e5c1b3c5a0be/mcp';

// ─── Token Resolution ────────────────────────────────────────────────
function getRunlayerToken() {
  // 1. Environment variable
  const envToken = process.env.RUNLAYER_ACCESS_TOKEN;
  if (envToken && envToken.length > 10) return envToken;

  // 2. .runlayer-token.json
  const tokenFile = path.join(PROJECT_ROOT, '.runlayer-token.json');
  if (fs.existsSync(tokenFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
      if (data.access_token && (!data.expires_at || data.expires_at > Date.now())) {
        return data.access_token;
      }
    } catch (_) {}
  }

  // 3. Claude Code credentials
  const credPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', '.credentials.json');
  if (fs.existsSync(credPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      for (const [key, val] of Object.entries(creds.mcpOAuth || {})) {
        if (key.startsWith('gsheets') && val.accessToken && val.expiresAt > Date.now() / 1000) {
          return val.accessToken;
        }
      }
    } catch (_) {}
  }

  // 4. .env file
  const envFile = path.join(PROJECT_ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf8').match(/^RUNLAYER_ACCESS_TOKEN=(.+)$/m);
    if (match && match[1].length > 10) return match[1];
  }

  return null;
}

// ─── MCP Proxy Fetch ─────────────────────────────────────────────────
async function mcpCall(method, params, token) {
  const res = await fetch(RUNLAYER_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`MCP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`MCP error: ${JSON.stringify(data.error)}`);
  return data.result;
}

async function fetchSheetViaMcp(sheetName, token) {
  // First try to list tools to find the right one
  let toolName = 'read_spreadsheet';
  try {
    const tools = await mcpCall('tools/list', {}, token);
    const sheetTool = (tools.tools || []).find(t =>
      t.name.includes('read') || t.name.includes('get') || t.name.includes('values')
    );
    if (sheetTool) toolName = sheetTool.name;
  } catch (_) {}

  // Call the read tool
  const result = await mcpCall('tools/call', {
    name: toolName,
    arguments: {
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:ZZ`,
    },
  }, token);

  // Parse response — MCP returns content array
  const content = result?.content || [];
  const textContent = content.find(c => c.type === 'text');
  if (!textContent) throw new Error('No text content in MCP response');

  // Parse as JSON (some MCP tools return JSON arrays)
  try {
    return JSON.parse(textContent.text);
  } catch (_) {
    // Parse as TSV/CSV
    return textContent.text.split('\n').map(line => line.split('\t'));
  }
}

// ─── CSV File Fetch ──────────────────────────────────────────────────
function fetchSheetFromCsv(sheetName) {
  const safeName = sheetName.toLowerCase().replace(/\s+/g, '-');
  const candidates = [
    path.join(PROJECT_ROOT, `${safeName}.csv`),
    path.join(PROJECT_ROOT, 'data', `${safeName}.csv`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`  Reading CSV: ${p}`);
      const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
      return lines.map(line => {
        // Handle quoted CSV fields
        const result = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
          current += ch;
        }
        result.push(current);
        return result;
      });
    }
  }
  return null;
}

// ─── Sheet Data Parser ───────────────────────────────────────────────
/**
 * Treasury Flash sheets have dates in the header row and account names in column A.
 * Format:
 *   Row 0: [blank/header, date1, date2, date3, ...]
 *   Row 1+: [account_name, balance1, balance2, balance3, ...]
 *
 * Dates may be formatted as MM/DD/YYYY, YYYY-MM-DD, or serial numbers.
 */
function parseSheetData(rows, accountType) {
  if (!rows || rows.length < 2) return [];

  const headerRow = rows[0];
  const records = [];

  // Find date columns (skip column 0 which is account name)
  const dateColumns = [];
  for (let col = 1; col < headerRow.length; col++) {
    const raw = String(headerRow[col] || '').trim();
    const parsed = parseDate(raw);
    if (parsed) dateColumns.push({ col, date: parsed });
  }

  if (dateColumns.length === 0) {
    console.warn('  No date columns found in header row');
    return [];
  }

  // Filter to last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recentDates = dateColumns.filter(d => d.date >= cutoffStr);

  console.log(`  Found ${dateColumns.length} date columns, ${recentDates.length} within last 30 days`);

  // Parse account rows
  for (let row = 1; row < rows.length; row++) {
    const accountName = String(rows[row][0] || '').trim();
    if (!accountName || accountName.toLowerCase().includes('total') || accountName === '') continue;

    // Extract bank name and last4 from account name pattern: "Bank Name -XXXX (Entity)"
    const bankMatch = accountName.match(/^(Chase|JPM|PNC|SVB|NBKC|Garanti|Citi)/i);
    const last4Match = accountName.match(/-(\d{4})/);
    const bank = bankMatch ? bankMatch[1] : null;
    const last4 = last4Match ? last4Match[1] : null;

    for (const { col, date } of recentDates) {
      const rawVal = rows[row][col];
      const balance = parseBalance(rawVal);
      if (balance === null) continue;

      records.push({
        accountName,
        accountType,
        balanceDate: date,
        balance,
        currency: 'USD',
        bank,
        last4,
      });
    }
  }

  return records;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Google Sheets serial date (days since 1899-12-30)
  const num = Number(s);
  if (num > 40000 && num < 50000) {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + num);
    return epoch.toISOString().slice(0, 10);
  }

  return null;
}

function parseBalance(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).replace(/[$,\s]/g, '').replace(/[()]/g, m => m === '(' ? '-' : '');
  const num = Number(s);
  return isNaN(num) ? null : num;
}

// ─── Database Insert ─────────────────────────────────────────────────
function insertRecords(records) {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const insert = db.prepare(`
    INSERT OR IGNORE INTO cash_balance_snapshots
      (account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, 'treasury_flash_gsheet', datetime('now'))
  `);

  let inserted = 0;
  const insertMany = db.transaction((recs) => {
    for (const r of recs) {
      const result = insert.run(
        r.accountName,
        r.accountType,
        r.balanceDate,
        r.balance,
        r.currency,
        r.bank,
        r.last4
      );
      if (result.changes > 0) inserted++;
    }
  });

  insertMany(records);

  // Log ingestion
  try {
    db.prepare(`
      INSERT INTO treasury_ingestion_log (module, status, records_processed, details, run_at)
      VALUES ('cash_balances', 'success', ?, ?, datetime('now'))
    `).run(inserted, `Inserted ${inserted} of ${records.length} records`);
  } catch (_) {
    // table may not exist yet
  }

  const total = db.prepare('SELECT COUNT(*) as cnt FROM cash_balance_snapshots').get();
  db.close();
  return { inserted, totalInDb: total.cnt };
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1] || 'auto';

  console.log(`\n=== Daily Cash Balance Ingestion ===`);
  console.log(`Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
  console.log(`Source: ${sourceArg}`);
  console.log(`Database: ${DB_PATH}\n`);

  let allRecords = [];

  for (const sheet of SHEETS) {
    console.log(`Processing: ${sheet.name} (${sheet.accountType})`);
    let rows = null;

    // Try MCP proxy
    if (sourceArg === 'auto' || sourceArg === 'mcp') {
      const token = getRunlayerToken();
      if (token) {
        try {
          console.log('  Fetching via Runlayer MCP proxy...');
          rows = await fetchSheetViaMcp(sheet.name, token);
          console.log(`  MCP: Got ${rows?.length || 0} rows`);
        } catch (err) {
          console.warn(`  MCP failed: ${err.message}`);
        }
      } else if (sourceArg === 'mcp') {
        console.error('  No Runlayer token available. Run: node scripts/runlayer-auth.mjs');
        process.exit(1);
      }
    }

    // Try CSV fallback
    if (!rows && (sourceArg === 'auto' || sourceArg === 'csv')) {
      rows = fetchSheetFromCsv(sheet.name);
      if (rows) console.log(`  CSV: Got ${rows.length} rows`);
    }

    if (!rows) {
      console.warn(`  No data source available for "${sheet.name}"`);
      continue;
    }

    const records = parseSheetData(rows, sheet.accountType);
    console.log(`  Parsed ${records.length} balance records`);
    allRecords.push(...records);
  }

  if (allRecords.length === 0) {
    console.error('\nNo records to insert. Ensure MCP auth is configured or CSV files are present.');
    console.error('To authenticate: node scripts/runlayer-auth.mjs');
    console.error('CSV paths: corporate-cash-position.csv, gustomer-cash-position.csv');
    process.exit(1);
  }

  console.log(`\nInserting ${allRecords.length} records (INSERT OR IGNORE)...`);
  const { inserted, totalInDb } = insertRecords(allRecords);
  console.log(`Inserted: ${inserted} new records`);
  console.log(`Total in cash_balance_snapshots: ${totalInDb}`);
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
