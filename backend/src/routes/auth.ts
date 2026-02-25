import { Router, Request, Response } from 'express';
import { query } from '../config/sqlite.js';
import {
  generateToken,
  createSession,
  invalidateSession,
  verifyAccessToken,
  authenticate,
  redis,
} from '../middleware/auth.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { logAuditEntry, AUDIT_ACTIONS, getClientIp } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import { AuthenticatedRequest, User } from '../types/index.js';

const router = Router();

/**
 * POST /api/auth/login
 * Handle login callback from Okta SSO
 * In production, this would validate the Okta token
 */
router.post('/login', strictRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, oktaToken } = req.body;

    if (!email) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Email is required',
      });
      return;
    }

    // TODO: In production, validate the Okta token via MCP
    // For development, we'll look up the user directly
    if (process.env.NODE_ENV === 'production' && !oktaToken) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Okta token is required',
      });
      return;
    }

    // Look up user
    const { rows } = await query<User>(
      `SELECT id, email, name, role, status, workday_id as "workdayId",
              title, department, cost_center as "costCenter",
              manager_name as "managerName", manager_email as "managerEmail",
              pe_partner_name as "pePartnerName", pe_partner_email as "pePartnerEmail",
              payment_limit as "paymentLimit", last_login_at as "lastLoginAt",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'User not found. Please contact your administrator for access.',
      });
      return;
    }

    const user = rows[0];

    // Check user status
    if (user.status !== 'active') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: `Your account is ${user.status}. Please contact your administrator.`,
      });
      return;
    }

    // Create session
    const clientIp = getClientIp(req as AuthenticatedRequest);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = await createSession(user, clientIp, userAgent);

    // Generate tokens
    const { accessToken, refreshToken } = generateToken(user, sessionId);

    // Log the login
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.USER_LOGIN, {
      ipAddress: clientIp,
      sessionId,
    });

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          title: user.title,
          department: user.department,
          paymentLimit: user.paymentLimit,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Login failed',
    });
  }
});

/**
 * POST /api/auth/logout
 * Log out the current user
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.sessionId) {
      await invalidateSession(req.sessionId);

      // Log the logout
      await logAuditEntry(req.user?.id, req.user?.email, AUDIT_ACTIONS.USER_LOGOUT, {
        sessionId: req.sessionId,
      });
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Logout failed',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title,
      department: user.department,
      costCenter: user.costCenter,
      paymentLimit: user.paymentLimit,
      managerName: user.managerName,
      lastLoginAt: user.lastLoginAt,
    },
  });
});

/**
 * POST /api/auth/refresh
 * Refresh the access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Refresh token required',
      });
      return;
    }

    // TODO: Verify refresh token and issue new access token
    // This is a simplified implementation

    res.status(HTTP_STATUS.NOT_IMPLEMENTED).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Token refresh not implemented',
    });
  } catch (error) {
    logger.error('Token refresh error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Token refresh failed',
    });
  }
});

/**
 * GET /api/auth/access/:token
 * Validate an access request token (for manager approval links)
 * This is a PUBLIC endpoint - no auth required
 */
router.get('/access/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const tokenData = verifyAccessToken(token);

    if (!tokenData) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid or expired token',
      });
      return;
    }

    // Look up the access request
    const { rows } = await query(
      `SELECT ar.*, u.name as admin_name
       FROM access_requests ar
       LEFT JOIN users u ON ar.admin_id = u.id
       WHERE ar.id = $1 AND ar.status = 'pending'`,
      [tokenData.requestId]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Access request not found or already processed',
      });
      return;
    }

    const request = rows[0];

    res.json({
      success: true,
      data: {
        action: tokenData.action,
        email: request.email,
        requestedRole: request.requested_role,
        workdayData: request.workday_data,
        adminName: request.admin_name,
        expiresAt: request.expires_at,
      },
    });
  } catch (error) {
    logger.error('Access token validation error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Token validation failed',
    });
  }
});

/**
 * POST /api/auth/access/:token/respond
 * Respond to an access request (approve/deny)
 * This is a PUBLIC endpoint - no auth required
 */
router.post('/access/:token/respond', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const tokenData = verifyAccessToken(token);

    if (!tokenData) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid or expired token',
      });
      return;
    }

    // Look up the access request
    const { rows } = await query(
      `SELECT * FROM access_requests WHERE id = $1 AND status = 'pending'`,
      [tokenData.requestId]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Access request not found or already processed',
      });
      return;
    }

    const request = rows[0];

    if (tokenData.action === 'approve') {
      // Update request status
      await query(
        `UPDATE access_requests
         SET status = 'approved', manager_response_at = datetime('now')
         WHERE id = $1`,
        [tokenData.requestId]
      );

      // Create the user
      await query(
        `INSERT INTO users (email, name, role, status, workday_id, title, department,
                           cost_center, manager_name, manager_email)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)`,
        [
          request.email,
          request.workday_data?.name || request.email.split('@')[0],
          request.requested_role,
          request.workday_data?.workday_id,
          request.workday_data?.title,
          request.workday_data?.department,
          request.workday_data?.cost_center,
          request.workday_data?.manager_name,
          request.manager_email,
        ]
      );

      // Log the approval
      await logAuditEntry(undefined, request.manager_email, AUDIT_ACTIONS.ACCESS_APPROVED, {
        tableName: 'access_requests',
        recordId: tokenData.requestId,
        newValues: { email: request.email, role: request.requested_role },
      });

      // TODO: Trigger Okta user creation via MCP
      // TODO: Send welcome email via Gmail MCP

      res.json({
        success: true,
        message: 'Access request approved. The user will receive setup instructions.',
      });
    } else {
      // Deny the request
      await query(
        `UPDATE access_requests
         SET status = 'denied', manager_response_at = datetime('now'), denial_reason = $2
         WHERE id = $1`,
        [tokenData.requestId, reason || 'No reason provided']
      );

      // Log the denial
      await logAuditEntry(undefined, request.manager_email, AUDIT_ACTIONS.ACCESS_DENIED, {
        tableName: 'access_requests',
        recordId: tokenData.requestId,
        newValues: { email: request.email, reason },
      });

      res.json({
        success: true,
        message: 'Access request denied.',
      });
    }
  } catch (error) {
    logger.error('Access request response error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to process response',
    });
  }
});

export default router;
