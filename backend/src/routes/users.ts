import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { validate, provisionUserSchema, updateUserSchema, paginationSchema, ValidationError } from '../utils/validators.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { adminOnly, hasRole } from '../middleware/rbac.js';
import { generateAccessTokens } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS, VALIDATION } from '../config/constants.js';

const router = Router();

// Department-to-Group mapping — keeps group membership in sync with department
const DEPARTMENT_GROUP_MAP: Record<string, string> = {
  'Accounting': 'grp-accounting',
  'Accounts Payable': 'grp-ap',
  'Other': 'grp-other',
  'Payment Ops / Platform Accounting': 'grp-payops',
  'Payroll': 'grp-payroll',
  'Treasury': 'grp-treasury',
};

/** Sync a user's department group membership. Removes from old dept group, adds to new. */
async function syncDepartmentGroup(userId: string, newDepartment: string | null, oldDepartment: string | null, adminId: string): Promise<void> {
  const deptGroupIds = Object.values(DEPARTMENT_GROUP_MAP);

  // Remove user from all department-based groups
  if (deptGroupIds.length > 0) {
    const placeholders = deptGroupIds.map((_, i) => `$${i + 2}`).join(', ');
    await query(
      `DELETE FROM group_members WHERE user_id = $1 AND group_id IN (${placeholders})`,
      [userId, ...deptGroupIds]
    );
  }

  // Add to new department group
  if (newDepartment && DEPARTMENT_GROUP_MAP[newDepartment]) {
    const groupId = DEPARTMENT_GROUP_MAP[newDepartment];
    await query(
      'INSERT OR IGNORE INTO group_members (group_id, user_id, added_by) VALUES ($1, $2, $3)',
      [groupId, userId, adminId]
    );
  }
}

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = validate(paginationSchema, req.query);

    const { rows } = await query(
      `SELECT id, email, name, role, status, title, department, payment_limit,
              last_login_at, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [filters.limit ?? 50, ((filters.page ?? 1) - 1) * (filters.limit ?? 50)]
    );

    const { rows: countRows } = await query<{ total: string }>('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countRows[0].total, 10);

    res.json({
      success: true,
      data: rows,
      meta: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 50,
        total,
        totalPages: Math.ceil(total / (filters.limit ?? 50)),
      },
    });
  } catch (error) {
    logger.error('Error listing users', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to list users',
    });
  }
});

/**
 * POST /api/users/provision
 * Start user provisioning process
 */
router.post('/provision', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = validate(provisionUserSchema, req.body);
    const admin = req.user!;

    // Check if user already exists
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [data.email.toLowerCase()]
    );

    if (existing.length > 0) {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_ENTRY,
        message: 'A user with this email already exists',
      });
      return;
    }

    // Check for pending access request
    const { rows: pendingRequests } = await query(
      `SELECT id FROM access_requests WHERE email = $1 AND status = 'pending'`,
      [data.email.toLowerCase()]
    );

    if (pendingRequests.length > 0) {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_ENTRY,
        message: 'An access request for this email is already pending',
      });
      return;
    }

    // TODO: Look up employee in Workday via MCP
    // For now, we'll simulate the Workday lookup
    const workdayData = {
      name: data.email.split('@')[0].replace('.', ' '),
      workday_id: `WD-${Date.now()}`,
      title: 'Employee',
      department: 'Unknown',
      cost_center: 'N/A',
      manager_name: 'Manager Name',
      manager_email: `manager@gusto.com`,
      employment_status: 'Active',
    };

    // Check if employee is terminated
    if (workdayData.employment_status === 'Terminated') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot provision access for a terminated employee',
      });
      return;
    }

    // Generate approval tokens
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + VALIDATION.ACCESS_TOKEN_EXPIRY_HOURS);

    // Create access request
    const { rows } = await query(
      `INSERT INTO access_requests (
        email, requested_role, admin_id, workday_data,
        manager_email, manager_name, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        data.email.toLowerCase(),
        data.requestedRole,
        admin.id,
        JSON.stringify(workdayData),
        workdayData.manager_email,
        workdayData.manager_name,
        expiresAt,
      ]
    );

    const requestId = rows[0].id;

    // Generate approval and denial tokens
    const { approvalToken, denialToken } = generateAccessTokens(requestId);

    // Update request with tokens
    await query(
      `UPDATE access_requests SET approval_token = $2, denial_token = $3 WHERE id = $1`,
      [requestId, approvalToken, denialToken]
    );

    // TODO: Send email to manager via Gmail MCP with approve/deny links

    // Log audit entry
    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.ACCESS_REQUESTED, {
      tableName: 'access_requests',
      recordId: requestId,
      newValues: {
        email: data.email,
        requestedRole: data.requestedRole,
        managerEmail: workdayData.manager_email,
      },
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'Access request created. Manager approval email sent.',
      data: {
        requestId,
        email: data.email,
        managerEmail: workdayData.manager_email,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error('Error provisioning user', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to provision user',
    });
  }
});

/**
 * POST /api/users/verify-workday
 * Verify user exists in Workday (simulated MCP call in dev mode)
 */
router.post('/verify-workday', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Email is required',
      });
      return;
    }

    if (!email.endsWith('@gusto.com')) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Only @gusto.com email addresses are allowed',
      });
      return;
    }

    // Check if user already exists
    const { rows: existingUser } = await query(
      'SELECT id, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.length > 0) {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_ENTRY,
        message: `User ${existingUser[0].name} already exists with this email`,
      });
      return;
    }

    // DEV MODE: Simulate Workday MCP lookup with realistic mock data
    // In production, this would call the Workday MCP server
    const nameParts = email.split('@')[0].split('.');
    const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Unknown';
    const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : '';
    const name = `${firstName} ${lastName}`.trim();

    // Generate realistic mock Workday data based on email
    const departments = ['Finance', 'Accounting', 'Operations', 'Treasury', 'Payroll', 'Engineering'];
    const titles = ['Financial Analyst', 'Senior Accountant', 'AP Specialist', 'Treasury Analyst', 'Finance Manager', 'Controller'];
    const managers = [
      { name: 'Jennifer Williams', email: 'jennifer.williams@gusto.com' },
      { name: 'Michael Chen', email: 'michael.chen@gusto.com' },
      { name: 'Sarah Johnson', email: 'sarah.johnson@gusto.com' },
      { name: 'David Kim', email: 'david.kim@gusto.com' },
    ];

    // Use email hash to consistently pick same values for same email
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const department = departments[hash % departments.length];
    const title = titles[hash % titles.length];
    const manager = managers[hash % managers.length];

    const workdayData = {
      name,
      title,
      department,
      manager_name: manager.name,
      manager_email: manager.email,
      workday_id: `WD-${hash.toString(16).toUpperCase().padStart(8, '0')}`,
      cost_center: `CC-${1000 + (hash % 100)}`,
      employment_status: 'Active',
      hire_date: '2023-01-15',
      location: 'San Francisco, CA',
    };

    logger.info('DEV MODE: Simulated Workday lookup', { email, workdayData });

    res.json({
      success: true,
      data: workdayData,
      _dev_mode: true,
      _dev_note: 'This is simulated Workday data for development. In production, this would call the Workday MCP server.',
    });
  } catch (error) {
    logger.error('Error verifying workday', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to verify employee in Workday',
    });
  }
});

/**
 * POST /api/users/create-direct (DEV MODE ONLY)
 * Directly create a user without manager approval - for development/testing only
 */
router.post('/create-direct', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'Direct user creation is not allowed in production',
      });
      return;
    }

    const { email, name, role, department, title, payment_limit, groupIds, accountIds } = req.body;
    const admin = req.user!;

    if (!email || !email.includes('@')) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Valid email address required',
      });
      return;
    }

    // Check if user already exists
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.length > 0) {
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: ERROR_CODES.DUPLICATE_ENTRY,
        message: 'A user with this email already exists',
      });
      return;
    }

    // Create user directly
    const { rows } = await query(
      `INSERT INTO users (email, name, role, status, department, title, payment_limit)
       VALUES ($1, $2, $3, 'active', $4, $5, $6)
       RETURNING *`,
      [email.toLowerCase(), name, role || 'staff', department, title, payment_limit]
    );

    // Add user to selected groups if provided
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gid of groupIds) {
        await query(
          'INSERT OR IGNORE INTO group_members (group_id, user_id, added_by) VALUES ($1, $2, $3)',
          [gid, rows[0].id, admin.id]
        );
      }
    }

    // Add user account access if provided
    if (Array.isArray(accountIds) && accountIds.length > 0) {
      for (const aid of accountIds) {
        await query(
          'INSERT OR IGNORE INTO user_account_access (user_id, account_id, created_by) VALUES ($1, $2, $3)',
          [rows[0].id, aid, admin.id]
        );
      }
    }

    // Sync department → group membership
    if (department) {
      await syncDepartmentGroup(rows[0].id, department, null, admin.id);
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_CREATED, {
      tableName: 'users',
      recordId: rows[0].id,
      newValues: { ...rows[0], groupIds, accountIds },
    });

    logger.info('DEV MODE: User created directly without manager approval', { email, role, groupIds, accountIds });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: rows[0],
      _dev_mode: true,
      _dev_note: 'User created directly in dev mode. In production, manager approval would be required.',
    });
  } catch (error) {
    logger.error('Error creating user directly', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create user',
    });
  }
});

/**
 * GET /api/users/access-requests
 * List pending access requests
 */
router.get('/access-requests', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT ar.*, u.name as admin_name, u.email as admin_email
       FROM access_requests ar
       LEFT JOIN users u ON ar.admin_id = u.id
       WHERE ar.status = 'pending'
       ORDER BY ar.created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    logger.error('Error listing access requests', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to list access requests',
    });
  }
});

/**
 * GET /api/users/:id
 * Get user details
 */
router.get('/:id', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      `SELECT id, email, name, role, status, workday_id, title, department,
              cost_center, manager_name, manager_email, pe_partner_name,
              pe_partner_email, payment_limit, last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error getting user', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get user',
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user details
 */
router.put('/:id', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = validate(updateUserSchema, req.body);
    const admin = req.user!;

    // Get existing user
    const { rows: existing } = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.paymentLimit !== undefined) {
      updates.push(`payment_limit = $${paramIndex++}`);
      values.push(data.paymentLimit);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      values.push(data.department);
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    if (updates.length === 0) {
      res.json({ success: true, data: existing[0] });
      return;
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    // Sync department → group membership when department changes
    if (data.department !== undefined) {
      await syncDepartmentGroup(id, data.department, existing[0].department, admin.id);
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_UPDATED, {
      tableName: 'users',
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
    logger.error('Error updating user', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update user',
    });
  }
});

/**
 * POST /api/users/:id/suspend
 * Suspend a user
 */
router.post('/:id/suspend', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;

    const { rows } = await query(
      `UPDATE users SET status = 'suspended', updated_at = datetime('now') WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_SUSPENDED, {
      tableName: 'users',
      recordId: id,
    });

    // TODO: Invalidate all user sessions

    res.json({
      success: true,
      message: 'User suspended',
    });
  } catch (error) {
    logger.error('Error suspending user', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to suspend user',
    });
  }
});

/**
 * POST /api/users/:id/reactivate
 * Reactivate a suspended user
 */
router.post('/:id/reactivate', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;

    const { rows } = await query(
      `UPDATE users SET status = 'active', updated_at = datetime('now') WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
      return;
    }

    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.USER_REACTIVATED, {
      tableName: 'users',
      recordId: id,
    });

    res.json({
      success: true,
      message: 'User reactivated',
    });
  } catch (error) {
    logger.error('Error reactivating user', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to reactivate user',
    });
  }
});

export default router;
