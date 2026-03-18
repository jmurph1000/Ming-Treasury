import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

export function trackLogin(userId: string, userName: string, userGroup: string | null, ipAddress: string, userAgent: string): string {
  try {
    const { rows } = query<{ id: string }>(
      `INSERT INTO user_sessions (user_id, user_name, user_group, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, userName, userGroup, ipAddress, userAgent]
    );
    return rows[0]?.id || '';
  } catch (error) {
    logger.error('Failed to track login', { error: (error as Error).message, userId });
    return '';
  }
}

export function trackLogout(userId: string): void {
  try {
    query(
      `UPDATE user_sessions SET logout_at = datetime('now')
       WHERE user_id = $1 AND logout_at IS NULL
       ORDER BY login_at DESC LIMIT 1`,
      [userId]
    );
  } catch (error) {
    logger.error('Failed to track logout', { error: (error as Error).message, userId });
  }
}

export function updateLastActive(userId: string): void {
  try {
    query(
      `UPDATE user_sessions SET last_active_at = datetime('now')
       WHERE user_id = $1 AND logout_at IS NULL`,
      [userId]
    );
  } catch (error) {
    // Silently fail — don't slow down requests
  }
}
