import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

const TREASURY_GROUP_ID = 'grp-treasury';
const PAYROLL_GROUP_ID = 'grp-payroll';
// Dual control = 1 initiator + 1 approver (different person). No high-value threshold override.
// Routing rules drive approval steps exactly as configured.

/**
 * Check if a user is a Treasury group member
 */
export async function isTreasuryMember(userId: string): Promise<boolean> {
  const { rows } = await query<{ user_id: string }>(
    'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = $2',
    [TREASURY_GROUP_ID, userId]
  );
  return rows.length > 0;
}

/**
 * Check if a user is requestor-only in ALL their groups.
 * If they have initiator_approver in any group, they can approve in that group's context.
 */
export async function isRequestorOnlyEverywhere(userId: string): Promise<boolean> {
  const { rows } = await query<{ role: string }>(
    `SELECT role FROM group_members WHERE user_id = $1`,
    [userId]
  );
  if (rows.length === 0) return false;
  // If every membership is requestor_only, they cannot approve anything
  return rows.every(r => r.role === 'requestor_only');
}

/**
 * Check if a user is requestor-only for a specific group context.
 * Used to determine if they can approve payments belonging to a specific group.
 */
export async function isRequestorOnlyInGroup(userId: string, groupId: string | null): Promise<boolean> {
  if (!groupId) return false;
  const { rows } = await query<{ role: string }>(
    `SELECT role FROM group_members WHERE user_id = $1 AND group_id = $2`,
    [userId, groupId]
  );
  if (rows.length === 0) return false; // not in this group at all
  return rows[0].role === 'requestor_only';
}

/**
 * Get the groups a user belongs to (excluding Treasury)
 */
export async function getUserGroups(userId: string): Promise<Array<{ group_id: string; group_name: string }>> {
  const { rows } = await query<{ group_id: string; group_name: string }>(
    `SELECT g.id as group_id, g.name as group_name
     FROM group_members gm JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = $1`,
    [userId]
  );
  return rows;
}

const UNIVERSAL_ACCOUNT_ID = 'acct-jpm-9811';
const OTHER_GROUP_ID = 'grp-other';

/**
 * Classify a payment's group based on the SOURCE and DESTINATION accounts used.
 *
 * Rules:
 *  - JPM Corporate Master -9811 is a universal account shared across all groups.
 *    When used as source, use the DESTINATION account to determine group.
 *  - Look up which non-Treasury groups have permission to use the destination
 *    account (direction 'to' or 'both'). That determines the payment's group.
 *  - For external payments with no destination account, use the source account
 *    (direction 'from' or 'both') for group classification.
 *  - Treasury is excluded from classification (they're always eligible as approvers).
 *  - "Other" group is lowest priority — only used if no other group matches.
 */
async function classifyPaymentGroup(
  accountId: string,
  destinationAccountId: string | null,
): Promise<{ groupId: string | null; groupName: string }> {
  const isUniversalSource = accountId === UNIVERSAL_ACCOUNT_ID;

  // If source is universal and there's a destination, classify by destination
  if (isUniversalSource && destinationAccountId) {
    const { rows: destGroups } = await query<{ group_id: string; group_name: string; acct_count: number }>(
      `SELECT ga.group_id, g.name as group_name,
              (SELECT COUNT(*) FROM group_accounts ga2 WHERE ga2.group_id = ga.group_id) as acct_count
       FROM group_accounts ga
       JOIN groups g ON g.id = ga.group_id
       WHERE ga.account_id = $1 AND ga.direction IN ('to', 'both')
         AND ga.group_id NOT IN ($2, $3)
       ORDER BY acct_count ASC`,
      [destinationAccountId, TREASURY_GROUP_ID, OTHER_GROUP_ID]
    );
    if (destGroups.length > 0) {
      return { groupId: destGroups[0].group_id, groupName: destGroups[0].group_name };
    }
    // Fall through: check "Other" group
    const { rows: otherGroups } = await query<{ group_id: string; group_name: string }>(
      `SELECT ga.group_id, g.name as group_name
       FROM group_accounts ga JOIN groups g ON g.id = ga.group_id
       WHERE ga.account_id = $1 AND ga.direction IN ('to', 'both') AND ga.group_id = $2`,
      [destinationAccountId, OTHER_GROUP_ID]
    );
    if (otherGroups.length > 0) {
      return { groupId: otherGroups[0].group_id, groupName: otherGroups[0].group_name };
    }
  }

  // If there's a destination and source is NOT universal, find groups with access to BOTH
  if (destinationAccountId && !isUniversalSource) {
    const { rows: bothGroups } = await query<{ group_id: string; group_name: string; acct_count: number }>(
      `SELECT ga_src.group_id, g.name as group_name,
              (SELECT COUNT(*) FROM group_accounts ga2 WHERE ga2.group_id = ga_src.group_id) as acct_count
       FROM group_accounts ga_src
       JOIN group_accounts ga_dst ON ga_dst.group_id = ga_src.group_id AND ga_dst.account_id = $2 AND ga_dst.direction IN ('to', 'both')
       JOIN groups g ON g.id = ga_src.group_id
       WHERE ga_src.account_id = $1 AND ga_src.direction IN ('from', 'both')
         AND ga_src.group_id NOT IN ($3, $4)
       ORDER BY acct_count ASC`,
      [accountId, destinationAccountId, TREASURY_GROUP_ID, OTHER_GROUP_ID]
    );
    if (bothGroups.length > 0) {
      return { groupId: bothGroups[0].group_id, groupName: bothGroups[0].group_name };
    }
    // Fallback: just destination account
    const { rows: destOnly } = await query<{ group_id: string; group_name: string; acct_count: number }>(
      `SELECT ga.group_id, g.name as group_name,
              (SELECT COUNT(*) FROM group_accounts ga2 WHERE ga2.group_id = ga.group_id) as acct_count
       FROM group_accounts ga JOIN groups g ON g.id = ga.group_id
       WHERE ga.account_id = $1 AND ga.direction IN ('to', 'both')
         AND ga.group_id NOT IN ($2, $3)
       ORDER BY acct_count ASC`,
      [destinationAccountId, TREASURY_GROUP_ID, OTHER_GROUP_ID]
    );
    if (destOnly.length > 0) {
      return { groupId: destOnly[0].group_id, groupName: destOnly[0].group_name };
    }
  }

  // No destination (external payment) or no match yet — classify by source account
  if (accountId !== UNIVERSAL_ACCOUNT_ID) {
    const { rows: srcGroups } = await query<{ group_id: string; group_name: string; acct_count: number }>(
      `SELECT ga.group_id, g.name as group_name,
              (SELECT COUNT(*) FROM group_accounts ga2 WHERE ga2.group_id = ga.group_id) as acct_count
       FROM group_accounts ga JOIN groups g ON g.id = ga.group_id
       WHERE ga.account_id = $1 AND ga.direction IN ('from', 'both')
         AND ga.group_id NOT IN ($2, $3)
       ORDER BY acct_count ASC`,
      [accountId, TREASURY_GROUP_ID, OTHER_GROUP_ID]
    );
    if (srcGroups.length > 0) {
      return { groupId: srcGroups[0].group_id, groupName: srcGroups[0].group_name };
    }
  }

  // Last resort: universal source with no destination — Treasury
  return { groupId: TREASURY_GROUP_ID, groupName: 'Treasury' };
}

/**
 * Determine approval steps for a payment based on Section 4 rules.
 * Group classification is driven ENTIRELY by the accounts used, not the submitter.
 */
export async function determineApprovalChain(
  paymentId: string,
  requesterId: string,
  usdEquivalent: number,
  accountId: string,
  destinationAccountId: string | null,
): Promise<{
  steps: Array<{ step: number; approver_pool: string; group_id: string | null; approver_role: string }>;
  description: string;
  groupId: string | null;
}> {
  // Classify group by accounts, not by submitter
  const { groupId, groupName } = await classifyPaymentGroup(accountId, destinationAccountId);

  // Dual control: exactly 1 approval step. Routing rules table drives steps as configured.
  // No hardcoded multi-step override based on amount.
  const steps = [{
    step: 1,
    approver_pool: 'group_or_treasury',
    group_id: groupId,
    approver_role: 'any',
  }];

  const desc = `${groupName} — Dual control enforced — initiator cannot approve their own payment`;

  return { steps, description: desc, groupId };
}

/**
 * Validate Payroll account restrictions.
 * Payroll members can only use approved source/destination accounts.
 */
export async function validatePayrollAccountAccess(
  requesterId: string,
  accountId: string,
  destinationAccountId: string | null,
  fundingType: string,
): Promise<{ valid: boolean; error?: string }> {
  const userGroups = await getUserGroups(requesterId);
  const isInPayroll = userGroups.some(g => g.group_id === PAYROLL_GROUP_ID);

  if (!isInPayroll) return { valid: true };

  // Check if user is also in a non-Payroll group (e.g. KC Deatsch in Accounting + Payroll)
  // If so, they may be using accounts from their other group - allow it
  const isTreasury = await isTreasuryMember(requesterId);
  if (isTreasury) return { valid: true };

  // Check source account: must be in Payroll 'from' or 'both' direction
  const { rows: sourceAccess } = await query<{ account_id: string }>(
    `SELECT account_id FROM group_accounts
     WHERE group_id = $1 AND account_id = $2 AND direction IN ('from', 'both')`,
    [PAYROLL_GROUP_ID, accountId]
  );

  // Also check if the account belongs to another group the user is in
  const otherGroups = userGroups.filter(g => g.group_id !== PAYROLL_GROUP_ID);
  let hasSourceInOtherGroup = false;
  for (const g of otherGroups) {
    const { rows } = await query<{ account_id: string }>(
      `SELECT account_id FROM group_accounts
       WHERE group_id = $1 AND account_id = $2 AND direction IN ('from', 'both')`,
      [g.group_id, accountId]
    );
    if (rows.length > 0) { hasSourceInOtherGroup = true; break; }
  }

  if (sourceAccess.length === 0 && !hasSourceInOtherGroup) {
    return { valid: false, error: 'Source account is not authorized for Payroll payments' };
  }

  // Check destination for internal transfers
  if (fundingType === 'internal' && destinationAccountId) {
    const { rows: destAccess } = await query<{ account_id: string }>(
      `SELECT account_id FROM group_accounts
       WHERE group_id = $1 AND account_id = $2 AND direction IN ('to', 'both')`,
      [PAYROLL_GROUP_ID, destinationAccountId]
    );

    let hasDestInOtherGroup = false;
    for (const g of otherGroups) {
      const { rows } = await query<{ account_id: string }>(
        `SELECT account_id FROM group_accounts
         WHERE group_id = $1 AND account_id = $2 AND direction IN ('to', 'both')`,
        [g.group_id, destinationAccountId]
      );
      if (rows.length > 0) { hasDestInOtherGroup = true; break; }
    }

    if (destAccess.length === 0 && !hasDestInOtherGroup) {
      return { valid: false, error: 'Destination account is not authorized for Payroll payments' };
    }
  }

  return { valid: true };
}

/**
 * Check if a user can approve a specific payment.
 * Enforces:
 * - Initiator cannot approve own payment (segregation of duties)
 * - Payroll requestor-only users cannot approve ANY payment
 * - Same user cannot approve at multiple steps
 * - User must be eligible for the approval pool (group member or treasury)
 */
export async function canUserApprovePayment(
  userId: string,
  userEmail: string,
  paymentId: string,
  approvalGroupId: string | null,
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if initiator
  const { rows: payment } = await query<{ requester_id: string }>(
    'SELECT requester_id FROM payments WHERE id = $1',
    [paymentId]
  );
  if (payment.length > 0 && payment[0].requester_id === userId) {
    return { allowed: false, reason: 'You cannot approve a payment you initiated' };
  }

  // Users who are requestor-only in ALL their groups cannot approve ANY payment
  const reqOnly = await isRequestorOnlyEverywhere(userId);
  if (reqOnly) {
    return { allowed: false, reason: 'You are a requestor-only member and cannot approve payments' };
  }

  // If user is requestor-only in the specific group this payment belongs to,
  // they can only approve if they have initiator_approver rights in another group
  // (Treasury members always pass - handled by admin role check elsewhere)
  if (approvalGroupId) {
    const reqOnlyInGroup = await isRequestorOnlyInGroup(userId, approvalGroupId);
    if (reqOnlyInGroup) {
      // Check if they're Treasury (admin) — if so, they can still approve
      const treasury = await isTreasuryMember(userId);
      if (!treasury) {
        return { allowed: false, reason: 'You are a requestor-only member in this group and cannot approve its payments' };
      }
    }
  }

  // Check for duplicate approver on multi-step payments
  const { rows: existingApprovals } = await query<{ approver_id: string }>(
    `SELECT approver_id FROM payment_approvals
     WHERE payment_id = $1 AND action = 'approved' AND approver_id IS NOT NULL`,
    [paymentId]
  );

  if (existingApprovals.some(a => a.approver_id === userId)) {
    return { allowed: false, reason: 'You have already approved this payment at a previous step' };
  }

  return { allowed: true };
}

/**
 * Full eligibility check: can the user approve a specific payment right now?
 * Combines canUserApprovePayment + pool eligibility + step checks.
 * Returns the approval_id to act on if eligible.
 */
export async function getApprovalEligibility(
  userId: string,
  userEmail: string,
  userRole: string,
  paymentId: string,
): Promise<{ canApprove: boolean; approvalId: string | null; reason?: string }> {
  // Get the payment
  const { rows: payments } = await query<{ status: string; current_approval_step: number; requester_id: string }>(
    'SELECT status, current_approval_step, requester_id FROM payments WHERE id = $1',
    [paymentId]
  );
  if (payments.length === 0 || payments[0].status !== 'pending_approval') {
    return { canApprove: false, approvalId: null };
  }

  const pmt = payments[0];

  // Get the current pending approval step
  const { rows: approvalRows } = await query<{ id: string; approver_pool: string | null; approver_role: string; group_id: string | null; approver_id: string | null }>(
    `SELECT id, approver_pool, approver_role, group_id, approver_id
     FROM payment_approvals
     WHERE payment_id = $1 AND step_number = $2 AND action = 'pending'`,
    [paymentId, pmt.current_approval_step]
  );
  if (approvalRows.length === 0) {
    return { canApprove: false, approvalId: null };
  }

  const approval = approvalRows[0];

  // Run the comprehensive approval check
  const check = await canUserApprovePayment(userId, userEmail, paymentId, approval.group_id);
  if (!check.allowed) {
    return { canApprove: false, approvalId: null, reason: check.reason };
  }

  // Check pool eligibility
  if (approval.approver_pool) {
    const { checkPoolEligibility } = await import('./approvalEligibility.js');
    const eligible = await checkPoolEligibility(
      userId, userRole as any, approval.approver_pool as any, approval.group_id
    );
    if (!eligible) {
      return { canApprove: false, approvalId: null, reason: 'You are not in the approval pool for this payment' };
    }
  } else if (approval.approver_id) {
    // Directly assigned — must be this user
    if (approval.approver_id !== userId) {
      return { canApprove: false, approvalId: null };
    }
  } else {
    // Legacy role-based check
    const { canApproveForRole } = await import('../middleware/rbac.js');
    if (!canApproveForRole(userRole as any, approval.approver_role as any)) {
      return { canApprove: false, approvalId: null };
    }
  }

  return { canApprove: true, approvalId: approval.id };
}
