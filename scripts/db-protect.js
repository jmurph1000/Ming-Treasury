#!/usr/bin/env node
/**
 * Database Protection — Manual Backup Script
 * Usage: node scripts/db-protect.js
 * Also called automatically on every server startup via backupJob.ts
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MAX_BACKUPS = 10;
const DB_PATH = path.join(__dirname, '..', 'treasury.db');
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

function run() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('ERROR: Database not found at', DB_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH, { readonly: true });
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(BACKUPS_DIR, filename);

  const tables = [
    'payments', 'users', 'groups', 'group_members',
    'accounts', 'group_accounts', 'payment_approvals', 'audit_logs',
  ];

  const backup = {
    timestamp: now.toISOString(),
    counts: {},
    data: {},
  };

  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      backup.data[table] = rows;
      backup.counts[table] = rows.length;
    } catch (_) {
      backup.data[table] = [];
      backup.counts[table] = 0;
    }
  }

  db.close();

  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  console.log(`Database backup created: ${filename}`);
  console.log('Counts:', JSON.stringify(backup.counts, null, 2));

  // Rotate: keep only last MAX_BACKUPS
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  for (const old of files.slice(MAX_BACKUPS)) {
    fs.unlinkSync(path.join(BACKUPS_DIR, old));
    console.log(`Deleted old backup: ${old}`);
  }
}

run();
