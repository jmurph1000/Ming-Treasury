import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'forecast.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_forecast_date ON corp_forecast_snapshots(forecast_date);
      CREATE INDEX IF NOT EXISTS idx_forecast_account ON corp_forecast_snapshots(account_name);
      CREATE INDEX IF NOT EXISTS idx_cashflow_date ON corp_cashflow_items(flow_date);
      CREATE INDEX IF NOT EXISTS idx_cashflow_category ON corp_cashflow_items(category);
    `);
  }
  return _db;
}
