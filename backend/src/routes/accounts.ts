import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { validate, createAccountSchema, updateAccountSchema } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { adminOnly, hasRole } from '../middleware/rbac.js';
import { encryptAccountNumber, encryptRoutingNumber, decryptAccountNumber, decryptRoutingNumber } from '../services/encryptionService.js';
import { maskAccountNumber, maskRoutingNumber } from '../utils/masks.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * GET /api/accounts
 * List all bank accounts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id, name, bank_name, account_type, currency, daily_limit,
              dual_control_required, dual_control_threshold, dual_control_mode,
              is_active, created_at
       FROM accounts
       WHERE is_active = true
       ORDER BY name`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    logger.error('Error listing accounts', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to list accounts',
    });
  }
});

/**
 * GET /api/accounts/:id
 * Get account details (masked numbers)
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const { rows } = await query(
      `SELECT * FROM accounts WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Account not found',
      });
      return;
    }

    const account = rows[0];

    // Decrypt and mask account numbers
    let accountNumber = '';
    let routingNumber = '';

    try {
      if (account.account_number_encrypted) {
        accountNumber = decryptAccountNumber(account.account_number_encrypted);
      }
      if (account.routing_number_encrypted) {
        routingNumber = decryptRoutingNumber(account.routing_number_encrypted);
      }
    } catch (error) {
      logger.error('Error decrypting account details', { accountId: id });
    }

    // Only treasury and admin can see full account numbers
    const showFull = ['treasury', 'admin'].includes(user.role);

    res.json({
      success: true,
      data: {
        ...account,
        accountNumber: showFull ? accountNumber : undefined,
        accountNumberMasked: maskAccountNumber(accountNumber),
        routingNumber: showFull ? routingNumber : undefined,
        routingNumberMasked: maskRoutingNumber(routingNumber),
        account_number_encrypted: undefined,
        routing_number_encrypted: undefined,
      },
    });
  } catch (error) {
    logger.error('Error getting account', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get account',
    });
  }
});

/**
 * POST /api/accounts
 * Create a new bank account (admin only)
 */
router.post('/', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = validate(createAccountSchema, req.body);
    const admin = req.user!;

    // Encrypt account and routing numbers
    const accountNumberEncrypted = encryptAccountNumber(data.accountNumber);
    const routingNumberEncrypted = encryptRoutingNumber(data.routingNumber);

    const { rows } = await query(
      `INSERT INTO accounts (
        name, bank_name, account_number_encrypted, routing_number_encrypted,
        account_type, currency, daily_limit, dual_control_required,
        dual_control_threshold, dual_control_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, bank_name, account_type, currency, daily_limit,
                dual_control_required, dual_control_threshold, dual_control_mode`,
      [
        data.name,
        data.bankName,
        accountNumberEncrypted,
        routingNumberEncrypted,
        data.accountType,
        data.currency,
        data.dailyLimit || null,
        data.dualControlRequired,
        data.dualControlThreshold || null,
        data.dualControlMode,
      ]
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_CREATED, {
      tableName: 'accounts',
      recordId: rows[0].id,
      newValues: {
        name: data.name,
        bankName: data.bankName,
        accountType: data.accountType,
        // Don't log account numbers
      },
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error creating account', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create account',
    });
  }
});

/**
 * PUT /api/accounts/:id
 * Update account settings (admin only)
 */
router.put('/:id', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = validate(updateAccountSchema, req.body);
    const admin = req.user!;

    const { rows: existing } = await query('SELECT * FROM accounts WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Account not found',
      });
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
      res.json({ success: true, data: existing[0] });
      return;
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE accounts SET ${updates.join(', ')}, updated_at = datetime('now')
       WHERE id = $${paramIndex}
       RETURNING id, name, bank_name, account_type, currency, daily_limit,
                 dual_control_required, dual_control_threshold, dual_control_mode`,
      values
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_UPDATED, {
      tableName: 'accounts',
      recordId: id,
      oldValues: existing[0],
      newValues: rows[0],
    });

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error updating account', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update account',
    });
  }
});

/**
 * DELETE /api/accounts/:id
 * Deactivate an account (admin only)
 */
router.delete('/:id', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;

    // Check for pending payments using this account
    const { rows: pendingPayments } = await query(
      `SELECT COUNT(*) as count FROM payments
       WHERE account_id = $1
       AND status NOT IN ('executed', 'cancelled', 'rejected', 'bank_rejected')`,
      [id]
    );

    if (parseInt(pendingPayments[0].count, 10) > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot deactivate account with pending payments',
      });
      return;
    }

    await query(
      "UPDATE accounts SET is_active = false, updated_at = datetime('now') WHERE id = $1",
      [id]
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_UPDATED, {
      tableName: 'accounts',
      recordId: id,
      newValues: { is_active: false },
    });

    res.json({
      success: true,
      message: 'Account deactivated',
    });
  } catch (error) {
    logger.error('Error deactivating account', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to deactivate account',
    });
  }
});

export default router;
