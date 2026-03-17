import { query } from '../config/sqlite.js';
import type { UserRole } from '../types/index.js';

export type ApproverPool = 'group_or_treasury' | 'senior_or_treasury' | 'treasury_only';

const TREASURY_GROUP_ID = 'grp-treasury';

/**
 * Check if a user is a Treasury group member (flag-based, not hardcoded by name).
 */
async function isTreasuryGroupMember(userId: string): Promise<boolean> {
  const { rows } = await query<{ user_id: string }>(
    'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [TREASURY_GROUP_ID, userId]
  );
  return rows.length > 0;
}

/**
 * Check if a user is eligible to act on an approval based on pool rules.
 * Treasury group members can always approve any pool.
 * Eligibility is determined by group membership flags, not hardcoded names.
 */
export async function checkPoolEligibility(
  userId: string,
  userRole: UserRole,
  pool: ApproverPool,
  groupId: string | null
): Promise<boolean> {
  const isTreasury = await isTreasuryGroupMember(userId);

  switch (pool) {
    case 'treasury_only':
      return isTreasury;

    case 'senior_or_treasury':
      return isTreasury || userRole === 'sr_manager';

    case 'group_or_treasury':
      if (isTreasury) return true;
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
      // Only Treasury group members
      sql = `SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u
             JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = '${TREASURY_GROUP_ID}'
             WHERE u.status = 'active' AND u.id != $1
             ORDER BY u.name`;
      params = [excludeUserId];
      break;

    case 'senior_or_treasury':
      sql = `SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u
             LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = '${TREASURY_GROUP_ID}'
             WHERE u.status = 'active' AND u.id != $1
               AND (gm.user_id IS NOT NULL OR u.role = 'sr_manager')
             ORDER BY u.name`;
      params = [excludeUserId];
      break;

    case 'group_or_treasury':
      if (!groupId) return [];
      // Members of the payment's group (with initiator_approver) OR Treasury group members
      sql = `SELECT DISTINCT u.id, u.name, u.email, u.role FROM users u
             LEFT JOIN group_members gm ON gm.user_id = u.id AND gm.group_id = $2
             LEFT JOIN group_members tm ON tm.user_id = u.id AND tm.group_id = '${TREASURY_GROUP_ID}'
             WHERE u.status = 'active' AND u.id != $1
               AND (tm.user_id IS NOT NULL OR (gm.user_id IS NOT NULL AND gm.role = 'initiator_approver'))
             ORDER BY u.name`;
      params = [excludeUserId, groupId];
      break;

    default:
      return [];
  }

  const { rows } = await query<{ id: string; name: string; email: string; role: string }>(sql, params);
  return rows;
}
