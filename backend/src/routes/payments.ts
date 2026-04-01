import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest, PaymentRow, RoutingRuleRow, ApprovalChainRow } from '../types/index.js';
import { validate, createPaymentSchema, updatePaymentSchema, paymentFilterSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { getUserPaymentLimit, readOnlyBlock } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS, PAGINATION } from '../config/constants.js';
import { determineApprovalChain, validatePayrollAccountAccess, getApprovalEligibility } from '../services/approvalRules.js';
import { assignSla } from '../services/slaService.js';

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

    // Treasury group members (admin role + in grp-treasury) see all payments
    // Non-Treasury admin users also see all payments (backward compat)
    if (user.role === 'staff') {
      conditions.push(`p.requester_id = $${paramIndex++}`);
      params.push(user.id);
    } else if (user.role !== 'admin') {
      // Non-admin: see own payments OR payments from users in same groups
      // OR payments pending their approval (via approval eligibility)
      conditions.push(`(p.requester_id = $${paramIndex} OR p.requester_id IN (
        SELECT gm2.user_id FROM group_members gm
        JOIN group_members gm2 ON gm2.group_id = gm.group_id
        WHERE gm.user_id = $${paramIndex}
        AND gm.role = 'initiator_approver'
      ) OR p.id IN (
        SELECT pa.payment_id FROM payment_approvals pa
        WHERE pa.action = 'pending'
        AND (
          pa.approver_id = $${paramIndex}
          OR (pa.approver_pool = 'group_or_treasury' AND EXISTS (
            SELECT 1 FROM group_members gm3 WHERE gm3.group_id = pa.group_id AND gm3.user_id = $${paramIndex}
            AND gm3.role = 'initiator_approver'
          ))
          OR (pa.approver_pool = 'senior_or_treasury')
        )
      ))`);
      params.push(user.id);
      paramIndex++;
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
      conditions.push(`date(p.created_at) >= $${paramIndex++}`);
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`date(p.created_at) <= $${paramIndex++}`);
      params.push(filters.endDate);
    }

    if (filters.search) {
      conditions.push(`(p.payee_name LIKE $${paramIndex} OR p.reference_number LIKE $${paramIndex} OR u.name LIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Admin-only: filter by specific requester
    if (filters.requesterId && user.role === 'admin') {
      conditions.push(`p.requester_id = $${paramIndex++}`);
      params.push(filters.requesterId);
    }

    // Admin-only: filter by group membership
    if (filters.groupId && user.role === 'admin') {
      conditions.push(`p.requester_id IN (SELECT user_id FROM group_members WHERE group_id = $${paramIndex++})`);
      params.push(filters.groupId);
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

    const countQuery = `SELECT COUNT(*) as total FROM payments p LEFT JOIN users u ON p.requester_id = u.id ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
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
 * GET /api/payments/calendar
 * Get payments for a calendar month view
 */
router.get('/calendar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { month } = req.query;
    const user = req.user!;

    // Parse month param (YYYY-MM) or default to current month
    let startDate: string;
    let endDate: string;

    if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      startDate = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      endDate = nextMonth;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      endDate = nextMonth;
    }

    let baseQuery = `
      SELECT p.id, p.reference_number, p.payee_name, p.amount, p.currency,
             p.usd_equivalent, p.status, p.payment_type, p.requested_date,
             p.requester_id, u.name AS requester_name, a.name AS account_name
      FROM payments p
      LEFT JOIN users u ON p.requester_id = u.id
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE p.requested_date >= $1 AND p.requested_date < $2
    `;
    const params: unknown[] = [startDate, endDate];
    let paramIndex = 3;

    // Role-based filtering
    if (user.role === 'staff') {
      baseQuery += ` AND p.requester_id = $${paramIndex++}`;
      params.push(user.id);
    } else if (user.role === 'manager' || user.role === 'sr_manager') {
      baseQuery += ` AND (p.requester_id = $${paramIndex} OR p.requester_id IN (
        SELECT gm2.user_id FROM group_members gm
        JOIN group_members gm2 ON gm2.group_id = gm.group_id
        WHERE gm.user_id = $${paramIndex}
        AND gm.role = 'initiator_approver'
      ))`;
      params.push(user.id);
      paramIndex++;
    }
    // admin/treasury/cfo: no additional filter — see all payments

    baseQuery += ` ORDER BY p.requested_date, p.created_at`;

    const { rows } = await query<PaymentRow & { requester_name: string; account_name: string }>(baseQuery, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching calendar payments', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to fetch calendar payments',
    });
  }
});

/**
 * POST /api/payments
 * Create a new payment request
 */
router.post('/', readOnlyBlock, async (req: AuthenticatedRequest, res: Response) => {
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

    // Validate Payroll account restrictions
    const payrollCheck = await validatePayrollAccountAccess(
      user.id, data.accountId, data.destinationAccountId || null, data.fundingType
    );
    if (!payrollCheck.valid) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: payrollCheck.error,
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

    // Enhanced audit: capture initiator group, accounts, payment type per Section 5
    const { rows: initiatorGroups } = await query<{ group_name: string }>(
      `SELECT g.name as group_name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1`,
      [user.id]
    );
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_CREATED, {
      tableName: 'payments',
      recordId: payment.id,
      newValues: {
        referenceNumber: payment.reference_number,
        initiatorName: user.name || user.email,
        initiatorGroup: initiatorGroups.map(g => g.group_name).join(', ') || 'None',
        payeeName: payment.payee_name,
        amount: payment.amount,
        currency: payment.currency,
        paymentType: payment.payment_type,
        originationAccountId: payment.account_id,
        destinationAccountId: payment.destination_account_id,
        fundingType: payment.funding_type,
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

    if (user.role === 'staff' && payment.requester_id !== user.id) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'You can only view your own payments',
      });
      return;
    }

    // Manager/Sr Manager: can only view own payments, same-group payments, or payments they can approve
    if ((user.role === 'manager' || user.role === 'sr_manager') && payment.requester_id !== user.id) {
      const { rows: sharedGroups } = await query<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM group_members gm
         JOIN group_members gm2 ON gm2.group_id = gm.group_id
         WHERE gm.user_id = $1 AND gm2.user_id = $2
         AND gm.role = 'initiator_approver'`,
        [user.id, payment.requester_id]
      );
      // Also check if user has pending approval eligibility for this payment
      let hasApprovalAccess = false;
      if (!sharedGroups[0]?.cnt) {
        const { rows: approvalAccess } = await query<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM payment_approvals pa
           WHERE pa.payment_id = $1
           AND (
             pa.approver_id = $2
             OR (pa.approver_pool = 'group_or_treasury' AND EXISTS (
               SELECT 1 FROM group_members gm WHERE gm.group_id = pa.group_id AND gm.user_id = $2
               AND gm.role = 'initiator_approver'
             ))
           )`,
          [id, user.id]
        );
        hasApprovalAccess = (approvalAccess[0]?.cnt ?? 0) > 0;
      }
      if (!sharedGroups[0]?.cnt && !hasApprovalAccess) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: ERROR_CODES.FORBIDDEN,
          message: 'You can only view payments from your own groups',
        });
        return;
      }
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

    // Check if current user can approve this payment
    let approval_eligibility: { can_approve: boolean; approval_id: string | null; reason?: string } = {
      can_approve: false, approval_id: null,
    };
    if (payment.status === 'pending_approval') {
      const elig = await getApprovalEligibility(user.id, user.email, user.role, id);
      approval_eligibility = { can_approve: elig.canApprove, approval_id: elig.approvalId, reason: elig.reason };
    }

    res.json({
      success: true,
      data: { ...payment, approvals, comments, waiting_on, approval_eligibility },
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
router.put('/:id', readOnlyBlock, async (req: AuthenticatedRequest, res: Response) => {
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
      oldValues: payment as unknown as Record<string, unknown>,
      newValues: updated[0] as unknown as Record<string, unknown>,
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
router.post('/:id/submit', readOnlyBlock, async (req: AuthenticatedRequest, res: Response) => {
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

    const wasReturned = payment.status === 'returned';

    // Re-read the payment to pick up any edits made just before resubmission
    const { rows: currentRows } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
    const current = currentRows[0] || payment;

    // --- Determine approval chain using centralized rules ---
    const approvalConfig = await determineApprovalChain(
      id, current.requester_id, current.usd_equivalent,
      current.account_id, current.destination_account_id,
    );

    // Update payment status
    await query(
      `UPDATE payments
       SET status = 'pending_approval',
           routing_rule_id = NULL,
           current_approval_step = 1,
           total_approval_steps = $2,
           submitted_at = datetime('now'),
           updated_at = datetime('now')
       WHERE id = $1`,
      [id, approvalConfig.steps.length]
    );

    // Create approval records for each step
    for (const step of approvalConfig.steps) {
      await query(
        `INSERT INTO payment_approvals (payment_id, approver_id, approver_role, step_number, action, notified_at, approver_pool, group_id)
         VALUES ($1, NULL, $2, $3, 'pending', datetime('now'), $4, $5)`,
        [id, step.approver_role, step.step, step.approver_pool, step.group_id]
      );
    }

    // Assign SLA based on amount and payment type
    assignSla(id, current.usd_equivalent || current.amount, current.payment_type, new Date().toISOString());

    // If resubmitting a returned payment, log what changed in the comment thread
    if (wasReturned) {
      const fmtAmt = (v: number | string) => {
        const n = typeof v === 'string' ? parseFloat(v) : v;
        return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      const changes: string[] = [];
      if (current.amount !== payment.amount) changes.push(`Amount changed from ${fmtAmt(payment.amount)} to ${fmtAmt(current.amount)}`);
      if (current.currency !== payment.currency) changes.push(`Currency changed from ${payment.currency} to ${current.currency}`);
      if (current.payee_name !== payment.payee_name) changes.push(`Payee changed from "${payment.payee_name}" to "${current.payee_name}"`);
      if (current.account_id !== payment.account_id) changes.push(`Source account changed`);
      if (current.destination_account_id !== payment.destination_account_id) changes.push(`Destination account changed`);
      if (current.payment_type !== payment.payment_type) changes.push(`Payment type changed from ${payment.payment_type} to ${current.payment_type}`);
      if (current.business_justification !== payment.business_justification) changes.push(`Business justification updated`);
      if (current.requested_date?.toString() !== payment.requested_date?.toString()) changes.push(`Requested date changed`);

      const commentText = changes.length > 0
        ? `Payment updated and resubmitted. Changes: ${changes.join('; ')}`
        : `Payment resubmitted (no field changes)`;

      await query(
        `INSERT INTO approval_comments (payment_id, user_id, comment, is_internal, created_at)
         VALUES ($1, $2, $3, 0, datetime('now'))`,
        [id, user.id, commentText]
      );
    }

    const routingRuleName = approvalConfig.description;

    // Log audit entry
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.PAYMENT_SUBMITTED, {
      tableName: 'payments',
      recordId: id,
      newValues: {
        status: 'pending_approval',
        resubmittedAfterReturn: wasReturned,
        approvalRule: approvalConfig.description,
        groupId: approvalConfig.groupId,
        totalApprovalSteps: approvalConfig.steps.length,
      },
    });

    res.json({
      success: true,
      message: 'Payment submitted for approval',
      data: {
        routingRule: routingRuleName,
        approvalSteps: approvalConfig.steps.length,
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
router.post('/:id/cancel', readOnlyBlock, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { rows: existing } = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND, message: 'Payment not found' });
      return;
    }

    const payment = existing[0];
    const canCancel = payment.requester_id === user.id || user.role === 'admin';

    if (!canCancel) {
      res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, error: ERROR_CODES.FORBIDDEN, message: 'You do not have permission to cancel this payment' });
      return;
    }

    if (!['draft', 'pending_approval'].includes(payment.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR, message: `Cannot cancel payment — payment status is ${payment.status}. Only draft or pending_approval payments can be cancelled.` });
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