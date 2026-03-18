import path from 'path';
import fs from 'fs';
import { db } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

export function runStartupBackup(): void {
  try {
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const filename = `backup_${timestamp}.json`;
    const filepath = path.join(backupsDir, filename);

    const payments = db.prepare('SELECT * FROM payments').all();
    const users = db.prepare('SELECT * FROM users').all();
    const groupMembers = db.prepare('SELECT * FROM group_members').all();
    const groups = db.prepare('SELECT * FROM groups').all();
    const accounts = db.prepare('SELECT * FROM accounts').all();
    const groupAccounts = db.prepare('SELECT * FROM group_accounts').all();

    let paymentApprovals: any[] = [];
    try {
      paymentApprovals = db.prepare('SELECT * FROM payment_approvals').all();
    } catch (_) { /* table may not exist */ }

    const backup = {
      timestamp: now.toISOString(),
      counts: {
        payments: payments.length,
        users: users.length,
        group_members: groupMembers.length,
        groups: groups.length,
        accounts: accounts.length,
        group_accounts: groupAccounts.length,
        payment_approvals: paymentApprovals.length,
      },
      data: {
        payments,
        users,
        group_members: groupMembers,
        groups,
        accounts,
        group_accounts: groupAccounts,
        payment_approvals: paymentApprovals,
      },
    };

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    logger.info(`Startup backup saved: ${filename}`, { counts: backup.counts });
  } catch (error) {
    logger.error('Startup backup failed', { error: (error as Error).message });
  }
}
