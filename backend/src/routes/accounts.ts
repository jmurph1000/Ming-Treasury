import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { validate, createAccountSchema, updateAccountSchema, ValidationError } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { adminOnly, hasRole } from '../middleware/rbac.js';

// Allow admin, treasury, and cfo to manage accounts
const canManageAccounts = hasRole('admin', 'treasury', 'cfo');
import { encryptAccountNumber, encryptRoutingNumber, decryptAccountNumber, decryptRoutingNumber } from '../services/encryptionService.js';
import { maskAccountNumber, maskRoutingNumber } from '../utils/masks.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

// ──────────────────────────────────────────────────────────
// SPECIFIC routes MUST come before the /:id wildcard routes
// ──────────────────────────────────────────────────────────

/**
 * POST /api/accounts/bulk-upload
 * Bulk create accounts from Excel data (admin only)
 */
router.post('/bulk-upload', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { accounts } = req.body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'accounts array is required and must not be empty',
      });
      return;
    }

    if (accounts.length > 10) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Maximum 10 accounts can be uploaded at a time',
      });
      return;
    }

    // Validate each row
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      if (!acct.bankName || !acct.description || !acct.lastFour) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: bankName, description, and lastFour are all required`,
        });
        return;
      }
      if (!/^\d{4}$/.test(acct.lastFour)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: lastFour must be exactly 4 digits`,
        });
        return;
      }
    }

    const created: any[] = [];
    for (const acct of accounts) {
      const accountNumberEncrypted = encryptAccountNumber('XXXX' + acct.lastFour);
      const routingNumberEncrypted = encryptRoutingNumber('000000000');

      const { rows } = await query(
        `INSERT INTO accounts (
          name, bank_name, account_number_encrypted, routing_number_encrypted,
          account_type, currency, dual_control_required
        ) VALUES ($1, $2, $3, $4, 'checking', 'USD', 1)
        RETURNING id, name, bank_name, account_type, currency, daily_limit,
                  dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at`,
        [acct.description, acct.bankName, accountNumberEncrypted, routingNumberEncrypted]
      );

      created.push(rows[0]);

      await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_CREATED, {
        tableName: 'accounts',
        recordId: rows[0].id,
        newValues: {
          name: acct.description,
          bankName: acct.bankName,
          source: 'excel_upload',
        },
      });
    }

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: created,
      message: `${created.length} account(s) created successfully`,
    });
  } catch (error) {
    logger.error('Error bulk uploading accounts', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to bulk upload accounts',
    });
  }
});

/**
 * GET /api/accounts/user/:userId/access
 * Get account IDs assigned to a user (admin only)
 */
router.get('/user/:userId/access', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { rows } = await query<{ account_id: string }>(
      'SELECT account_id FROM user_account_access WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: { accountIds: rows.map(r => r.account_id) },
    });
  } catch (error) {
    logger.error('Error getting user account access', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get user account access',
    });
  }
});

/**
 * PUT /api/accounts/user/:userId/access
 * Set account access for a user (admin only)
 */
router.put('/user/:userId/access', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const admin = req.user!;
    const { accountIds } = req.body;

    if (!Array.isArray(accountIds)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'accountIds must be an array',
      });
      return;
    }

    // Get old assignments for audit
    const { rows: oldAccess } = await query<{ account_id: string }>(
      'SELECT account_id FROM user_account_access WHERE user_id = $1',
      [userId]
    );

    // Delete existing assignments
    await query('DELETE FROM user_account_access WHERE user_id = $1', [userId]);

    // Insert new assignments
    for (const accountId of accountIds) {
      await query(
        'INSERT INTO user_account_access (user_id, account_id, created_by) VALUES ($1, $2, $3)',
        [userId, accountId, admin.id]
      );
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
      tableName: 'user_account_access',
      recordId: userId,
      oldValues: { accountIds: oldAccess.map(r => r.account_id) },
      newValues: { accountIds },
    });

    res.json({
      success: true,
      message: 'Account access updated',
      data: { accountIds },
    });
  } catch (error) {
    logger.error('Error updating user account access', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update user account access',
    });
  }
});

// ──────────────────────────────────────────────────────────
// Generic routes (/:id wildcard) MUST come after specific routes
// ──────────────────────────────────────────────────────────

/**
 * GET /api/accounts
 * List all bank accounts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const restrictedRoles = ['ap_staff', 'ap_manager', 'sr_ap_manager'];

    let rows;
    if (restrictedRoles.includes(user.role)) {
      // Check direct user-account assignments
      const { rows: accessRows } = await query<{ account_id: string }>(
        'SELECT account_id FROM user_account_access WHERE user_id = $1',
        [user.id]
      );

      // Check group-based account assignments
      const { rows: groupAccessRows } = await query<{ account_id: string }>(
        `SELECT DISTINCT ga.account_id
         FROM group_members gm
         JOIN group_accounts ga ON ga.group_id = gm.group_id
         WHERE gm.user_id = $1`,
        [user.id]
      );

      // Merge both sets of account IDs
      const allAccountIds = new Set<string>([
        ...accessRows.map(r => r.account_id),
        ...groupAccessRows.map(r => r.account_id),
      ]);

      if (allAccountIds.size > 0) {
        const idsArray = Array.from(allAccountIds);
        const placeholders = idsArray.map((_, i) => `$${i + 1}`).join(', ');
        const result = await query(
          `SELECT id, name, bank_name, account_type, currency, daily_limit,
                  dual_control_required, dual_control_threshold, dual_control_mode,
                  is_active, created_at
           FROM accounts
           WHERE is_active = 1 AND id IN (${placeholders})
           ORDER BY name`,
          idsArray
        );
        rows = result.rows;
      } else {
        // No assignments — show all (backwards compatible)
        const result = await query(
          `SELECT id, name, bank_name, account_type, currency, daily_limit,
                  dual_control_required, dual_control_threshold, dual_control_mode,
                  is_active, created_at
           FROM accounts
           WHERE is_active = 1
           ORDER BY name`
        );
        rows = result.rows;
      }
    } else {
      // Treasury/CFO/admin see all accounts
      const result = await query(
        `SELECT id, name, bank_name, account_type, currency, daily_limit,
                dual_control_required, dual_control_threshold, dual_control_mode,
                is_active, created_at
         FROM accounts
         WHERE is_active = true
         ORDER BY name`
      );
      rows = result.rows;
    }

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
 * Create a new bank account
 */
router.post('/', canManageAccounts, async (req: AuthenticatedRequest, res: Response) => {
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
        dual_control_threshold, dual_control_mode, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
      RETURNING id, name, bank_name, account_type, currency, daily_limit,
                dual_control_required, dual_control_threshold, dual_control_mode,
                is_active, created_at`,
      [
        data.name,
        data.bankName,
        accountNumberEncrypted,
        routingNumberEncrypted,
        data.accountType,
        data.currency,
        data.dailyLimit || null,
        data.dualControlRequired ? 1 : 0,
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
      },
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.errors.map(e => e.message).join('; '),
        details: error.errors,
      });
      return;
    }
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
 * Update account settings
 */
router.put('/:id', canManageAccounts, async (req: AuthenticatedRequest, res: Response) => {
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
        // Convert boolean to integer for SQLite
        if (typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
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
                 dual_control_required, dual_control_threshold, dual_control_mode,
                 is_active, created_at`,
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
    if (error instanceof ValidationError) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: error.errors.map(e => e.message).join('; '),
        details: error.errors,
      });
      return;
    }
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
 * Deactivate an account
 */
router.delete('/:id', canManageAccounts, async (req: AuthenticatedRequest, res: Response) => {
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
      "UPDATE accounts SET is_active = 0, updated_at = datetime('now') WHERE id = $1",
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
