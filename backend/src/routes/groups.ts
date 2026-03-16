import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { hasRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import { syncUserAfterGroupChange, syncGroupMembers } from '../services/accountAccessSync.js';

const router = Router();
const treasuryOnly = hasRole('admin');

/**
 * GET /api/groups
 * List all groups with member count and account count
 */
router.get('/', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT
        g.*,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
        (SELECT COUNT(DISTINCT ga.account_id) FROM group_accounts ga WHERE ga.group_id = g.id) AS account_count
      FROM groups g
      ORDER BY g.name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing groups', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/groups/:id
 * Get group with members and account assignments
 */
router.get('/:id', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { rows: groupRows } = await query('SELECT * FROM groups WHERE id = $1', [id]);
    if (groupRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Group not found' });
      return;
    }

    const { rows: members } = await query(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.department, u.title,
             gm.created_at AS added_at,
             gm.role AS group_role,
             gm.is_supervisor
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY u.name
    `, [id]);

    const { rows: accounts } = await query(`
      SELECT a.id, a.name, a.bank_name, a.account_type, a.currency,
             ga.direction, ga.funding_type, ga.id AS assignment_id
      FROM group_accounts ga
      JOIN accounts a ON a.id = ga.account_id
      WHERE ga.group_id = $1
      ORDER BY a.name
    `, [id]);

    res.json({
      success: true,
      data: { ...groupRows[0], members, accounts },
    });
  } catch (error) {
    logger.error('Error getting group', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * POST /api/groups/:id/members
 * Add a user to a group
 */
router.post('/:id/members', treasuryOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role: memberRole, isSupervisor } = req.body;
    const admin = req.user!;

    if (!userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'userId is required' });
      return;
    }

    const gmRole = memberRole === 'requestor_only' ? 'requestor_only' : 'initiator_approver';
    const gmSupervisor = isSupervisor ? 1 : 0;

    await query(
      'INSERT OR IGNORE INTO group_members (group_id, user_id, added_by, role, is_supervisor) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, admin.id, gmRole, gmSupervisor]
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
      tableName: 'group_members',
      recordId: id,
      newValues: { action: 'member_added', userId, groupId: id },
    });

    // Sync account access overrides for the added user
    await syncUserAfterGroupChange(userId, admin.id, admin.email);

    res.json({ success: true, message: 'User added to group' });
  } catch (error) {
    logger.error('Error adding group member', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove a user from a group
 */
router.delete('/:id/members/:userId', treasuryOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const admin = req.user!;

    await query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
      tableName: 'group_members',
      recordId: id,
      newValues: { action: 'member_removed', userId, groupId: id },
    });

    // Sync account access overrides for the removed user
    await syncUserAfterGroupChange(userId, admin.id, admin.email);

    res.json({ success: true, message: 'User removed from group' });
  } catch (error) {
    logger.error('Error removing group member', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * PUT /api/groups/:id/accounts
 * Set account assignments for a group (replaces all)
 */
router.put('/:id/accounts', treasuryOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { accounts } = req.body; // Array of { accountId, direction, fundingType }
    const admin = req.user!;

    if (!Array.isArray(accounts)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'accounts array is required' });
      return;
    }

    // Validate
    for (const a of accounts) {
      if (!a.accountId || !['from', 'to', 'both'].includes(a.direction) || !['internal', 'external', 'both'].includes(a.fundingType)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Each account must have accountId, direction (from/to/both), and fundingType (internal/external/both)',
        });
        return;
      }
    }

    // Replace all assignments
    await query('DELETE FROM group_accounts WHERE group_id = $1', [id]);

    for (const a of accounts) {
      await query(
        'INSERT INTO group_accounts (group_id, account_id, direction, funding_type, added_by) VALUES ($1, $2, $3, $4, $5)',
        [id, a.accountId, a.direction, a.fundingType, admin.id]
      );
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_UPDATED, {
      tableName: 'group_accounts',
      recordId: id,
      newValues: { accounts },
    });

    // Sync account access overrides for all members of this group
    await syncGroupMembers(id, admin.id, admin.email);

    res.json({ success: true, message: 'Group account access updated' });
  } catch (error) {
    logger.error('Error updating group accounts', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * POST /api/groups/:id/accounts
 * Add accounts to a group without removing existing assignments (admin only)
 * (PUT replaces all, POST adds incrementally)
 */
router.post('/:id/accounts', treasuryOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { accounts } = req.body; // Array of { accountId, direction, fundingType }
    const admin = req.user!;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'accounts array is required and must not be empty' });
      return;
    }

    // Verify group exists
    const { rows: groupRows } = await query('SELECT id, name FROM groups WHERE id = $1', [id]);
    if (groupRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Group not found' });
      return;
    }

    for (const a of accounts) {
      if (!a.accountId || !['from', 'to', 'both'].includes(a.direction) || !['internal', 'external', 'both'].includes(a.fundingType)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'Each account must have accountId, direction (from/to/both), and fundingType (internal/external/both)',
        });
        return;
      }
    }

    let addedCount = 0;
    for (const a of accounts) {
      // Skip if already assigned with same direction
      const { rows: existing } = await query(
        'SELECT id FROM group_accounts WHERE group_id = $1 AND account_id = $2 AND direction = $3',
        [id, a.accountId, a.direction]
      );
      if (existing.length > 0) continue;

      await query(
        'INSERT INTO group_accounts (group_id, account_id, direction, funding_type, added_by) VALUES ($1, $2, $3, $4, $5)',
        [id, a.accountId, a.direction, a.fundingType, admin.id]
      );
      addedCount++;
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_UPDATED, {
      tableName: 'group_accounts',
      recordId: id,
      newValues: { accountsAdded: accounts, addedCount },
    });

    // Sync account access for all members of this group
    await syncGroupMembers(id, admin.id, admin.email);

    res.json({ success: true, message: `${addedCount} account(s) added to group "${groupRows[0].name}"` });
  } catch (error) {
    logger.error('Error adding accounts to group', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/groups/user/:userId/memberships
 * Get all groups a user belongs to (used by payment form for account filtering)
 */
router.get('/user/:userId/memberships', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const { rows } = await query(`
      SELECT g.id, g.name, g.slug
      FROM group_members gm
      JOIN groups g ON g.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY g.name
    `, [userId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting user memberships', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/groups/:id/approval-flow
 * Returns routing config + tiers + steps + change history for a group
 */
router.get('/:id/approval-flow', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { rows: groupRows } = await query(
      `SELECT id, override_approval_flow, approval_trigger_mode,
              routing_mode, approval_chain_option
       FROM groups WHERE id = $1`,
      [id]
    );
    if (groupRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Group not found' });
      return;
    }

    const group = groupRows[0];

    // Get tiers with their steps
    const { rows: tiers } = await query(
      `SELECT * FROM group_approval_tiers WHERE group_id = $1 ORDER BY sort_order`,
      [id]
    );

    const tiersWithSteps: any[] = [];
    for (const tier of tiers) {
      const { rows: steps } = await query(
        `SELECT gas.*, u.name AS approver_name, u.email AS approver_email
         FROM group_approval_steps gas
         LEFT JOIN users u ON u.id = gas.specific_approver_id
         WHERE gas.tier_id = $1
         ORDER BY gas.step`,
        [tier.id]
      );
      tiersWithSteps.push({ ...tier, steps });
    }

    // Get change history
    const { rows: changeHistory } = await query(
      `SELECT grcl.*, u.name AS changed_by_name
       FROM group_routing_change_log grcl
       LEFT JOIN users u ON u.id = grcl.changed_by
       WHERE grcl.group_id = $1
       ORDER BY grcl.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        overrideApprovalFlow: !!group.override_approval_flow,
        approvalTriggerMode: group.approval_trigger_mode || 'flat',
        routingMode: group.routing_mode || 'approval_chain',
        approvalChainOption: group.approval_chain_option || 'one_approver',
        tiers: tiersWithSteps,
        changeHistory,
      },
    });
  } catch (error) {
    logger.error('Error getting group approval flow', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/groups/:id/routing-history
 * Get routing change history for a group
 */
router.get('/:id/routing-history', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT grcl.*, u.name AS changed_by_name
       FROM group_routing_change_log grcl
       LEFT JOIN users u ON u.id = grcl.changed_by
       WHERE grcl.group_id = $1
       ORDER BY grcl.created_at DESC
       LIMIT 50`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting routing history', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * PUT /api/groups/:id/approval-flow
 * Replace entire approval flow / routing config atomically
 */
router.put('/:id/approval-flow', treasuryOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    const { overrideApprovalFlow, routingMode, approvalChainOption, tiers } = req.body;

    // Validate group exists and get old config for change log
    const { rows: groupRows } = await query(
      `SELECT id, override_approval_flow, routing_mode, approval_chain_option, approval_trigger_mode FROM groups WHERE id = $1`,
      [id]
    );
    if (groupRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Group not found' });
      return;
    }

    const oldConfig = groupRows[0];

    // Validate routing mode
    const validRoutingModes = ['approval_chain', 'routing_rules'];
    const effectiveRoutingMode = routingMode || 'approval_chain';
    if (!validRoutingModes.includes(effectiveRoutingMode)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false, error: ERROR_CODES.VALIDATION_ERROR,
        message: 'routingMode must be "approval_chain" or "routing_rules"',
      });
      return;
    }

    // Validate chain option
    if (effectiveRoutingMode === 'approval_chain') {
      const validOptions = ['one_approver', 'two_approvers'];
      if (approvalChainOption && !validOptions.includes(approvalChainOption)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false, error: ERROR_CODES.VALIDATION_ERROR,
          message: 'approvalChainOption must be "one_approver" or "two_approvers"',
        });
        return;
      }
    }

    // Validate tiers for routing_rules mode
    if (overrideApprovalFlow && effectiveRoutingMode === 'routing_rules' && Array.isArray(tiers)) {
      for (const tier of tiers) {
        if (!Array.isArray(tier.steps) || tier.steps.length === 0) {
          res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false, error: ERROR_CODES.VALIDATION_ERROR,
            message: `Tier "${tier.label}" must have at least one approval step`,
          });
          return;
        }
        for (const step of tier.steps) {
          const validPools = ['group_or_treasury', 'senior_or_treasury', 'treasury_only'];
          if (step.approverPool && !validPools.includes(step.approverPool)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false, error: ERROR_CODES.VALIDATION_ERROR,
              message: `Invalid approver pool "${step.approverPool}" in tier "${tier.label}"`,
            });
            return;
          }
        }
      }

      // Validate no amount gaps for threshold mode
      if (tiers.length > 1) {
        const sorted = [...tiers].sort((a: any, b: any) => (a.minAmount || 0) - (b.minAmount || 0));
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          if (prev.maxAmount !== null && curr.minAmount !== null && curr.minAmount > prev.maxAmount + 0.01) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
              success: false, error: ERROR_CODES.VALIDATION_ERROR,
              message: `Amount gap between tiers "${prev.label}" and "${curr.label}"`,
            });
            return;
          }
        }
      }
    }

    // Map routing_mode to legacy approval_trigger_mode for backward compat
    const legacyTriggerMode = effectiveRoutingMode === 'approval_chain' ? 'flat' : 'amount_threshold';

    // Update group settings
    await query(
      `UPDATE groups
       SET override_approval_flow = $2,
           approval_trigger_mode = $3,
           routing_mode = $4,
           approval_chain_option = $5,
           updated_at = datetime('now')
       WHERE id = $1`,
      [id, overrideApprovalFlow ? 1 : 0, legacyTriggerMode, effectiveRoutingMode, approvalChainOption || 'one_approver']
    );

    // Delete old tiers and steps
    const { rows: oldTiers } = await query('SELECT id FROM group_approval_tiers WHERE group_id = $1', [id]);
    for (const oldTier of oldTiers) {
      await query('DELETE FROM group_approval_steps WHERE tier_id = $1', [oldTier.id]);
    }
    await query('DELETE FROM group_approval_tiers WHERE group_id = $1', [id]);

    // Insert new tiers and steps for routing_rules mode
    if (overrideApprovalFlow && effectiveRoutingMode === 'routing_rules' && Array.isArray(tiers)) {
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const { rows: tierRows } = await query(
          `INSERT INTO group_approval_tiers (group_id, label, min_amount, max_amount, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [id, tier.label, tier.minAmount ?? null, tier.maxAmount ?? null, i]
        );
        const tierId = tierRows[0].id;

        for (const step of tier.steps) {
          await query(
            `INSERT INTO group_approval_steps (tier_id, step, approver_mode, approver_role, specific_approver_id, escalation_hours, approver_pool)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tierId, step.step, step.approverMode || 'pool', step.approverRole || null,
             step.specificApproverId || null, step.escalationHours || 24, step.approverPool || 'group_or_treasury']
          );
        }
      }
    }

    // Log change to routing change log
    const newConfig = { overrideApprovalFlow, routingMode: effectiveRoutingMode, approvalChainOption, tierCount: tiers?.length || 0 };
    await query(
      `INSERT INTO group_routing_change_log (group_id, changed_by, changed_by_email, change_type, old_config, new_config)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, admin.id, admin.email, 'routing_config_updated',
       JSON.stringify({ routingMode: oldConfig.routing_mode, approvalChainOption: oldConfig.approval_chain_option, overrideApprovalFlow: !!oldConfig.override_approval_flow }),
       JSON.stringify(newConfig)]
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.GROUP_ROUTING_CONFIG_CHANGED, {
      tableName: 'groups',
      recordId: id,
      oldValues: { routingMode: oldConfig.routing_mode, approvalChainOption: oldConfig.approval_chain_option },
      newValues: newConfig,
    });

    res.json({ success: true, message: 'Group routing configuration updated' });
  } catch (error) {
    logger.error('Error updating group approval flow', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
