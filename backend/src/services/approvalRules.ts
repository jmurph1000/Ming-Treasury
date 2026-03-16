import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

const TREASURY_GROUP_ID = 'grp-treasury';
const PAYROLL_GROUP_ID = 'grp-payroll';
const HIGH_VALUE_THRESHOLD = 1_000_000; // $1M USD

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

/**
 * Determine approval steps for a payment based on Section 4 rules.
 * Returns the pool chain configuration.
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
  const isTreasury = await isTreasuryMember(requesterId);
  const userGroups = await getUserGroups(requesterId);
  const isHighValue = usdEquivalent >= HIGH_VALUE_THRESHOLD;

  // Check if user is in Payroll
  const payrollGroup = userGroups.find(g => g.group_id === PAYROLL_GROUP_ID);
  // Find the primary non-treasury group for the user
  const nonTreasuryGroups = userGroups.filter(g => g.group_id !== TREASURY_GROUP_ID);
  const primaryGroup = nonTreasuryGroups.length > 0 ? nonTreasuryGroups[0] : null;

  if (isTreasury) {
    // Treasury superuser: 1 approver (different Treasury member) for any amount
    // For $1M+, require 2 approvers
    if (isHighValue) {
      return {
        steps: [
          { step: 1, approver_pool: 'group_or_treasury', group_id: TREASURY_GROUP_ID, approver_role: 'any' },
          { step: 2, approver_pool: 'group_or_treasury', group_id: TREASURY_GROUP_ID, approver_role: 'any' },
        ],
        description: `Treasury (2 approvers - payment >= $1M)`,
        groupId: TREASURY_GROUP_ID,
      };
    }
    return {
      steps: [
        { step: 1, approver_pool: 'group_or_treasury', group_id: TREASURY_GROUP_ID, approver_role: 'any' },
      ],
      description: 'Treasury (1 approver)',
      groupId: TREASURY_GROUP_ID,
    };
  }

  // Non-Treasury users
  const groupId = primaryGroup?.group_id || null;
  const groupName = primaryGroup?.group_name || 'Unknown';

  if (isHighValue) {
    // $1M+: 2 separate approvers required
    return {
      steps: [
        { step: 1, approver_pool: 'group_or_treasury', group_id: groupId, approver_role: 'any' },
        { step: 2, approver_pool: 'group_or_treasury', group_id: groupId, approver_role: 'any' },
      ],
      description: `${groupName} (2 approvers - payment >= $1M)`,
      groupId,
    };
  }

  // Under $1M: 1 approver from same group or Treasury
  return {
    steps: [
      { step: 1, approver_pool: 'group_or_treasury', group_id: groupId, approver_role: 'any' },
    ],
    description: `${groupName} (1 approver)`,
    groupId,
  };
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
 * - Initiator cannot approve own payment
 * - Payroll requestor-only users cannot approve ANY payment
 * - For $1M+ payments, second approver must be different from first
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
