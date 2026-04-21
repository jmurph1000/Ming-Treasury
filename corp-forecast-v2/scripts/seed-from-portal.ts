/**
 * One-time script: copies corp_forecast_snapshots and corp_cashflow_items
 * from the treasury-payment-portal SQLite DB into this app's forecast.db.
 *
 * Run from the corp-forecast-v2 directory:
 *   npx tsx scripts/seed-from-portal.ts
 */
import Database from 'better-sqlite3';
import { resolve } from 'path';

const SOURCE_DB = resolve('C:/Users/ming.huey/treasury-payment-portal/treasury.db');
const TARGET_DB = resolve(process.cwd(), 'forecast.db');

const src = new Database(SOURCE_DB, { readonly: true });
const dst = new Database(TARGET_DB);
dst.pragma('journal_mode = WAL');

dst.exec(`
  CREATE TABLE IF NOT EXISTS corp_forecast_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    forecast_date TEXT NOT NULL,
    forecast_amount REAL,
    actual_amount REAL,
    min_balance REAL,
    responsible_person TEXT,
    ingested_at TEXT DEFAULT (datetime('now')),
    UNIQUE(account_name, forecast_date)
  );
  CREATE TABLE IF NOT EXISTS corp_cashflow_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_item TEXT NOT NULL,
    category TEXT NOT NULL,
    line_type TEXT NOT NULL DEFAULT 'forecast',
    flow_date TEXT NOT NULL,
    amount REAL,
    frequency TEXT,
    responsible_person TEXT,
    ingested_at TEXT DEFAULT (datetime('now')),
    UNIQUE(line_item, flow_date, line_type)
  );
`);

const insertForecast = dst.prepare(`
  INSERT OR REPLACE INTO corp_forecast_snapshots
    (account_name, forecast_date, forecast_amount, actual_amount, min_balance, responsible_person)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertCashflow = dst.prepare(`
  INSERT OR REPLACE INTO corp_cashflow_items
    (line_item, category, line_type, flow_date, amount, frequency, responsible_person)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

console.log('Copying forecast snapshots...');
const forecasts = src.prepare('SELECT * FROM corp_forecast_snapshots').all() as any[];
const insertForecasts = dst.transaction((rows: any[]) => {
  for (const r of rows) {
    insertForecast.run(r.account_name, r.forecast_date, r.forecast_amount, r.actual_amount, r.min_balance, r.responsible_person);
  }
});
insertForecasts(forecasts);
console.log(`  ${forecasts.length} forecast records copied`);

console.log('Copying cashflow items...');
const cashflows = src.prepare('SELECT * FROM corp_cashflow_items').all() as any[];
const insertCashflows = dst.transaction((rows: any[]) => {
  for (const r of rows) {
    insertCashflow.run(r.line_item, r.category, r.line_type, r.flow_date, r.amount, r.frequency, r.responsible_person);
  }
});
insertCashflows(cashflows);
console.log(`  ${cashflows.length} cashflow records copied`);

src.close();
dst.close();
console.log('Done! forecast.db is ready.');
