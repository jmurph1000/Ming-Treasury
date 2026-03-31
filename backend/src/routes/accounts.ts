import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { validate, createAccountSchema, updateAccountSchema, ValidationError } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { adminOnly, hasRole, treasuryAdminOnly } from '../middleware/rbac.js';

// Allow admin to manage accounts
const canManageAccounts = hasRole('admin');
import { encryptAccountNumber, encryptRoutingNumber, decryptAccountNumber, decryptRoutingNumber } from '../services/encryptionService.js';
import { maskAccountNumber, maskRoutingNumber } from '../utils/masks.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS, ACCOUNT_ACCESS_AUDIT_ACTIONS } from '../config/constants.js';
import { getGroupPoolAccountIds, getEffectiveAccountIds } from '../services/accountAccessSync.js';

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

    if (accounts.length > 50) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Maximum 50 accounts can be uploaded at a time',
      });
      return;
    }

    const validAccountTypes = ['checking', 'savings', 'operating', 'payroll'];
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY', 'MXN', 'TRY', 'ILS'];
    const validDualControlModes = ['all', 'wires_only', 'above_threshold'];

    // Validate each row
    for (let i = 0; i < accounts.length; i++) {
      const acct = accounts[i];
      if (!acct.name?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Account Name is required`,
        });
        return;
      }
      if (!acct.bankName?.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Bank Name is required`,
        });
        return;
      }
      if (!acct.accountNumber?.trim() || acct.accountNumber.trim().length < 4) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Account Number is required (minimum 4 digits)`,
        });
        return;
      }
      if (!acct.routingNumber?.trim() || !/^\d{9}$/.test(acct.routingNumber.trim())) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Routing Number must be exactly 9 digits`,
        });
        return;
      }
      if (acct.accountType && !validAccountTypes.includes(acct.accountType)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Invalid Account Type. Must be one of: ${validAccountTypes.join(', ')}`,
        });
        return;
      }
      if (acct.currency && !validCurrencies.includes(acct.currency)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Invalid Currency. Must be one of: ${validCurrencies.join(', ')}`,
        });
        return;
      }
      if (acct.dualControlMode && !validDualControlModes.includes(acct.dualControlMode)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: ERROR_CODES.VALIDATION_ERROR,
          message: `Row ${i + 1}: Invalid Dual Control Mode. Must be one of: ${validDualControlModes.join(', ')}`,
        });
        return;
      }
    }

    const created: any[] = [];
    for (const acct of accounts) {
      const accountNumberEncrypted = encryptAccountNumber(acct.accountNumber.trim());
      const routingNumberEncrypted = encryptRoutingNumber(acct.routingNumber.trim());
      const dualControl = acct.dualControlRequired !== undefined ? (acct.dualControlRequired ? 1 : 0) : 1;
      const dailyLimit = acct.dailyLimit ? parseFloat(acct.dailyLimit) : null;

      const { rows } = await query(
        `INSERT INTO accounts (
          name, bank_name, account_number_encrypted, routing_number_encrypted,
          account_type, currency, daily_limit, dual_control_required, dual_control_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, bank_name, account_type, currency, daily_limit,
                  dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at`,
        [
          acct.name.trim(),
          acct.bankName.trim(),
          accountNumberEncrypted,
          routingNumberEncrypted,
          acct.accountType || 'checking',
          acct.currency || 'USD',
          dailyLimit,
          dualControl,
          acct.dualControlMode || 'all',
        ]
      );

      created.push(rows[0]);

      await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCOUNT_CREATED, {
        tableName: 'accounts',
        recordId: rows[0].id,
        newValues: {
          name: acct.name.trim(),
          bankName: acct.bankName.trim(),
          accountType: acct.accountType || 'checking',
          currency: acct.currency || 'USD',
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
 * Get rich account access data for a user (admin only)
 */
router.get('/user/:userId/access', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const groupPoolAccountIds = await getGroupPoolAccountIds(userId);
    const effectiveAccountIds = await getEffectiveAccountIds(userId);

    // Check for override entries
    const { rows: overrideRows } = await query<{ account_id: string; override_reason: string; override_by: string; override_at: string }>(
      'SELECT account_id, override_reason, override_by, override_at FROM user_account_access WHERE user_id = $1',
      [userId]
    );

    const hasOverride = overrideRows.length > 0;
    let overrideDetails: { reason: string; setBy: string; setAt: string } | null = null;
    if (hasOverride && overrideRows[0].override_by) {
      const { rows: adminRows } = await query<{ name: string }>(
        'SELECT name FROM users WHERE id = $1',
        [overrideRows[0].override_by]
      );
      overrideDetails = {
        reason: overrideRows[0].override_reason,
        setBy: adminRows[0]?.name || 'Unknown',
        setAt: overrideRows[0].override_at,
      };
    }

    // Get audit history
    const { rows: auditHistory } = await query(
      `SELECT * FROM account_access_audit_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        groupPoolAccountIds,
        overrideAccountIds: hasOverride ? overrideRows.map(r => r.account_id) : null,
        effectiveAccountIds,
        hasOverride,
        overrideDetails,
        auditHistory,
      },
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
 * Set account access override for a user (Treasury Admin only)
 * accountIds: null or [] = clear override (restore full group access)
 * accountIds: [...] = must be subset of group pool (restrict access)
 * reason: required string (min 10 chars) when setting an override
 */
router.put('/user/:userId/access', treasuryAdminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const admin = req.user!;
    const { accountIds, reason } = req.body;

    const groupPool = await getGroupPoolAccountIds(userId);

    // Get old assignments for audit
    const { rows: oldAccess } = await query<{ account_id: string }>(
      'SELECT account_id FROM user_account_access WHERE user_id = $1',
      [userId]
    );
    const previousAccountIds = oldAccess.map(r => r.account_id);

    // Clear override
    if (accountIds === null || (Array.isArray(accountIds) && accountIds.length === 0)) {
      await query('DELETE FROM user_account_access WHERE user_id = $1', [userId]);

      await query(
        `INSERT INTO account_access_audit_log (user_id, admin_id, admin_email, action, previous_account_ids, new_account_ids, group_pool_account_ids, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, admin.id, admin.email, ACCOUNT_ACCESS_AUDIT_ACTIONS.OVERRIDE_CLEARED,
         JSON.stringify(previousAccountIds), null, JSON.stringify(groupPool),
         reason || 'Override cleared — full group access restored']
      );

      await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
        tableName: 'user_account_access',
        recordId: userId,
        oldValues: { accountIds: previousAccountIds },
        newValues: { accountIds: null, action: 'override_cleared' },
      });

      res.json({ success: true, message: 'Account access override cleared' });
      return;
    }

    // Setting an override — validate
    if (!Array.isArray(accountIds)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'accountIds must be an array or null',
      });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'reason is required (minimum 10 characters) when restricting access',
      });
      return;
    }

    // Validate accountIds are a subset of the group pool
    const groupPoolSet = new Set(groupPool);
    const invalidIds = accountIds.filter((id: string) => !groupPoolSet.has(id));
    if (invalidIds.length > 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'accountIds must be a subset of the user\'s group pool accounts',
        data: { invalidIds },
      });
      return;
    }

    // Delete existing and insert new overrides
    await query('DELETE FROM user_account_access WHERE user_id = $1', [userId]);

    const now = new Date().toISOString();
    for (const accountId of accountIds) {
      await query(
        `INSERT INTO user_account_access (user_id, account_id, created_by, override_reason, override_by, override_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, accountId, admin.id, reason.trim(), admin.id, now]
      );
    }

    await query(
      `INSERT INTO account_access_audit_log (user_id, admin_id, admin_email, action, previous_account_ids, new_account_ids, group_pool_account_ids, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, admin.id, admin.email, ACCOUNT_ACCESS_AUDIT_ACTIONS.OVERRIDE_SET,
       JSON.stringify(previousAccountIds), JSON.stringify(accountIds), JSON.stringify(groupPool),
       reason.trim()]
    );

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
      tableName: 'user_account_access',
      recordId: userId,
      oldValues: { accountIds: previousAccountIds },
      newValues: { accountIds, reason: reason.trim(), action: 'override_set' },
    });

    res.json({
      success: true,
      message: 'Account access override set',
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

/**
 * GET /api/accounts/dropdown
 * Returns group-specific account dropdown options for the logged-in user.
 * Treasury/admin users see ALL accounts. Users in multiple groups see a merged list.
 */
router.get('/dropdown', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Treasury supervisors and admins see all active accounts + an "Other" option
    const isTreasurySupervisor = (await query<{ is_supervisor: number }>(
      `SELECT is_supervisor FROM group_members WHERE group_id = 'grp-treasury' AND user_id = $1`,
      [user.id]
    )).rows;
    const isAdmin = user.role === 'admin';
    const isTreasury = isTreasurySupervisor.length > 0 && isTreasurySupervisor[0].is_supervisor;

    if (isAdmin || isTreasury) {
      const { rows: allAccounts } = await query(
        `SELECT id, name, bank_name, account_type, currency
         FROM accounts WHERE is_active = 1
         ORDER BY COALESCE(sort_order, 100), name`
      );
      const options = allAccounts.map((a: any) => ({
        value: a.id,
        label: `${a.name} (${a.bank_name})`,
        accountType: 'internal',
      }));
      options.push({ value: '__other__', label: 'Other (External Account)', accountType: 'other' });
      res.json({ success: true, data: options });
      return;
    }

    // Get user's group names
    const { rows: memberships } = await query<{ group_name: string }>(
      `SELECT g.name as group_name FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1`,
      [user.id]
    );

    if (memberships.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const groupNames = memberships.map((m: any) => m.group_name);

    // Fetch labels for all user's groups, deduplicate by account_label
    const placeholders = groupNames.map((_: any, i: number) => `$${i + 1}`).join(', ');
    const { rows: labels } = await query(
      `SELECT DISTINCT account_label, account_id, account_type, MIN(sort_order) as sort_order
       FROM group_account_labels
       WHERE group_name IN (${placeholders}) AND is_active = 1
       GROUP BY account_label, account_id, account_type
       ORDER BY sort_order, account_label`,
      groupNames
    );

    const options = labels.map((l: any) => ({
      value: l.account_id || '__other__',
      label: l.account_label,
      accountType: l.account_type,
    }));

    res.json({ success: true, data: options });
  } catch (error) {
    logger.error('Error getting dropdown accounts', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get dropdown accounts',
    });
  }
});

// ──────────────────────────────────────────────────────────
// Generic routes (/:id wildcard) MUST come after specific routes
// ──────────────────────────────────────────────────────────

/**
 * GET /api/accounts
 * List bank accounts — non-admins see only their effective accounts (group-based + overrides)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    let rows;
    if (user.role !== 'admin') {
      const effectiveIds = await getEffectiveAccountIds(user.id);

      if (effectiveIds.length > 0) {
        const placeholders = effectiveIds.map((_, i) => `$${i + 1}`).join(', ');
        const result = await query(
          `SELECT id, name, bank_name, account_type, currency, daily_limit,
                  dual_control_required, dual_control_threshold, dual_control_mode,
                  is_active, created_at
           FROM accounts
           WHERE is_active = 1 AND id IN (${placeholders})
           ORDER BY COALESCE(sort_order, 100), name`,
          effectiveIds
        );
        rows = result.rows;
      } else {
        rows = [];
      }
    } else {
      // Admin sees all accounts
      const result = await query(
        `SELECT id, name, bank_name, account_type, currency, daily_limit,
                dual_control_required, dual_control_threshold, dual_control_mode,
                is_active, created_at
         FROM accounts
         WHERE is_active = 1
         ORDER BY COALESCE(sort_order, 100), name`
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

    // Only admin can see full account numbers
    const showFull = user.role === 'admin';

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

    await query(
      `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, after_value, affected_component)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Bank Accounts', 'Account Added', `Bank account created: ${data.name} (${data.bankName})`,
       admin.id, admin.name || admin.email, JSON.stringify({ name: data.name, bankName: data.bankName, accountType: data.accountType }), 'Bank Accounts']
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

    await query(
      `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, before_value, after_value, affected_component)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Bank Accounts', 'Account Edited', `Bank account updated: ${rows[0]?.name || id}`,
       admin.id, admin.name || admin.email, JSON.stringify(existing[0]), JSON.stringify(rows[0]), 'Bank Accounts']
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
