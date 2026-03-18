#!/usr/bin/env node
/**
 * Database Restore Script — UPSERT only, never drops or truncates tables
 * Usage: node scripts/db-restore.js [backup-filename]
 *   No argument: lists available backups
 *   With argument: restores that backup after confirmation
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const DB_PATH = path.join(__dirname, '..', 'treasury.db');
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

// Restore order matters for foreign key constraints
const RESTORE_ORDER = [
  'users', 'groups', 'accounts',
  'group_members', 'group_accounts',
  'payments', 'payment_approvals', 'audit_logs',
];

function listBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('No backups directory found.');
    return;
  }

  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No backup files found.');
    return;
  }

  console.log('\nAvailable backups:\n');
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(BACKUPS_DIR, file), 'utf8'));
      const counts = Object.entries(data.counts || {}).map(([k, v]) => `${k}:${v}`).join(', ');
      console.log(`  ${file}`);
      console.log(`    Timestamp: ${data.timestamp}`);
      console.log(`    Counts: ${counts}\n`);
    } catch (_) {
      console.log(`  ${file} (unreadable)`);
    }
  }

  console.log('To restore, run: node scripts/db-restore.js <filename>');
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function restore(filename) {
  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`ERROR: Backup file not found: ${filepath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  console.log(`\nBackup: ${filename}`);
  console.log(`Timestamp: ${data.timestamp}`);
  console.log('Counts:', JSON.stringify(data.counts, null, 2));

  console.log('\nThis will UPSERT (INSERT OR REPLACE) all records from this backup.');
  console.log('No tables will be dropped or truncated. Existing records not in the backup will remain.');

  const answer = await ask('\nType YES to confirm restore: ');
  if (answer !== 'YES') {
    console.log('Restore cancelled.');
    process.exit(0);
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF');

  let totalRestored = 0;

  for (const table of RESTORE_ORDER) {
    const rows = data.data[table];
    if (!rows || rows.length === 0) continue;

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
    );

    const tx = db.transaction(() => {
      for (const row of rows) {
        stmt.run(...cols.map(c => row[c]));
      }
    });

    try {
      tx();
      console.log(`  ${table}: restored ${rows.length} rows`);
      totalRestored += rows.length;
    } catch (err) {
      console.error(`  ${table}: FAILED — ${err.message}`);
    }
  }

  db.pragma('foreign_keys = ON');
  db.close();

  console.log(`\nRestore complete. ${totalRestored} total rows restored.`);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    listBackups();
  } else {
    await restore(arg);
  }
}

main();
