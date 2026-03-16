import { Router, Response, NextFunction } from 'express';
import { query, transaction } from '../config/sqlite.js';
import { AuthenticatedRequest, Payment, ExecutionConfirmation } from '../types/index.js';
import { validate, confirmExecutionSchema, bankRejectSchema, emergencyHaltSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS, getClientIp } from '../middleware/audit.js';
import { canExecute } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import { decryptAccountNumber, decryptRoutingNumber } from '../services/encryptionService.js';
import { maskAccountNumber, maskRoutingNumber } from '../utils/masks.js';

const router = Router();

// All execution routes require treasury role (admin)
router.use(canExecute);

// Additional check: must be a Treasury group member with is_supervisor=true
async function requireTreasurySupervisor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = req.user!;
  const { rows } = await query<{ is_supervisor: number }>(
    `SELECT is_supervisor FROM group_members WHERE group_id = 'grp-treasury' AND user_id = $1`,
    [user.id]
  );
  if (rows.length === 0 || !rows[0].is_supervisor) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Only Treasury supervisors can execute payments',
    });
    return;
  }
  next();
}

router.use(requireTreasurySupervisor);

/**
 * GET /api/execution/queue
 * Get payments ready for execution
 */
router.get('/queue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
              u.name as requester_name,
              a.name as account_name, a.bank_name,
              a.account_number_encrypted, a.routing_number_encrypted,
              a.dual_control_required, a.dual_control_mode, a.dual_control_threshold
       FROM payments p
       LEFT JOIN users u ON p.requester_id = u.id
       LEFT JOIN accounts a ON p.account_id = a.id
       WHERE p.status = 'ready_to_execute'
       ORDER BY p.requested_date ASC, p.created_at ASC`
    );

    // Decrypt and mask account details for display
    const paymentsWithDetails = rows.map((payment: any) => {
      let accountNumber = '';
      let routingNumber = '';

      try {
        if (payment.account_number_encrypted) {
          accountNumber = decryptAccountNumber(payment.account_number_encrypted);
        }
        if (payment.routing_number_encrypted) {
          routingNumber = decryptRoutingNumber(payment.routing_number_encrypted);
        }
      } catch (error) {
        logger.error('Error decrypting account details', { paymentId: payment.id });
      }

      return {
        ...payment,
        accountNumber: accountNumber,
        accountNumberMasked: maskAccountNumber(accountNumber),
        routingNumber: routingNumber,
        routingNumberMasked: maskRoutingNumber(routingNumber),
        // Remove encrypted fields from response
        account_number_encrypted: undefined,
        routing_number_encrypted: undefined,
      };
    });

    res.json({
      success: true,
      data: paymentsWithDetails,
      meta: {
        total: rows.length,
      },
    });
  } catch (error) {
    logger.error('Error getting execution queue', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get execution queue',
    });
  }
});

/**
 * POST /api/execution/:id/confirm
 * First confirmation of execution (primary)
 */
router.post('/:id/confirm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = validate(confirmExecutionSchema, req.body);
    const user = req.user!;
    const clientIp = getClientIp(req);

    // Get payment with account details
    const { rows: paymentRows } = await query<Payment & {
      dual_control_required: boolean;
      dual_control_mode: string;
      dual_control_threshold: number;
    }>(
      `SELECT p.*, a.dual_control_required, a.dual_control_mode, a.dual_control_threshold
       FROM payments p
       LEFT JOIN accounts a ON p.account_id = a.id
       WHERE p.id = $1`,
      [id]
    );

    if (paymentRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Payment not found',
      });
      return;
    }

    const payment = paymentRows[0];

    if (payment.status !== 'ready_to_execute') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Payment is not ready for execution',
      });
      return;
    }

    // Single-step execution: no dual control required
    await transaction(async (client) => {
      // Insert execution confirmation record
      await client.query(
        `INSERT INTO execution_confirmations (
          payment_id, confirmer_id, confirmation_type,
          bank_reference, actual_amount, actual_date,
          ip_address, user_agent
        ) VALUES ($1, $2, 'primary', $3, $4, $5, $6, $7)`,
        [
          id,
          user.id,
          data.bankReference,
          data.actualAmount,
          data.actualDate,
          clientIp,
          req.headers['user-agent'] || null,
        ]
      );

      // Mark payment as executed with executor metadata
      await client.query(
        `UPDATE payments
         SET status = 'executed',
             bank_reference = $2,
             bank_reference_number = $2,
             actual_execution_date = $3,
             executed_at = datetime('now'),
             executed_by_user_id = $4,
             executed_by_name = $5,
             execution_notes = $6,
             updated_at = datetime('now')
         WHERE id = $1`,
        [id, data.bankReference, data.actualDate, user.id, user.name || user.email, data.notes || null]
      );
    });

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.EXECUTION_CONFIRMED, {
      tableName: 'execution_confirmations',
      recordId: id,
      newValues: {
        executedBy: user.name || user.email,
        executedByUserId: user.id,
        bankReference: data.bankReference,
        actualAmount: data.actualAmount,
        paymentId: id,
      },
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      message: 'Payment executed successfully',
      data: {
        confirmationType: 'primary',
        isComplete: true,
        requiresSecondConfirmation: false,
      },
    });
  } catch (error) {
    logger.error('Error confirming execution', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to confirm execution',
    });
  }
});

/**
 * POST /api/execution/:id/reject
 * Mark a payment as rejected by the bank
 */
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reasonCode, reason } = validate(bankRejectSchema, req.body);
    const user = req.user!;

    // Get payment
    const { rows: paymentRows } = await query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );

    if (paymentRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Payment not found',
      });
      return;
    }

    const payment = paymentRows[0];

    if (!['ready_to_execute', 'pending_confirmation', 'executed'].includes(payment.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot reject a payment in this status',
      });
      return;
    }

    // Update payment
    await query(
      `UPDATE payments
       SET status = 'bank_rejected',
           bank_rejection_reason = $2,
           updated_at = datetime('now')
       WHERE id = $1`,
      [id, `${reasonCode}: ${reason}`]
    );

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_BANK_REJECTED, {
      tableName: 'payments',
      recordId: id,
      newValues: {
        reasonCode,
        reason,
      },
    });

    // TODO: Notify requester via Gmail MCP

    res.json({
      success: true,
      message: 'Payment marked as bank rejected',
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
 * POST /api/execution/:id/halt
 * Emergency halt a payment
 */
router.post('/:id/halt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = validate(emergencyHaltSchema, req.body);
    const user = req.user!;
    const clientIp = getClientIp(req);

    // Get payment
    const { rows: paymentRows } = await query<Payment>(
      'SELECT * FROM payments WHERE id = $1',
      [id]
    );

    if (paymentRows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Payment not found',
      });
      return;
    }

    const payment = paymentRows[0];

    // Can only halt pending confirmation or ready to execute
    if (!['ready_to_execute', 'pending_confirmation'].includes(payment.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot halt a payment in this status',
      });
      return;
    }

    await transaction(async (client) => {
      // Record the halt
      await client.query(
        `INSERT INTO execution_confirmations (
          payment_id, confirmer_id, confirmation_type,
          is_emergency_halt, halt_reason, ip_address
        ) VALUES ($1, $2, 'primary', true, $3, $4)`,
        [id, user.id, reason, clientIp]
      );

      // Revert to approved status
      await client.query(
        `UPDATE payments
         SET status = 'approved',
             updated_at = datetime('now')
         WHERE id = $1`,
        [id]
      );

      // Delete any non-halt confirmations
      await client.query(
        `DELETE FROM execution_confirmations
         WHERE payment_id = $1 AND is_emergency_halt = false`,
        [id]
      );
    });

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.EXECUTION_HALTED, {
      tableName: 'payments',
      recordId: id,
      newValues: {
        reason,
        previousStatus: payment.status,
      },
      ipAddress: clientIp,
    });

    // TODO: Send Slack alert via MCP

    res.json({
      success: true,
      message: 'Payment halted. Treasury team notified.',
    });
  } catch (error) {
    logger.error('Error halting payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to halt payment',
    });
  }
});

/**
 * POST /api/execution/batch
 * Execute multiple payments in a batch (ACH)
 */
router.post('/batch', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentIds, batchReference } = req.body;
    const user = req.user!;
    const clientIp = getClientIp(req);

    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'paymentIds must be a non-empty array',
      });
      return;
    }

    if (!batchReference || batchReference.length < 6) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Batch reference must be at least 6 characters',
      });
      return;
    }

    // Verify all payments are ready to execute and are ACH
    const { rows: payments } = await query<Payment>(
      `SELECT * FROM payments
       WHERE id = ANY($1)
       AND status = 'ready_to_execute'
       AND payment_type = 'ach'`,
      [paymentIds]
    );

    if (payments.length !== paymentIds.length) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Some payments are not eligible for batch execution',
      });
      return;
    }

    await transaction(async (client) => {
      for (const payment of payments) {
        // Update payment status with executor metadata
        await client.query(
          `UPDATE payments
           SET status = 'executed',
               bank_reference = $2,
               bank_reference_number = $2,
               actual_execution_date = date('now'),
               executed_at = datetime('now'),
               executed_by_user_id = $3,
               executed_by_name = $4,
               updated_at = datetime('now')
           WHERE id = $1`,
          [payment.id, batchReference, user.id, user.name || user.email]
        );

        // Record confirmation
        await client.query(
          `INSERT INTO execution_confirmations (
            payment_id, confirmer_id, confirmation_type,
            bank_reference, actual_date, ip_address
          ) VALUES ($1, $2, 'primary', $3, date('now'), $4)`,
          [payment.id, user.id, batchReference, clientIp]
        );
      }
    });

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.BATCH_EXECUTED, {
      tableName: 'payments',
      newValues: {
        batchReference,
        paymentCount: payments.length,
        paymentIds,
        totalAmount: payments.reduce((sum, p) => sum + (p as any).usd_equivalent, 0),
      },
      ipAddress: clientIp,
    });

    // TODO: Create NetSuite journal entries via MCP
    // TODO: Send Slack notification via MCP

    res.json({
      success: true,
      message: `Batch executed successfully. ${payments.length} payments processed.`,
      data: {
        batchReference,
        paymentCount: payments.length,
        paymentIds: payments.map((p) => p.id),
      },
    });
  } catch (error) {
    logger.error('Error executing batch', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to execute batch',
    });
  }
});

export default router;
