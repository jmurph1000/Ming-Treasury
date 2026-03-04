import { query } from '../config/sqlite.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { ACCOUNT_ACCESS_AUDIT_ACTIONS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Get the full pool of account IDs available to a user through their group memberships.
 */
export async function getGroupPoolAccountIds(userId: string): Promise<string[]> {
  const { rows } = await query<{ account_id: string }>(
    `SELECT DISTINCT ga.account_id
     FROM group_members gm
     JOIN group_accounts ga ON ga.group_id = gm.group_id
     WHERE gm.user_id = $1`,
    [userId]
  );
  return rows.map(r => r.account_id);
}

/**
 * Get the effective account IDs for a user.
 * If the user has override entries in user_account_access, intersect those with the group pool.
 * Otherwise, return the full group pool.
 */
export async function getEffectiveAccountIds(userId: string): Promise<string[]> {
  const groupPool = await getGroupPoolAccountIds(userId);

  const { rows: overrideRows } = await query<{ account_id: string }>(
    'SELECT account_id FROM user_account_access WHERE user_id = $1',
    [userId]
  );

  if (overrideRows.length === 0) {
    // No override — full group pool
    return groupPool;
  }

  // Intersect override with group pool
  const overrideSet = new Set(overrideRows.map(r => r.account_id));
  return groupPool.filter(id => overrideSet.has(id));
}

/**
 * Remove user_account_access entries for accounts no longer in the user's group pool.
 * Logs removals to the account_access_audit_log.
 */
export async function pruneStaleOverrides(
  userId: string,
  adminId: string,
  adminEmail: string
): Promise<void> {
  const groupPool = await getGroupPoolAccountIds(userId);
  const groupPoolSet = new Set(groupPool);

  const { rows: overrideRows } = await query<{ account_id: string }>(
    'SELECT account_id FROM user_account_access WHERE user_id = $1',
    [userId]
  );

  if (overrideRows.length === 0) return;

  const staleIds = overrideRows
    .map(r => r.account_id)
    .filter(id => !groupPoolSet.has(id));

  if (staleIds.length === 0) return;

  // Remove stale entries
  for (const accountId of staleIds) {
    await query(
      'DELETE FROM user_account_access WHERE user_id = $1 AND account_id = $2',
      [userId, accountId]
    );
  }

  // If all overrides were pruned, there are none left — effectively clearing the override
  const { rows: remaining } = await query<{ account_id: string }>(
    'SELECT account_id FROM user_account_access WHERE user_id = $1',
    [userId]
  );

  // Log to audit
  await query(
    `INSERT INTO account_access_audit_log (user_id, admin_id, admin_email, action, previous_account_ids, new_account_ids, group_pool_account_ids, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      adminId,
      adminEmail,
      'STALE_OVERRIDES_PRUNED',
      JSON.stringify(overrideRows.map(r => r.account_id)),
      JSON.stringify(remaining.map(r => r.account_id)),
      JSON.stringify(groupPool),
      `Auto-pruned ${staleIds.length} account(s) no longer in group pool`,
    ]
  );

  logger.info('Pruned stale account access overrides', {
    userId,
    prunedCount: staleIds.length,
    remainingOverrides: remaining.length,
  });
}

/**
 * Prune stale overrides for all members of a group.
 * Call this after changing a group's account assignments.
 */
export async function syncGroupMembers(
  groupId: string,
  adminId: string,
  adminEmail: string
): Promise<void> {
  const { rows: members } = await query<{ user_id: string }>(
    'SELECT user_id FROM group_members WHERE group_id = $1',
    [groupId]
  );

  for (const member of members) {
    await pruneStaleOverrides(member.user_id, adminId, adminEmail);
  }
}

/**
 * Prune stale overrides for a single user after a group membership change.
 */
export async function syncUserAfterGroupChange(
  userId: string,
  adminId: string,
  adminEmail: string
): Promise<void> {
  await pruneStaleOverrides(userId, adminId, adminEmail);
}
