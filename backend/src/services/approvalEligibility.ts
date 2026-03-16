import { query } from '../config/sqlite.js';
import type { UserRole } from '../types/index.js';

export type ApproverPool = 'group_or_treasury' | 'senior_or_treasury' | 'treasury_only';

/**
 * Check if a user is eligible to act on an approval based on pool rules.
 * Treasury (admin) can always approve any pool.
 */
export async function checkPoolEligibility(
  userId: string,
  userRole: UserRole,
  pool: ApproverPool,
  groupId: string | null
): Promise<boolean> {
  switch (pool) {
    case 'treasury_only':
      return userRole === 'admin';

    case 'senior_or_treasury':
      return userRole === 'sr_manager' || userRole === 'admin';

    case 'group_or_treasury':
      if (userRole === 'admin') return true;
      if (!groupId) return false;
      // Must be in the group AND have initiator_approver role (not requestor_only)
      const { rows } = await query<{ user_id: string; role: string }>(
        `SELECT user_id, role FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );
      if (rows.length === 0) return false;
      return rows[0].role !== 'requestor_only';

    default:
      return false;
  }
}

/**
 * Check if a user is the initiator (requester) of a payment.
 */
export async function isPaymentInitiator(
  paymentId: string,
  userId: string
): Promise<boolean> {
  const { rows } = await query<{ requester_id: string }>(
    'SELECT requester_id FROM payments WHERE id = $1',
    [paymentId]
  );
  return rows.length > 0 && rows[0].requester_id === userId;
}

/**
 * Get all users eligible to approve for a given pool, excluding a specific user (the initiator).
 */
export async function getEligibleApprovers(
  pool: ApproverPool,
  groupId: string | null,
  excludeUserId: string
): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
  let sql: string;
  let params: any[];

  switch (pool) {
    case 'treasury_only':
      sql = `SELECT id, name, email, role FROM users
             WHERE role = 'admin' AND status = 'active' AND id != $1
             ORDER BY name`;
      params = [excludeUserId];
      break;

    case 'senior_or_treasury':
      sql = `SELECT id, name, email, role FROM users
             WHERE role IN ('sr_manager', 'admin') AND status = 'active' AND id != $1
             ORDER BY name`;
      params = [excludeUserId];
      break;

    case 'group_or_treasury':
      if (!groupId) return [];
      sql = `SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u
             LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = $2
             WHERE u.status = 'active' AND u.id != $1
               AND (u.role = 'admin' OR (gm.user_id IS NOT NULL AND gm.role = 'initiator_approver'))
             ORDER BY u.name`;
      params = [excludeUserId, groupId];
      break;

    default:
      return [];
  }

  const { rows } = await query<{ id: string; name: string; email: string; role: string }>(sql, params);
  return rows;
}
