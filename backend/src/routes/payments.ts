import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest, PaymentRow, RoutingRuleRow, ApprovalChainRow } from '../types/index.js';
import { validate, createPaymentSchema, updatePaymentSchema, paymentFilterSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { getUserPaymentLimit } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS, PAGINATION } from '../config/constants.js';

const router = Router();

/**
 * GET /api/payments
 * List payments with filtering and pagination
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = validate(paymentFilterSchema, req.query);
    const user = req.user!;

    let baseQuery = `
      SELECT p.*,
             u.name as requester_name,
             a.name as account_name,
             sp.name as saved_payee_name
      FROM payments p
      LEFT JOIN users u ON p.requester_id = u.id
      LEFT JOIN accounts a ON p.account_id = a.id
      LEFT JOIN saved_payees sp ON p.payee_id = sp.id
    `;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (user.role === 'ap_staff') {
      conditions.push(`p.requester_id = $${paramIndex++}`);
      params.push(user.id);
    }

    if (filters.status) {
      conditions.push(`p.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.paymentType) {
      conditions.push(`p.payment_type = $${paramIndex++}`);
      params.push(filters.paymentType);
    }

    if (filters.accountId) {
      conditions.push(`p.account_id = $${paramIndex++}`);
      params.push(filters.accountId);
    }

    if (filters.startDate) {
      conditions.push(`p.created_at >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`p.created_at <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(`(p.payee_name LIKE $${paramIndex} OR p.reference_number LIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.minAmount !== undefined) {
      conditions.push(`p.usd_equivalent >= $${paramIndex++}`);
      params.push(filters.minAmount);
    }

    if (filters.maxAmount !== undefined) {
      conditions.push(`p.usd_equivalent <= $${paramIndex++}`);
      params.push(filters.maxAmount);
    }

    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const sortColumn = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    const allowedSortColumns = ['created_at', 'requested_date', 'amount', 'payee_name', 'status'];
    const safeSortColumn = allowedSortColumns.includes(sortColumn) ? sortColumn : 'created_at';
    baseQuery += ` ORDER BY p.${safeSortColumn} ${sortOrder.toUpperCase()}`;

    const countQuery = `SELECT COUNT(*) as total FROM payments p ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
    const { rows: countRows } = await query<{ total: string }>(countQuery, params);
    const total = parseInt(countRows[0].total, 10);

    const page = filters.page || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(filters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
    const offset = (page - 1) * limit;

    baseQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const { rows } = await query<PaymentRow & { requester_name: string; account_name: string }>(baseQuery, params);

    // Add waiting_on info for pending payments
    const paymentIds = rows.filter(p => p.status === 'pending_approval').map(p => p.id);
    const waitingOnMap: Record<string, { role: string; name: string | null }> = {};
    if (paymentIds.length > 0) {
      for (const pid of paymentIds) {
        const { rows: waitRows } = await query<{ approver_role: string; approver_name: string | null }>(
          `SELECT pa.approver_role, u.name as approver_name
           FROM payment_approvals pa
           LEFT JOIN users u ON pa.approver_id = u.id
           JOIN payments p ON p.id = pa.payment_id
           WHERE pa.payment_id = $1 AND pa.action = 'pending' AND pa.step_number = p.current_approval_step
           LIMIT 1`,
          [pid]
        );
        if (waitRows.length > 0) {
          waitingOnMap[pid] = { role: waitRows[0].approver_role, name: waitRows[0].approver_name };
        }
      }
    }

    const enrichedRows = rows.map(row => ({
      ...row,
      waiting_on: waitingOnMap[row.id] || null,
    }));

    res.json({
      success: true,
      data: enrichedRows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Error listing payments', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to list payments',
    });
  }
});

/**
 * POST /api/payments
 * Create a new payment request
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = validate(createPaymentSchema, req.body);
    const user = req.user!;

    const limit = getUserPaymentLimit(user);
    if (limit !== null && data.amount > limit) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.PAYMENT_LIMIT_EXCEEDED,
        message: `Payment amount exceeds your limit of $${limit.toLocaleString()}`,
      });
      return;
    }

    let usdEquivalent = data.amount;
    let fxRate: number | undefined;

    if (data.currency !== 'USD') {
      const { rows: fxRows } = await query<{ rate: number }>(
        'SELECT rate FROM fx_rates WHERE base_currency = $1 AND target_currency = $2',
        [data.currency, 'USD']
      );

      if (fxRows.length === 0) {
        // Use a default rate if not found rather than failing
        usdEquivalent = data.amount;
      } else {
        fxRate = fxRows[0].rate;
        usdEquivalent = data.amount * fxRate;
      }
    }

    const duplicateWindow = 90;
    const { rows: duplicates } = await query<{ id: string; reference_number: string }>(
      `SELECT id, reference_number FROM payments
       WHERE payee_name = $1
       AND amount = $2
       AND currency = $3
       AND created_at > datetime('now', '-${duplicateWindow} days')
       AND status NOT IN ('cancelled', 'rejected', 'bank_rejected')`,
      [data.payeeName, data.amount, data.currency]
    );

    const isDuplicateFlagged = duplicates.length > 0;
    const duplicateReferenceId = isDuplicateFlagged ? duplicates[0].id : null;

    const { rows } = await query<PaymentRow>(
      `INSERT INTO payments (
        requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent,
        account_id, payment_type, funding_type,
        destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions,
        business_justification, requested_date,
        is_recurring, recurring_frequency, recurring_end_date, template_id,
        is_duplicate_flagged, duplicate_reference_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'draft')
      RETURNING *`,
      [
        user.id,
        data.payeeId || null,
        data.payeeName,
        data.amount,
        data.currency,
        fxRate || null,
        usdEquivalent,
        data.accountId,
        data.paymentType,
        data.fundingType,
        data.destinationAccountId || null,
        data.extBankName || null,
        data.extRoutingNumber || null,
        data.extBankAccount || null,
        data.extRecipientAddress || null,
        data.extSpecialInstructions || null,
        data.businessJustification,
        data.requestedDate,
        data.isRecurring ? 1 : 0,
        data.recurringFrequency || null,
        data.recurringEndDate || null,
        data.templateId || null,
        isDuplicateFlagged ? 1 : 0,
        duplicateReferenceId,
      ]
    );

    const payment = rows[0];

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_CREATED, {
      tableName: 'payments',
      recordId: payment.id,
      newValues: {
        referenceNumber: payment.reference_number,
        payeeName: payment.payee_name,
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: payment,
      warnings: isDuplicateFlagged
        ? [{ code: 'DUPLICATE_DETECTED', message: `Potential duplicate of payment ${duplicates[0].reference_number}` }]
        : undefined,
    });
  } catch (error) {
    logger.error('Error creating payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create payment',
    });
  }
});

/**
 * GET /api/payments/:id
 * Get payment details
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { rows } = await query<PaymentRow & { requester_name: string; account_name: string; destination_account_name: string }>(
      `SELECT p.*,
              u.name as requester_name, u.email as requester_email,
              a.name as account_name, a.bank_name,
              da.name as destination_account_name
       FROM payments p
       LEFT JOIN users u ON p.requester_id = u.id
       LEFT JOIN accounts a ON p.account_id = a.id
       LEFT JOIN accounts da ON p.destination_account_id = da.id
       WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Payment not found',
      });
      return;
    }

    const payment = rows[0];

    if (user.role === 'ap_staff' && payment.requester_id !== user.id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'You can only view your own payments',
      });
      return;
    }

    const { rows: approvals } = await query(
      `SELECT pa.*, u.name as approver_name
       FROM payment_approvals pa
       LEFT JOIN users u ON pa.approver_id = u.id
       WHERE pa.payment_id = $1
       ORDER BY pa.step_number`,
      [id]
    );

    const { rows: comments } = await query(
      `SELECT ac.*, u.name as user_name
       FROM approval_comments ac
       LEFT JOIN users u ON ac.user_id = u.id
       WHERE ac.payment_id = $1
       ORDER BY ac.created_at`,
      [id]
    );

    // Compute waiting_on for pending payments
    let waiting_on: { role: string; name: string | null } | null = null;
    if (payment.status === 'pending_approval' && payment.current_approval_step) {
      const { rows: waitRows } = await query<{ approver_role: string; approver_name: string | null }>(
        `SELECT pa.approver_role, u.name as approver_name
         FROM payment_approvals pa
         LEFT JOIN users u ON pa.approver_id = u.id
         WHERE pa.payment_id = $1 AND pa.action = 'pending' AND pa.step_number = $2
         LIMIT 1`,
        [id, payment.current_approval_step]
      );
      if (waitRows.length > 0) {
        waiting_on = { role: waitRows[0].approver_role, name: waitRows[0].approver_name };
      }
    }

    res.json({
      success: true,
      data: { ...payment, approvals, comments, waiting_on },
    });
  } catch (error) {
    logger.error('Error getting payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get payment',
    });
  }
});

/**
 * PUT /api/payments/:id
 * Update a draft payment
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = validate(updatePaymentSchema, req.body);
    const user = req.user!;

    const { rows: existing } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Payment not found' });
      return;
    }

    const payment = existing[0];

    if (payment.requester_id !== user.id && user.role !== 'admin') {
      res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: ERROR_CODES.FORBIDDEN, message: 'You can only edit your own payments' });
      return;
    }

    if (!['draft', 'returned'].includes(payment.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Only draft or returned payments can be edited' });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(`${snakeKey} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      res.json({ success: true, data: payment });
      return;
    }

    values.push(id);
    const { rows: updated } = await query<PaymentRow>(
      `UPDATE payments SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_UPDATED, {
      tableName: 'payments',
      recordId: id,
      oldValues: payment,
      newValues: updated[0],
    });

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    logger.error('Error updating payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update payment' });
  }
});

/**
 * POST /api/payments/:id/submit
 * Submit a payment for approval — FIXED: uses SQLite only, no PostgreSQL pool
 */
router.post('/:id/submit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { rows: existing } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Payment not found' });
      return;
    }

    const payment = existing[0];

    if (payment.requester_id !== user.id && user.role !== 'admin') {
      res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: ERROR_CODES.FORBIDDEN, message: 'You can only submit your own payments' });
      return;
    }

    if (!['draft', 'returned'].includes(payment.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Only draft or returned payments can be submitted' });
      return;
    }

    // --- Group-level approval flow override ---
    // Check if the requester belongs to a group with override_approval_flow = 1
    let groupOverrideUsed = false;
    let groupOverrideName: string | null = null;
    let chain: ApprovalChainRow[] = [];

    const { rows: userGroups } = await query<{ group_id: string; group_name: string; approval_trigger_mode: string }>(
      `SELECT g.id AS group_id, g.name AS group_name, g.approval_trigger_mode
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.user_id = $1 AND g.override_approval_flow = 1
       ORDER BY g.name
       LIMIT 1`,
      [payment.requester_id]
    );

    if (userGroups.length > 0) {
      const grp = userGroups[0];
      // Find matching tier based on payment amount
      let tierQuery: string;
      let tierParams: any[];

      if (grp.approval_trigger_mode === 'flat') {
        tierQuery = `SELECT * FROM group_approval_tiers WHERE group_id = $1 ORDER BY sort_order LIMIT 1`;
        tierParams = [grp.group_id];
      } else {
        tierQuery = `SELECT * FROM group_approval_tiers
                     WHERE group_id = $1
                       AND (min_amount IS NULL OR min_amount <= $2)
                       AND (max_amount IS NULL OR max_amount >= $2)
                     ORDER BY sort_order LIMIT 1`;
        tierParams = [grp.group_id, payment.usd_equivalent];
      }

      const { rows: tiers } = await query(tierQuery, tierParams);

      if (tiers.length > 0) {
        const tier = tiers[0];
        const { rows: steps } = await query(
          `SELECT * FROM group_approval_steps WHERE tier_id = $1 ORDER BY step`,
          [tier.id]
        );

        if (steps.length > 0) {
          // Build the approval chain from group steps
          chain = steps.map((s: any) => ({
            id: s.id,
            rule_id: `group-override-${grp.group_id}`,
            step: s.step,
            approver_role: s.approver_mode === 'role' ? s.approver_role : s.approver_role || 'ap_manager',
            specific_approver_id: s.approver_mode === 'specific_user' ? s.specific_approver_id : null,
          } as ApprovalChainRow));
          groupOverrideUsed = true;
          groupOverrideName = `${grp.group_name} Group Override`;
          logger.info('Using group approval flow override', {
            paymentId: id,
            groupId: grp.group_id,
            groupName: grp.group_name,
            tierLabel: tier.label,
            steps: steps.length,
          });
        }
      }
    }

    // --- Fall through to global routing rules if no group override matched ---
    let matchedRule: RoutingRuleRow | null = null;

    if (!groupOverrideUsed) {
      // Find matching routing rule
      const { rows: rules } = await query<RoutingRuleRow>(
        `SELECT * FROM routing_rules WHERE is_active = 1 ORDER BY priority LIMIT 50`
      );

      for (const rule of rules) {
        let matches = false;
        switch (rule.trigger_type) {
          case 'account':
            matches = rule.account_id === payment.account_id;
            break;
          case 'payment_type':
            matches = rule.payment_type === payment.payment_type;
            break;
          case 'amount_range':
            matches =
              (rule.min_amount === null || payment.usd_equivalent >= rule.min_amount) &&
              (rule.max_amount === null || payment.usd_equivalent <= rule.max_amount);
            break;
          default:
            break;
        }
        if (matches) { matchedRule = rule; break; }
      }

      // If no rule matched, use a default 1-step approval
      if (!matchedRule) {
        logger.warn('No routing rule matched, using default approval', { paymentId: id });
      }

      // Get approval chain
      if (matchedRule) {
        const { rows } = await query<ApprovalChainRow>(
          `SELECT * FROM approval_chains WHERE rule_id = $1 ORDER BY step`,
          [matchedRule.id]
        );
        chain = rows;
      }

      // If chain is empty, create a default single-step approval
      if (chain.length === 0) {
        chain = [{ id: 'default', rule_id: matchedRule?.id || 'default', step: 1, approver_role: 'ap_manager', approver_id: null } as ApprovalChainRow];
      }
    }

    const routingRuleId = groupOverrideUsed ? null : (matchedRule?.id || null);

    // Update payment status using SQLite query (no PostgreSQL pool needed)
    await query(
      `UPDATE payments
       SET status = 'pending_approval',
           routing_rule_id = $2,
           current_approval_step = 1,
           total_approval_steps = $3,
           submitted_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = $1`,
      [id, routingRuleId, chain.length]
    );

    // Create approval records for each step
    for (const step of chain) {
      let approverId: string | null = (step as any).specific_approver_id || null;

      if (!approverId) {
        // Find the approver user by role
        const { rows: approverUsers } = await query<{ id: string }>(
          `SELECT id FROM users WHERE role = $1 AND status = 'active' LIMIT 1`,
          [step.approver_role]
        );
        approverId = approverUsers.length > 0 ? approverUsers[0].id : null;
      }

      await query(
        `INSERT INTO payment_approvals (payment_id, approver_id, approver_role, step_number, action, notified_at)
         VALUES ($1, $2, $3, $4, 'pending', datetime('now'))`,
        [id, approverId, step.approver_role, step.step]
      );
    }

    const routingRuleName = groupOverrideUsed
      ? groupOverrideName!
      : (matchedRule?.name || 'Default Approval');

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_SUBMITTED, {
      tableName: 'payments',
      recordId: id,
      newValues: {
        status: 'pending_approval',
        routingRuleId: routingRuleId,
        groupOverride: groupOverrideUsed ? groupOverrideName : undefined,
        totalApprovalSteps: chain.length,
      },
    });

    res.json({
      success: true,
      message: 'Payment submitted for approval',
      data: {
        routingRule: routingRuleName,
        approvalSteps: chain.length,
      },
    });
  } catch (error) {
    logger.error('Error submitting payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to submit payment',
    });
  }
});

/**
 * POST /api/payments/:id/cancel
 * Cancel a payment
 */
router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { rows: existing } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Payment not found' });
      return;
    }

    const payment = existing[0];
    const canCancel = payment.requester_id === user.id || ['admin', 'treasury', 'cfo'].includes(user.role);

    if (!canCancel) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: ERROR_CODES.FORBIDDEN, message: 'You do not have permission to cancel this payment' });
      return;
    }

    if (payment.status === 'executed') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'Cannot cancel an executed payment' });
      return;
    }

    await query(`UPDATE payments SET status = 'cancelled', updated_at = datetime('now') WHERE id = $1`, [id]);

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_CANCELLED, {
      tableName: 'payments',
      recordId: id,
      oldValues: { status: payment.status },
      newValues: { status: 'cancelled' },
    });

    res.json({ success: true, message: 'Payment cancelled' });
  } catch (error) {
    logger.error('Error cancelling payment', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to cancel payment' });
  }
});

/**
 * GET /api/payments/check/duplicates
 */
router.get('/check/duplicates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { payeeName, amount, currency } = req.query;

    if (!payeeName || !amount) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: 'payeeName and amount are required' });
      return;
    }

    const { rows } = await query(
      `SELECT id, reference_number, amount, currency, status, created_at, payee_name
       FROM payments
       WHERE payee_name LIKE $1
       AND amount = $2
       AND currency = $3
       AND created_at > datetime('now', '-90 days')
       AND status NOT IN ('cancelled', 'rejected', 'bank_rejected')
       ORDER BY created_at DESC
       LIMIT 10`,
      [payeeName, parseFloat(amount as string), currency || 'USD']
    );

    res.json({ success: true, data: { hasDuplicates: rows.length > 0, duplicates: rows } });
  } catch (error) {
    logger.error('Error checking duplicates', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to check for duplicates' });
  }
});

export default router;