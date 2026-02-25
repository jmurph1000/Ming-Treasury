import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { redis } from '../config/sessions.js';
import { SECURITY, ERROR_CODES, HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Standard rate limiter for authenticated endpoints
 * 100 requests per minute per user
 */
export const standardRateLimit = rateLimit({
  windowMs: SECURITY.RATE_LIMIT_WINDOW_MS,
  max: SECURITY.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,

  // Use user ID as key if authenticated, otherwise IP
  keyGenerator: (req: Request) => {
    const user = (req as Request & { user?: { id: string } }).user;
    if (user?.id) {
      return `user:${user.id}`;
    }
    return req.ip || 'unknown';
  },

  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userId: (req as Request & { user?: { id: string } }).user?.id,
      path: req.path,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(SECURITY.RATE_LIMIT_WINDOW_MS / 1000),
    });
  },

  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per minute (login, password reset, etc.)
 */
export const strictRateLimit = rateLimit({
  windowMs: SECURITY.RATE_LIMIT_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },

  handler: (req: Request, res: Response) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Too many attempts. Please wait before trying again.',
      retryAfter: Math.ceil(SECURITY.RATE_LIMIT_WINDOW_MS / 1000),
    });
  },
});

/**
 * Global rate limiter using Redis for distributed systems
 * 1000 requests per minute globally
 */
export async function globalRateLimitMiddleware(
  req: Request,
  res: Response,
  next: () => void
): Promise<void> {
  const key = 'rate:global';
  const windowMs = SECURITY.RATE_LIMIT_WINDOW_MS;
  const maxRequests = SECURITY.GLOBAL_RATE_LIMIT;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await redis.pexpire(key, windowMs);
    }

    if (current > maxRequests) {
      logger.error('Global rate limit exceeded', {
        current,
        max: maxRequests,
      });

      res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: ERROR_CODES.INTERNAL_ERROR,
        message: 'Service temporarily unavailable. Please try again later.',
      });
      return;
    }

    next();
  } catch (error) {
    // If Redis fails, allow the request (fail open for availability)
    logger.error('Rate limit check failed', { error: (error as Error).message });
    next();
  }
}

/**
 * Rate limiter for export operations (expensive)
 * 5 exports per minute
 */
export const exportRateLimit = rateLimit({
  windowMs: SECURITY.RATE_LIMIT_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request) => {
    const user = (req as Request & { user?: { id: string } }).user;
    return user?.id || req.ip || 'unknown';
  },

  handler: (req: Request, res: Response) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Export rate limit exceeded. Please wait before requesting another export.',
    });
  },
});

/**
 * Rate limiter for approval actions
 * 30 approvals per minute (prevent rapid-fire approvals)
 */
export const approvalRateLimit = rateLimit({
  windowMs: SECURITY.RATE_LIMIT_WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: Request) => {
    const user = (req as Request & { user?: { id: string } }).user;
    return `approval:${user?.id || req.ip}`;
  },

  handler: (req: Request, res: Response) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Too many approval actions. Please slow down.',
    });
  },
});
