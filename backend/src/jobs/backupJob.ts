import path from 'path';
import fs from 'fs';
import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

const MAX_BACKUPS = 10;

function safeQuery(sql: string): any[] {
  try { return db.prepare(sql).all(); } catch (_) { return []; }
}

export function runStartupBackup(): void {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    const backup = {
      timestamp: now.toISOString(),
      counts: {} as Record<string, number>,
      data: {} as Record<string, any[]>,
    };

    const tables = [
      'payments', 'users', 'groups', 'group_members',
      'accounts', 'group_accounts', 'payment_approvals', 'audit_logs',
    ];

    for (const table of tables) {
      const rows = safeQuery(`SELECT * FROM ${table}`);
      backup.data[table] = rows;
      backup.counts[table] = rows.length;
    }

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    logger.info(`Database backup created: ${filename}`, { counts: backup.counts });

    // Rotate: keep only last MAX_BACKUPS
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const old of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(backupsDir, old));
      logger.info(`Deleted old backup: ${old}`);
    }
  } catch (error) {
    logger.error('Startup backup failed', { error: (error as Error).message });
  }
}
