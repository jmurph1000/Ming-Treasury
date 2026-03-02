import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { query, setSessionContext, getClient } from '../config/sqlite.js';
import { auditLogger } from '../utils/logger.js';
import { maskSensitiveFields, maskIpAddress } from '../utils/masks.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to set up audit context for the request
 * This sets PostgreSQL session variables that are used by audit triggers
 */
export async function setupAuditContext(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Generate a unique request ID for tracing
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;

  // Get client IP (considering proxies)
  const clientIp = getClientIp(req);

  // Store audit context on request for later use
  (req as AuthenticatedRequest & { auditContext: AuditContext }).auditContext = {
    requestId,
    clientIp,
    userAgent: req.headers['user-agent'] || 'unknown',
    userId: req.user?.id,
    userEmail: req.user?.email,
    sessionId: req.sessionId,
    method: req.method,
    path: req.path,
    startTime: Date.now(),
  };

  // Log request start
  auditLogger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: maskIpAddress(clientIp),
  });

  // Set up response finished handler for request completion logging
  res.on('finish', () => {
    const duration = Date.now() - (req as AuthenticatedRequest & { auditContext: AuditContext }).auditContext.startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    auditLogger[level]('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    });
  });

  next();
}

interface AuditContext {
  requestId: string;
  clientIp: string;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  sessionId?: string;
  method: string;
  path: string;
  startTime: number;
}

/**
 * Get client IP address from request, considering reverse proxies
 */
export function getClientIp(req: AuthenticatedRequest): string {
  // Check for forwarded headers (set by reverse proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, first one is the client
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  // Check for real IP header (set by nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket remote address
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Log a manual audit entry (for actions not captured by database triggers)
 */
export async function logAuditEntry(
  userId: string | undefined,
  userEmail: string | undefined,
  action: string,
  details: {
    tableName?: string;
    recordId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    sessionId?: string;
    requestId?: string;
  }
): Promise<void> {
  try {
    // Mask sensitive data before logging
    const maskedOld = details.oldValues ? maskSensitiveFields(details.oldValues) : null;
    const maskedNew = details.newValues ? maskSensitiveFields(details.newValues) : null;

    await query(
      `INSERT INTO audit_log (
        user_id, user_email, action, table_name, record_id,
        old_values, new_values, ip_address, session_id, request_id, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, datetime('now'))`,
      [
        userId || null,
        userEmail || 'system',
        action,
        details.tableName || null,
        details.recordId || null,
        maskedOld ? JSON.stringify(maskedOld) : null,
        maskedNew ? JSON.stringify(maskedNew) : null,
        details.ipAddress || null,
        details.sessionId || null,
        details.requestId || null,
      ]
    );

    // Also log to file for immediate access
    auditLogger.info(action, {
      userId,
      userEmail,
      tableName: details.tableName,
      recordId: details.recordId,
      hasChanges: !!(details.oldValues || details.newValues),
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main operation
    auditLogger.error('Failed to log audit entry', {
      action,
      error: (error as Error).message,
    });
  }
}

/**
 * Create an audited database transaction
 * Automatically sets session context for audit triggers
 */
export async function auditedTransaction<T>(
  req: AuthenticatedRequest,
  callback: (client: Awaited<ReturnType<typeof getClient>>) => Promise<T>
): Promise<T> {
  const client = await getClient();
  const context = (req as AuthenticatedRequest & { auditContext?: AuditContext }).auditContext;

  try {
    await client.query('BEGIN');

    // Set session context for audit triggers
    await setSessionContext(
      client,
      req.user?.id,
      req.user?.email,
      context?.clientIp,
      req.sessionId
    );

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Audit action types for consistency
 */
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',

  // Payment actions
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAYMENT_RETURNED: 'PAYMENT_RETURNED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  PAYMENT_EXECUTED: 'PAYMENT_EXECUTED',
  PAYMENT_BANK_REJECTED: 'PAYMENT_BANK_REJECTED',

  // Execution actions
  EXECUTION_CONFIRMED: 'EXECUTION_CONFIRMED',
  EXECUTION_HALTED: 'EXECUTION_HALTED',
  BATCH_EXECUTED: 'BATCH_EXECUTED',

  // Access request actions
  ACCESS_REQUESTED: 'ACCESS_REQUESTED',
  ACCESS_APPROVED: 'ACCESS_APPROVED',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // Admin actions
  ROUTING_RULE_CREATED: 'ROUTING_RULE_CREATED',
  ROUTING_RULE_UPDATED: 'ROUTING_RULE_UPDATED',
  ROUTING_RULE_DELETED: 'ROUTING_RULE_DELETED',
  CHAIN_UPDATED: 'CHAIN_UPDATED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_UPDATED: 'ACCOUNT_UPDATED',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',

  // Group actions
  GROUP_APPROVAL_FLOW_UPDATED: 'GROUP_APPROVAL_FLOW_UPDATED',

  // Export actions
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  REPORT_PUSHED_TO_SHEETS: 'REPORT_PUSHED_TO_SHEETS',
} as const;
