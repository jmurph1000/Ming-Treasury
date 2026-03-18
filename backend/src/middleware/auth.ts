import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, User } from '../types/index.js';
import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import { redis } from '../config/sessions.js';
import { updateLastActive } from '../services/sessionTracker.js';

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const SESSION_TIMEOUT_MS = (parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10)) * 60 * 1000;

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Main authentication middleware
 * Validates JWT token and loads user from database
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
      });
      return;
    }

    // Verify JWT token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (jwtError) {
      if ((jwtError as Error).name === 'TokenExpiredError') {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: ERROR_CODES.SESSION_EXPIRED,
          message: 'Session expired, please log in again',
        });
        return;
      }
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.INVALID_TOKEN,
        message: 'Invalid authentication token',
      });
      return;
    }

    // Check session validity in Redis
    const sessionKey = `session:${payload.sessionId}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.SESSION_EXPIRED,
        message: 'Session expired or invalidated',
      });
      return;
    }

    // Load fresh user data from database
    const { rows } = await query<User>(
      `SELECT id, email, name, role, status, workday_id as "workdayId",
              title, department, cost_center as "costCenter",
              manager_name as "managerName", manager_email as "managerEmail",
              pe_partner_name as "pePartnerName", pe_partner_email as "pePartnerEmail",
              payment_limit as "paymentLimit", last_login_at as "lastLoginAt",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'User not found',
      });
      return;
    }

    const user = rows[0];

    // Check user status
    if (user.status !== 'active') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.FORBIDDEN,
        message: `Account is ${user.status}. Please contact your administrator.`,
      });
      return;
    }

    // Extend session TTL (sliding window)
    await redis.pexpire(sessionKey, SESSION_TIMEOUT_MS);

    // Update last_active_at in user_sessions (throttle to every 5 minutes via session data)
    try {
      const session = JSON.parse(sessionData);
      const lastTrack = session.lastActivityTrack ? new Date(session.lastActivityTrack).getTime() : 0;
      if (Date.now() - lastTrack > 5 * 60 * 1000) {
        updateLastActive(payload.userId);
        session.lastActivityTrack = new Date().toISOString();
        await redis.set(sessionKey, JSON.stringify(session), 'PX', SESSION_TIMEOUT_MS);
      }
    } catch (_) { /* non-critical */ }

    // Attach user to request
    req.user = user;
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    logger.error('Authentication error', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Authentication failed',
    });
  }
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: User, sessionId: string): { accessToken: string; refreshToken: string } {
  const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId,
  };

  const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '30m';
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

  const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
    expiresIn: accessExpiry as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(
    { userId: user.id, sessionId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: refreshExpiry as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
}

/**
 * Create a new session in Redis
 */
export async function createSession(user: User, ipAddress: string, userAgent: string): Promise<string> {
  const sessionId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  const sessionKey = `session:${sessionId}`;

  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };

  await redis.set(sessionKey, JSON.stringify(sessionData), 'PX', SESSION_TIMEOUT_MS);

  // Update last login
  await query("UPDATE users SET last_login_at = datetime('now') WHERE id = $1", [user.id]);

  logger.info('Session created', { userId: user.id, sessionId });

  return sessionId;
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const sessionKey = `session:${sessionId}`;
  await redis.del(sessionKey);
  logger.info('Session invalidated', { sessionId });
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const pattern = `session:${userId}-*`;
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(...keys);
    logger.info('All user sessions invalidated', { userId, count: keys.length });
  }
}

/**
 * Optional authentication - doesn't fail if no token present
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  if (!authHeader && !cookieToken) {
    // No token provided, continue without user
    next();
    return;
  }

  // If token is provided, validate it
  await authenticate(req, res, next);
}

/**
 * Verify access request token (for manager approval links)
 */
export function verifyAccessToken(token: string): { requestId: string; action: 'approve' | 'deny' } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      requestId: string;
      action: 'approve' | 'deny';
      exp: number;
    };
    return { requestId: payload.requestId, action: payload.action };
  } catch {
    return null;
  }
}

/**
 * Generate access request tokens for manager approval
 */
export function generateAccessTokens(requestId: string): { approvalToken: string; denialToken: string } {
  const expiryHours = parseInt(process.env.ACCESS_TOKEN_EXPIRY_HOURS || '72', 10);

  const approvalToken = jwt.sign(
    { requestId, action: 'approve' },
    JWT_SECRET,
    { expiresIn: `${expiryHours}h` }
  );

  const denialToken = jwt.sign(
    { requestId, action: 'deny' },
    JWT_SECRET,
    { expiresIn: `${expiryHours}h` }
  );

  return { approvalToken, denialToken };
}

// Export redis client for use in other modules
export { redis };
