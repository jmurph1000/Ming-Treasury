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
import { trackLogin, trackLogout } from '../services/sessionTracker.js';

const router = Router();

const AUTH_MODE = process.env.AUTH_MODE || 'local';

/**
 * GET /api/auth/mode
 * Returns the current authentication mode so the frontend can adapt
 */
router.get('/mode', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      mode: AUTH_MODE,
      oktaIssuer: AUTH_MODE === 'okta' ? process.env.OKTA_ISSUER : undefined,
      oktaClientId: AUTH_MODE === 'okta' ? process.env.OKTA_CLIENT_ID : undefined,
      oktaRedirectUri: AUTH_MODE === 'okta' ? process.env.OKTA_REDIRECT_URI : undefined,
    },
  });
});

/**
 * GET /api/auth/okta/callback
 * Handle the Okta OIDC authorization code callback.
 * Exchanges the code for tokens, extracts the user's email,
 * maps it to an existing user, and creates a session.
 */
router.get('/okta/callback', strictRateLimit, async (req: Request, res: Response) => {
  try {
    if (AUTH_MODE !== 'okta') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Okta SSO is not enabled (AUTH_MODE != okta)',
      });
      return;
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Authorization code is required',
      });
      return;
    }

    // Exchange authorization code for tokens
    const tokenUrl = `${process.env.OKTA_ISSUER}/v1/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.OKTA_REDIRECT_URI || '',
        client_id: process.env.OKTA_CLIENT_ID || '',
        client_secret: process.env.OKTA_CLIENT_SECRET || '',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error('Okta token exchange failed', { status: tokenRes.status, body: errBody });
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Okta authentication failed',
      });
      return;
    }

    const tokenData = await tokenRes.json() as { id_token?: string; access_token?: string };

    // Decode the ID token to get the user's email (header.payload.sig)
    const idToken = tokenData.id_token;
    if (!idToken) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'No ID token received from Okta',
      });
      return;
    }

    const payloadB64 = idToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      email?: string;
      sub?: string;
      name?: string;
    };
    const email = payload.email || payload.sub;

    if (!email) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Could not determine email from Okta token',
      });
      return;
    }

    // Look up user in our database
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
      // Redirect to frontend with error — user not provisioned
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Access denied — contact Treasury to request access')}`);
      return;
    }

    const user = rows[0];
    if (user.status !== 'active') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(`Your account is ${user.status}. Please contact your administrator.`)}`);
      return;
    }

    // Create session and tokens (same flow as local login)
    const clientIp = getClientIp(req as AuthenticatedRequest);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = await createSession(user, clientIp, userAgent);
    const { accessToken, refreshToken } = generateToken(user, sessionId);

    // Track session
    const userGroupResult = await query<{ name: string }>(
      `SELECT g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1 LIMIT 1`,
      [user.id]
    );
    trackLogin(user.id, user.name, userGroupResult.rows[0]?.name || null, clientIp, userAgent);

    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.USER_LOGIN, {
      ipAddress: clientIp,
      sessionId,
      method: 'okta_sso',
    });

    // Set cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    };

    res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 30 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payments`);
  } catch (error) {
    logger.error('Okta callback error', { error: (error as Error).message });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('SSO authentication failed')}`);
  }
});

/**
 * POST /api/auth/login
 * Handle local email-based login (AUTH_MODE=local) or Okta token login
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

    // In Okta mode, local email-only login is not allowed
    if (AUTH_MODE === 'okta' && !oktaToken) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: 'Local login is disabled. Please use Okta SSO.',
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

    // Track session in user_sessions table
    const userGroupResult = await query<{ name: string }>(
      `SELECT g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1 LIMIT 1`,
      [user.id]
    );
    trackLogin(user.id, user.name, userGroupResult.rows[0]?.name || null, clientIp, userAgent);

    // Log the login
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.USER_LOGIN, {
      ipAddress: clientIp,
      sessionId,
    });

    // Set cookies — strict sameSite in production, lax in dev for cross-port requests
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
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

    // Check if user is a Treasury supervisor (for sidebar visibility)
    const { rows: tRows } = query<{ is_supervisor: number }>(
      `SELECT is_supervisor FROM group_members WHERE user_id = $1 AND group_id = 'grp-treasury'`,
      [user.id]
    );
    const isTreasurySupervisor = tRows.length > 0 && tRows[0].is_supervisor === 1;

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
          isTreasurySupervisor,
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

      // Track logout in user_sessions
      if (req.user?.id) {
        trackLogout(req.user.id);
      }

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

  // Check if user is a Treasury supervisor
  const { rows: tRows } = query<{ is_supervisor: number }>(
    `SELECT is_supervisor FROM group_members WHERE user_id = $1 AND group_id = 'grp-treasury'`,
    [user.id]
  );
  const isTreasurySupervisor = tRows.length > 0 && tRows[0].is_supervisor === 1;

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
      isTreasurySupervisor,
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
