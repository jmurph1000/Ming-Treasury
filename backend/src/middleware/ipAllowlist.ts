import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { query } from '../config/sqlite.js';
import { getClientIp } from './audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

// Cache for IP allowlist (refreshed every 5 minutes)
let allowlistCache: string[] = [];
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if an IP address matches a CIDR range
 */
function ipMatchesCidr(ip: string, cidr: string): boolean {
  // Handle exact IP match
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  // Convert IPs to numbers for comparison
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  if (ipNum === null || rangeNum === null) {
    return false;
  }

  // Create bitmask and compare
  const bitmask = ~((1 << (32 - mask)) - 1);
  return (ipNum & bitmask) === (rangeNum & bitmask);
}

/**
 * Convert IPv4 address to 32-bit number
 */
function ipToNumber(ip: string): number | null {
  // Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  const parts = ip.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return (nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3];
}

/**
 * Refresh the IP allowlist cache from the database
 */
async function refreshAllowlistCache(): Promise<void> {
  try {
    const { rows } = await query<{ cidr: string }>(
      'SELECT cidr FROM ip_allowlist WHERE is_active = true'
    );
    allowlistCache = rows.map((r) => r.cidr);
    cacheLastUpdated = Date.now();
    logger.debug('IP allowlist cache refreshed', { count: allowlistCache.length });
  } catch (error) {
    logger.error('Failed to refresh IP allowlist cache', { error: (error as Error).message });
    // Keep the old cache on error
  }
}

/**
 * Get the current IP allowlist (with caching)
 */
async function getAllowlist(): Promise<string[]> {
  if (Date.now() - cacheLastUpdated > CACHE_TTL_MS) {
    await refreshAllowlistCache();
  }
  return allowlistCache;
}

/**
 * Middleware to check if request IP is in the allowlist
 * Should be applied to sensitive endpoints
 */
export async function ipAllowlistMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip in development mode if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_IP_ALLOWLIST === 'true') {
    next();
    return;
  }

  const clientIp = getClientIp(req);
  const allowlist = await getAllowlist();

  // If allowlist is empty, allow all (fail open for initial setup)
  if (allowlist.length === 0) {
    logger.warn('IP allowlist is empty - allowing all requests');
    next();
    return;
  }

  // Check if IP matches any allowed CIDR
  const isAllowed = allowlist.some((cidr) => ipMatchesCidr(clientIp, cidr));

  if (!isAllowed) {
    logger.warn('Request blocked by IP allowlist', {
      ip: clientIp,
      path: req.path,
      userId: req.user?.id,
    });

    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: ERROR_CODES.FORBIDDEN,
      message: 'Access denied. Your IP address is not authorized.',
    });
    return;
  }

  next();
}

/**
 * Check if an IP is allowed (for use outside middleware)
 */
export async function isIpAllowed(ip: string): Promise<boolean> {
  const allowlist = await getAllowlist();

  if (allowlist.length === 0) {
    return true; // Empty allowlist = allow all
  }

  return allowlist.some((cidr) => ipMatchesCidr(ip, cidr));
}

/**
 * Add an IP or CIDR to the allowlist
 */
export async function addToAllowlist(
  cidr: string,
  description: string,
  createdBy?: string
): Promise<void> {
  await query(
    'INSERT INTO ip_allowlist (cidr, description, created_by) VALUES ($1, $2, $3)',
    [cidr, description, createdBy || null]
  );

  // Invalidate cache
  cacheLastUpdated = 0;
  logger.info('IP added to allowlist', { cidr, description });
}

/**
 * Remove an IP or CIDR from the allowlist
 */
export async function removeFromAllowlist(cidr: string): Promise<void> {
  await query('UPDATE ip_allowlist SET is_active = false WHERE cidr = $1', [cidr]);

  // Invalidate cache
  cacheLastUpdated = 0;
  logger.info('IP removed from allowlist', { cidr });
}

/**
 * Force refresh of the allowlist cache
 */
export async function forceRefreshAllowlist(): Promise<void> {
  await refreshAllowlistCache();
}
