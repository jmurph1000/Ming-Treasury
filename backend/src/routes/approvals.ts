import { Router, Response } from 'express';
import { query, transaction } from '../config/sqlite.js';
import { AuthenticatedRequest, PaymentApprovalRow } from '../types/index.js';
import { validate, approvalActionSchema, rejectPaymentSchema, returnPaymentSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS, getClientIp } from '../middleware/audit.js';
import { canApprove, canApproveForRole } from '../middleware/rbac.js';
import { approvalRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * GET /api/approvals
 * List pending approvals for current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Get approvals where user's role matches and it's their turn
    const { rows } = await query(
      `SELECT p.*,
              pa.id as approval_id, pa.step_number, pa.approver_role, pa.notified_at,
              u.name as requester_name,
              a.name as account_name
       FROM payment_approvals pa
       JOIN payments p ON pa.payment_id = p.id
       LEFT JOIN users u ON p.requester_id = u.id
       LEFT JOIN accounts a ON p.account_id = a.id
       WHERE pa.action = 'pending'
       AND pa.step_number = p.current_approval_step
       AND (pa.approver_role = $1 OR pa.approver_id = $2)
       AND p.status = 'pending_approval'
       ORDER BY pa.notified_at ASC NULLS LAST`,
      [user.role, user.id]
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

    // Check role permission
    if (!canApproveForRole(user.role, approval.approver_role as any)) {
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

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_APPROVED, {
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
    const { rows: approvalRows } = await query<PaymentApprovalRow & { current_approval_step: number }>(
      `SELECT pa.*, p.current_approval_step
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

    await transaction(async (client) => {
      // Update approval record
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

      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = 'rejected',
             updated_at = datetime('now')
         WHERE id = $1`,
        [approval.payment_id]
      );

      // TODO: Notify requester via Gmail MCP
    });

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_REJECTED, {
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

    // Get approval
    const { rows: approvalRows } = await query<PaymentApprovalRow & { current_approval_step: number }>(
      `SELECT pa.*, p.current_approval_step
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

    await transaction(async (client) => {
      // Update approval record
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

      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = 'returned',
             updated_at = datetime('now')
         WHERE id = $1`,
        [approval.payment_id]
      );

      // TODO: Notify requester via Gmail MCP
    });

    // Log audit entry
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

export default router;
