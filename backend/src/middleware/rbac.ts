import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types/index.js';
import { ROLE_HIERARCHY, ROLE_PAYMENT_LIMITS, ERROR_CODES, HTTP_STATUS, TREASURY_ADMIN_EMAILS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

/**
 * Check if user has required role or higher
 */
export function hasRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
      });
      return;
    }

    // Admin has access to everything
    if (user.role === 'admin') {
      next();
      return;
    }

    // Check if user's role is in the allowed list
    if (allowedRoles.includes(user.role)) {
      next();
      return;
    }

    logger.warn('Access denied - insufficient role', {
      userId: user.id,
      userRole: user.role,
      requiredRoles: allowedRoles,
      path: req.path,
    });

    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'You do not have permission to perform this action',
    });
  };
}

/**
 * Check if user has minimum role level
 */
export function hasMinimumRole(minimumRole: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
      });
      return;
    }

    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel >= requiredLevel) {
      next();
      return;
    }

    logger.warn('Access denied - insufficient role level', {
      userId: user.id,
      userRole: user.role,
      requiredRole: minimumRole,
      path: req.path,
    });

    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'You do not have permission to perform this action',
    });
  };
}

/**
 * Check if user can approve payments (not AP Staff)
 */
export function canApprove(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
    });
    return;
  }

  // Read-only and Staff cannot approve
  if (user.role === 'staff' || user.role === 'read_only') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: user.role === 'read_only' ? 'Read-only users cannot approve payments' : 'Staff members cannot approve payments',
    });
    return;
  }

  next();
}

/**
 * Check if user can execute payments (Treasury only)
 */
export function canExecute(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
    });
    return;
  }

  // Only Admin can execute payments
  if (user.role !== 'admin') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Only Administrators can execute payments',
    });
    return;
  }

  next();
}

/**
 * Check if user can create payments within their limit
 */
export function checkPaymentLimit(amount: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required',
      });
      return;
    }

    // Get user's payment limit (custom or role-based)
    const limit = user.paymentLimit ?? ROLE_PAYMENT_LIMITS[user.role];

    // null means unlimited
    if (limit === null) {
      next();
      return;
    }

    if (amount > limit) {
      logger.warn('Payment limit exceeded', {
        userId: user.id,
        userRole: user.role,
        limit,
        requestedAmount: amount,
      });

      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: ERROR_CODES.PAYMENT_LIMIT_EXCEEDED,
        message: `Payment amount exceeds your limit of $${limit.toLocaleString()}`,
        data: { limit, requested: amount },
      });
      return;
    }

    next();
  };
}

/**
 * Admin only middleware
 */
export function adminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
    });
    return;
  }

  if (user.role !== 'admin') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Administrator access required',
    });
    return;
  }

  next();
}

/**
 * Admin only middleware (for dashboard access)
 * Kept for backward compatibility — same as adminOnly.
 */
export const cfoOrAdmin = adminOnly;

/**
 * Block read-only users from write operations (create, update, delete)
 */
export function readOnlyBlock(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
    });
    return;
  }

  if (user.role === 'read_only') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Read-only users cannot perform this action',
    });
    return;
  }

  next();
}

/**
 * Treasury Admin only middleware
 * Checks if the user's email is in the TREASURY_ADMIN_EMAILS list.
 */
export function treasuryAdminOnly(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: ERROR_CODES.UNAUTHORIZED,
      message: 'Authentication required',
    });
    return;
  }

  if (!(TREASURY_ADMIN_EMAILS as readonly string[]).includes(user.email)) {
    logger.warn('Access denied - not a Treasury Administrator', {
      userId: user.id,
      userEmail: user.email,
      path: req.path,
    });

    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Unauthorized — Treasury Administrator access required',
    });
    return;
  }

  next();
}

/**
 * Get user's payment limit
 */
export function getUserPaymentLimit(user: { role: UserRole; paymentLimit?: number | null }): number | null {
  return user.paymentLimit ?? ROLE_PAYMENT_LIMITS[user.role] ?? null;
}

/**
 * Check if user can approve for a specific role in the chain
 */
export function canApproveForRole(userRole: UserRole, requiredRole: UserRole): boolean {
  // Admin can approve for any role
  if (userRole === 'admin') return true;

  // User must have the exact role or higher
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Get roles that can be approved by the given role
 */
export function getApprovableRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;

  return (Object.entries(ROLE_HIERARCHY) as [UserRole, number][])
    .filter(([, level]) => level <= userLevel)
    .map(([role]) => role);
}
