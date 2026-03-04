import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { adminOnly } from '../middleware/rbac.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * GET /api/chains/:ruleId
 * Get approval chain for a routing rule
 */
router.get('/:ruleId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ruleId } = req.params;

    // Verify rule exists
    const { rows: rules } = await query('SELECT id FROM routing_rules WHERE id = $1', [ruleId]);
    if (rules.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Routing rule not found',
      });
      return;
    }

    const { rows } = await query(
      `SELECT ac.*, u.name as approver_name, u.email as approver_email
       FROM approval_chains ac
       LEFT JOIN users u ON ac.specific_approver_id = u.id
       WHERE ac.rule_id = $1
       ORDER BY ac.step`,
      [ruleId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting approval chain', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get approval chain',
    });
  }
});

/**
 * PUT /api/chains/:ruleId
 * Update approval chain for a routing rule
 */
router.put('/:ruleId', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { chains } = req.body;
    const admin = req.user!;

    if (!Array.isArray(chains)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Chains must be an array',
      });
      return;
    }

    // Verify rule exists
    const { rows: rules } = await query('SELECT * FROM routing_rules WHERE id = $1', [ruleId]);
    if (rules.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Routing rule not found',
      });
      return;
    }

    // Get existing chains for audit
    const { rows: existingChains } = await query(
      'SELECT * FROM approval_chains WHERE rule_id = $1 ORDER BY step',
      [ruleId]
    );

    // Delete existing chains
    await query('DELETE FROM approval_chains WHERE rule_id = $1', [ruleId]);

    // Insert new chains
    for (const chain of chains) {
      await query(
        `INSERT INTO approval_chains (rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          ruleId,
          chain.step,
          chain.approver_role || null,
          chain.specific_approver_id || null,
          chain.escalation_hours || 24,
          chain.escalation_role || null,
        ]
      );
    }

    // Log audit entry
    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.CHAIN_UPDATED, {
      tableName: 'approval_chains',
      recordId: ruleId,
      oldValues: { chains: existingChains } as Record<string, unknown>,
      newValues: { chains } as Record<string, unknown>,
    });

    // Fetch updated chains
    const { rows: updatedChains } = await query(
      'SELECT * FROM approval_chains WHERE rule_id = $1 ORDER BY step',
      [ruleId]
    );

    res.json({
      success: true,
      message: 'Approval chain updated',
      data: updatedChains,
    });
  } catch (error) {
    logger.error('Error updating approval chain', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update approval chain',
    });
  }
});

export default router;
