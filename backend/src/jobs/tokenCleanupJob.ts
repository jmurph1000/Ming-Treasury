import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

export async function runTokenCleanupJob(): Promise<void> {
  try {
    // Mark expired access requests
    const { rowCount: expiredRequests } = await query(`
      UPDATE access_requests
      SET status = 'expired'
      WHERE status = 'pending' AND expires_at < datetime('now')
    `);

    if (expiredRequests > 0) {
      logger.info(`Token cleanup: ${expiredRequests} access requests expired`);
    }

    // Clean up old sessions (older than 7 days)
    const { rowCount: oldSessions } = await query(`
      DELETE FROM sessions WHERE expires_at < datetime('now', '-7 days')
    `);

    if (oldSessions > 0) {
      logger.info(`Token cleanup: ${oldSessions} old sessions removed`);
    }

    // Clean up old notifications (older than 90 days and sent)
    const { rowCount: oldNotifications } = await query(`
      DELETE FROM notifications
      WHERE status = 'sent' AND created_at < datetime('now', '-90 days')
    `);

    if (oldNotifications > 0) {
      logger.info(`Token cleanup: ${oldNotifications} old notifications removed`);
    }
  } catch (error) {
    logger.error('Token cleanup job error', { error: (error as Error).message });
    throw error;
  }
}
