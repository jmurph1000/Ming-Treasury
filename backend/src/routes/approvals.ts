import { Router, Response } from 'express';
import { query, transaction } from '../config/sqlite.js';
import { AuthenticatedRequest, PaymentApprovalRow } from '../types/index.js';
import { validate, approvalActionSchema, rejectPaymentSchema, returnPaymentSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS, getClientIp } from '../middleware/audit.js';
import { canApprove, canApproveForRole, adminOnly } from '../middleware/rbac.js';
import { approvalRateLimit } from '../middleware/rateLimit.js';
import { checkPoolEligibility, isPaymentInitiator } from '../services/approvalEligibility.js';
import { canUserApprovePayment } from '../services/approvalRules.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import type { ApproverPool } from '../types/index.js';

const router = Router();

/**
 * GET /api/approvals
 * List pending approvals for current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Get approvals where user is eligible (pool-based or legacy role/id match)
    // Excludes payments where the user is the initiator (self-approval prevention)
    const { rows } = await query(
      `SELECT p.*,
              pa.id as approval_id, pa.step_number, pa.approver_role, pa.notified_at,
              pa.approver_pool, pa.group_id,
              u.name as requester_name,
              a.name as account_name
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       LEFT JOIN users u ON p.requester_id = u.id
       LEFT JOIN accounts a ON p.account_id = a.id
       WHERE pa.action = 'pending'
       AND pa.step_number = p.current_approval_step
       AND p.status = 'pending_approval'
       AND p.requester_id != $1
       AND (
         pa.approver_id = $1
         OR (pa.approver_pool IS NULL AND pa.approver_role = $2)
         OR (pa.approver_pool = 'group_or_treasury' AND (
           EXISTS (SELECT 1 FROM group_members tm WHERE tm.group_id = 'grp-treasury' AND tm.user_id = $1)
           OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = pa.group_id AND gm.user_id = $1 AND gm.role = 'initiator_approver')
         ))
         OR (pa.approver_pool = 'senior_or_treasury' AND (
           $2 = 'sr_manager'
           OR EXISTS (SELECT 1 FROM group_members tm WHERE tm.group_id = 'grp-treasury' AND tm.user_id = $1)
         ))
         OR (pa.approver_pool = 'treasury_only' AND EXISTS (SELECT 1 FROM group_members tm WHERE tm.group_id = 'grp-treasury' AND tm.user_id = $1))
       )
       ORDER BY pa.notified_at ASC NULLS LAST`,
      [user.id, user.role]
    );

    res.json({
      success: true,
      data: rows,
      meta: {
        total: rows.length,
      },
    });
  } catch (error) {
    logger.error('Error listing approvals', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to list approvals',
    });
  }
});

/**
 * GET /api/approvals/:id
 * Get approval details with payment info and comment thread
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get approval with payment details
    const { rows } = await query(
      `SELECT pa.*,
              p.id as payment_id, p.reference_number, p.payee_name, p.amount,
              p.currency, p.usd_equivalent, p.payment_type, p.status as payment_status,
              p.business_justification, p.requested_date, p.current_approval_step,
              p.total_approval_steps,
              u.name as requester_name, u.email as requester_email,
              a.name as account_name, a.bank_name
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       LEFT JOIN users u ON p.requester_id = u.id
       LEFT JOIN accounts a ON p.account_id = a.id
       WHERE pa.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = rows[0];

    // Get all approval steps for this payment
    const { rows: allApprovals } = await query(
      `SELECT pa.*, u.name as approver_name
       FROM payment_approvals pa
       LEFT JOIN users u ON pa.approver_id = u.id
       WHERE pa.payment_id = $1
       ORDER BY pa.step_number`,
      [approval.payment_id]
    );

    // Get comments
    const { rows: comments } = await query(
      `SELECT ac.*, u.name as user_name, u.role as user_role
       FROM approval_comments ac
       LEFT JOIN users u ON ac.user_id = u.id
       WHERE ac.payment_id = $1
       ORDER BY ac.created_at`,
      [approval.payment_id]
    );

    res.json({
      success: true,
      data: {
        ...approval,
        approvalHistory: allApprovals,
        comments,
      },
    });
  } catch (error) {
    logger.error('Error getting approval', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get approval',
    });
  }
});

/**
 * POST /api/approvals/:id/approve
 * Approve a payment
 */
router.post('/:id/approve', canApprove, approvalRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = validate(approvalActionSchema, req.body);
    const user = req.user!;
    const clientIp = getClientIp(req);

    // Get approval
    const { rows: approvalRows } = await query<PaymentApprovalRow & { current_approval_step: number; total_approval_steps: number; payment_status: string }>(
      `SELECT pa.*, p.current_approval_step, p.total_approval_steps, p.status as payment_status
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       WHERE pa.id = $1`,
      [id]
    );

    if (approvalRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = approvalRows[0];

    // Status gate: only pending_approval payments can be approved
    if (approval.payment_status !== 'pending_approval') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot approve payment — payment status is ${approval.payment_status}. Only payments in pending_approval status can be approved.`,
      });
      return;
    }

    // Comprehensive approval eligibility check (self-approval, payroll requestor-only, duplicate approver)
    const approvalCheck = await canUserApprovePayment(
      user.id, user.email, approval.payment_id, approval.group_id || null
    );
    if (!approvalCheck.allowed) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.SELF_APPROVAL,
        message: approvalCheck.reason || 'You are not authorized to approve this payment',
      });
      return;
    }

    // Check if it's the user's turn
    if (approval.step_number !== approval.current_approval_step) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.NOT_YOUR_TURN,
        message: 'It is not your turn to approve this payment',
      });
      return;
    }

    // Check if already actioned
    if (approval.action !== 'pending') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.ALREADY_APPROVED,
        message: 'This approval has already been processed',
      });
      return;
    }

    // Pool-based eligibility check or legacy role check
    if (approval.approver_pool) {
      const eligible = await checkPoolEligibility(
        user.id, user.role, approval.approver_pool as ApproverPool, approval.group_id || null
      );
      if (!eligible) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'You are not eligible to approve this payment based on the approval pool rules',
        });
        return;
      }
    } else if (!canApproveForRole(user.role, approval.approver_role as any)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'You do not have permission to approve at this level',
      });
      return;
    }

    await transaction(async (client) => {
      // Update approval record
      await client.query(
        `UPDATE payment_approvals
         SET action = 'approved',
             approver_id = $2,
             comment = $3,
             actioned_at = datetime('now'),
             ip_address = $4
         WHERE id = $1`,
        [id, user.id, comment || null, clientIp]
      );

      // Check if this was the final approval
      const isLastStep = approval.step_number === approval.total_approval_steps;

      if (isLastStep) {
        // All approvals complete - move to ready_to_execute
        await client.query(
          `UPDATE payments
           SET status = 'ready_to_execute',
               updated_at = datetime('now')
           WHERE id = $1`,
          [approval.payment_id]
        );
      } else {
        // Move to next step
        await client.query(
          `UPDATE payments
           SET current_approval_step = current_approval_step + 1,
               updated_at = datetime('now')
           WHERE id = $1`,
          [approval.payment_id]
        );

        // Notify next approver
        await client.query(
          `UPDATE payment_approvals
           SET notified_at = datetime('now')
           WHERE payment_id = $1 AND step_number = $2`,
          [approval.payment_id, approval.step_number + 1]
        );

        // TODO: Send email notification via Gmail MCP
      }
    });

    // Enhanced audit: capture approver group and sequence per Section 5
    const { rows: approverGroups } = await query<{ group_name: string }>(
      `SELECT g.name as group_name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1`,
      [user.id]
    );
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_APPROVED, {
      tableName: 'payment_approvals',
      recordId: id,
      newValues: {
        paymentId: approval.payment_id,
        approverName: user.name || user.email,
        approverGroup: approverGroups.map(g => g.group_name).join(', ') || 'None',
        approvalSequence: `Step ${approval.step_number} of ${approval.total_approval_steps}`,
        step: approval.step_number,
        comment,
      },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      message: approval.step_number === approval.total_approval_steps
        ? 'Payment approved and ready for execution'
        : 'Payment approved. Moving to next approval step.',
    });
  } catch (error) {
    logger.error('Error approving payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to approve payment',
    });
  }
});

/**
 * POST /api/approvals/:id/reject
 * Reject a payment
 */
router.post('/:id/reject', canApprove, approvalRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = validate(rejectPaymentSchema, req.body);
    const user = req.user!;
    const clientIp = getClientIp(req);

    // Get approval
    const { rows: approvalRows } = await query<PaymentApprovalRow & { current_approval_step: number; payment_status: string }>(
      `SELECT pa.*, p.current_approval_step, p.status as payment_status
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       WHERE pa.id = $1`,
      [id]
    );

    if (approvalRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = approvalRows[0];

    // Status gate: only pending_approval payments can be rejected
    if (approval.payment_status !== 'pending_approval') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot reject payment — payment status is ${approval.payment_status}. Only payments in pending_approval status can be rejected.`,
      });
      return;
    }

    // Comprehensive eligibility check for rejection
    const rejectCheck = await canUserApprovePayment(
      user.id, user.email, approval.payment_id, approval.group_id || null
    );
    if (!rejectCheck.allowed) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.SELF_APPROVAL,
        message: rejectCheck.reason || 'You are not authorized to reject this payment',
      });
      return;
    }

    // Check if it's the user's turn
    if (approval.step_number !== approval.current_approval_step) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.NOT_YOUR_TURN,
        message: 'It is not your turn to reject this payment',
      });
      return;
    }

    if (approval.action !== 'pending') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.ALREADY_APPROVED,
        message: 'This approval has already been processed',
      });
      return;
    }

    // Pool-based eligibility check
    if (approval.approver_pool) {
      const eligible = await checkPoolEligibility(
        user.id, user.role, approval.approver_pool as ApproverPool, approval.group_id || null
      );
      if (!eligible) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'You are not eligible to act on this payment',
        });
        return;
      }
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE payment_approvals
         SET action = 'rejected',
             approver_id = $2,
             comment = $3,
             actioned_at = datetime('now'),
             ip_address = $4
         WHERE id = $1`,
        [id, user.id, comment, clientIp]
      );

      await client.query(
        `UPDATE payments
         SET status = 'rejected',
             updated_at = datetime('now')
         WHERE id = $1`,
        [approval.payment_id]
      );
    });

    // Enhanced audit: capture rejector name and reason per Section 5
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_REJECTED, {
      tableName: 'payment_approvals',
      recordId: id,
      newValues: {
        paymentId: approval.payment_id,
        rejectorName: user.name || user.email,
        reason: comment,
        step: approval.step_number,
      },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      message: 'Payment rejected',
    });
  } catch (error) {
    logger.error('Error rejecting payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to reject payment',
    });
  }
});

/**
 * POST /api/approvals/:id/return
 * Return a payment for more information
 */
router.post('/:id/return', canApprove, approvalRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = validate(returnPaymentSchema, req.body);
    const user = req.user!;
    const clientIp = getClientIp(req);

    const { rows: approvalRows } = await query<PaymentApprovalRow & { current_approval_step: number; payment_status: string }>(
      `SELECT pa.*, p.current_approval_step, p.status as payment_status
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       WHERE pa.id = $1`,
      [id]
    );

    if (approvalRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = approvalRows[0];

    // Status gate: only pending_approval payments can be returned
    if (approval.payment_status !== 'pending_approval') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: `Cannot return payment — payment status is ${approval.payment_status}. Only payments in pending_approval status can be returned.`,
      });
      return;
    }

    if (approval.step_number !== approval.current_approval_step) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.NOT_YOUR_TURN,
        message: 'It is not your turn to return this payment',
      });
      return;
    }

    if (approval.action !== 'pending') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.ALREADY_APPROVED,
        message: 'This approval has already been processed',
      });
      return;
    }

    // Pool-based eligibility check
    if (approval.approver_pool) {
      const eligible = await checkPoolEligibility(
        user.id, user.role, approval.approver_pool as ApproverPool, approval.group_id || null
      );
      if (!eligible) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'You are not eligible to act on this payment',
        });
        return;
      }
    }

    await transaction(async (client) => {
      await client.query(
        `UPDATE payment_approvals
         SET action = 'returned',
             approver_id = $2,
             comment = $3,
             actioned_at = datetime('now'),
             ip_address = $4
         WHERE id = $1`,
        [id, user.id, comment, clientIp]
      );

      await client.query(
        `UPDATE payments
         SET status = 'returned',
             updated_at = datetime('now')
         WHERE id = $1`,
        [approval.payment_id]
      );
    });

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_RETURNED, {
      tableName: 'payment_approvals',
      recordId: id,
      newValues: {
        paymentId: approval.payment_id,
        step: approval.step_number,
        comment,
      },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      message: 'Payment returned for more information',
    });
  } catch (error) {
    logger.error('Error returning payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to return payment',
    });
  }
});

/**
 * POST /api/approvals/:id/comment
 * Add a comment to the approval thread
 */
router.post('/:id/comment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment, isInternal } = req.body;
    const user = req.user!;

    if (!comment || comment.trim().length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Comment is required',
      });
      return;
    }

    // Get approval to find payment_id
    const { rows: approvalRows } = await query<PaymentApprovalRow>(
      'SELECT * FROM payment_approvals WHERE id = $1',
      [id]
    );

    if (approvalRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = approvalRows[0];

    // Insert comment
    const { rows } = await query(
      `INSERT INTO approval_comments (payment_id, approval_id, user_id, comment, is_internal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [approval.payment_id, id, user.id, comment.trim(), isInternal || false]
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error adding comment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to add comment',
    });
  }
});

/**
 * POST /api/approvals/:id/reassign
 * Reassign a pending approval to a different approver (admin only)
 */
router.post('/:id/reassign', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newApproverId } = req.body;
    const user = req.user!;
    const clientIp = getClientIp(req);

    if (!newApproverId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'newApproverId is required',
      });
      return;
    }

    // Get approval
    const { rows: approvalRows } = await query<PaymentApprovalRow>(
      `SELECT pa.*, p.requester_id
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       WHERE pa.id = $1`,
      [id]
    );

    if (approvalRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Approval not found',
      });
      return;
    }

    const approval = approvalRows[0] as any;

    if (approval.action !== 'pending') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.ALREADY_APPROVED,
        message: 'Cannot reassign an approval that has already been processed',
      });
      return;
    }

    // Ensure new approver is not the initiator
    if (newApproverId === approval.requester_id) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.SELF_APPROVAL,
        message: 'Cannot reassign to the payment initiator',
      });
      return;
    }

    // Validate new approver is eligible per pool rules
    if (approval.approver_pool) {
      const { rows: newApprover } = await query<{ role: string }>(
        'SELECT role FROM users WHERE id = $1 AND status = $2',
        [newApproverId, 'active']
      );
      if (newApprover.length === 0) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'New approver not found or inactive',
        });
        return;
      }
      const eligible = await checkPoolEligibility(
        newApproverId, newApprover[0].role as any, approval.approver_pool as ApproverPool, approval.group_id || null
      );
      if (!eligible) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: 'New approver is not eligible for this approval pool',
        });
        return;
      }
    }

    const oldApproverId = approval.approver_id;

    await query(
      `UPDATE payment_approvals SET approver_id = $2, notified_at = datetime('now') WHERE id = $1`,
      [id, newApproverId]
    );

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.APPROVAL_REASSIGNED, {
      tableName: 'payment_approvals',
      recordId: id,
      oldValues: { approverId: oldApproverId },
      newValues: { approverId: newApproverId, paymentId: approval.payment_id },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      message: 'Approval reassigned successfully',
    });
  } catch (error) {
    logger.error('Error reassigning approval', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to reassign approval',
    });
  }
});

export default router;
