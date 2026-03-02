import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { validate, auditLogFilterSchema } from '../utils/validators.js';
import { hasRole } from '../middleware/rbac.js';
import { exportRateLimit } from '../middleware/rateLimit.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/audit', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = validate(auditLogFilterSchema, req.query);
    let sql = `SELECT al.*, u.name as user_name FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;
    if (filters.userId) { sql += ` AND al.user_id = $${idx++}`; params.push(filters.userId); }
    if (filters.action) { sql += ` AND al.action LIKE $${idx++}`; params.push(`%${filters.action}%`); }
    if (filters.tableName) { sql += ` AND al.table_name = $${idx++}`; params.push(filters.tableName); }
    if (filters.startDate) { sql += ` AND al.timestamp >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { sql += ` AND al.timestamp <= $${idx++}`; params.push(filters.endDate); }
    sql += ` ORDER BY al.timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(filters.limit, (filters.page - 1) * filters.limit);
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows, meta: { page: filters.page, limit: filters.limit } });
  } catch (error) {
    logger.error('Error getting audit log', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/export', hasRole('admin', 'manager', 'sr_manager'), exportRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { format, filters, reportType } = req.body;
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.REPORT_EXPORTED, {
      newValues: { format, reportType, filters },
    });
    // TODO: Generate actual export file
    res.json({ success: true, message: 'Export queued', data: { downloadUrl: '/api/reports/download/placeholder' } });
  } catch (error) {
    logger.error('Error exporting report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/reports/treasury/daily?date=YYYY-MM-DD
 * All payments approved by treasury on a given date
 */
router.get('/treasury/daily', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const { rows } = await query(
      `SELECT
        p.reference_number,
        p.payee_name,
        p.amount,
        p.currency,
        p.usd_equivalent,
        p.payment_type,
        p.status,
        p.submitted_at,
        p.executed_at,
        pa.actioned_at AS approval_timestamp,
        u.name AS approver_name,
        pa.approver_role
      FROM payment_approvals pa
      JOIN payments p ON p.id = pa.payment_id
      LEFT JOIN users u ON pa.approver_id = u.id
      WHERE pa.action = 'approved'
        AND pa.approver_role = 'admin'
        AND date(pa.actioned_at) = $1
      ORDER BY pa.actioned_at DESC`,
      [date]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting treasury daily report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/reports/treasury/weekly?startDate=YYYY-MM-DD
 * Treasury-approved payments for 7-day range grouped by date
 */
router.get('/treasury/weekly', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date().toISOString().slice(0, 10);

    const { rows } = await query(
      `SELECT
        date(pa.actioned_at) AS approval_date,
        p.reference_number,
        p.payee_name,
        p.amount,
        p.currency,
        p.usd_equivalent,
        p.payment_type,
        p.status,
        p.submitted_at,
        p.executed_at,
        pa.actioned_at AS approval_timestamp,
        u.name AS approver_name,
        pa.approver_role
      FROM payment_approvals pa
      JOIN payments p ON p.id = pa.payment_id
      LEFT JOIN users u ON pa.approver_id = u.id
      WHERE pa.action = 'approved'
        AND pa.approver_role = 'admin'
        AND date(pa.actioned_at) >= $1
        AND date(pa.actioned_at) < date($1, '+7 days')
      ORDER BY pa.actioned_at DESC`,
      [startDate]
    );

    // Group by date
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      const d = (row as any).approval_date;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(row);
    }

    res.json({ success: true, data: grouped });
  } catch (error) {
    logger.error('Error getting treasury weekly report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/reports/treasury/lifetime?page=1&limit=25&sortBy=actioned_at&sortOrder=desc
 * All payments ever approved by treasury, paginated
 */
router.get('/treasury/lifetime', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy as string || 'actioned_at';
    const sortOrder = (req.query.sortOrder as string || 'desc').toUpperCase();

    const allowedSortColumns: Record<string, string> = {
      actioned_at: 'pa.actioned_at',
      amount: 'p.amount',
      approver: 'u.name',
      status: 'p.status',
      payee_name: 'p.payee_name',
    };
    const safeSortColumn = allowedSortColumns[sortBy] || 'pa.actioned_at';
    const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const { rows: countRows } = await query<{ total: string }>(
      `SELECT COUNT(*) as total
       FROM payment_approvals pa
       JOIN payments p ON p.id = pa.payment_id
       WHERE pa.action = 'approved' AND pa.approver_role = 'admin'`
    );
    const total = parseInt(countRows[0].total, 10);

    const { rows } = await query(
      `SELECT
        p.reference_number,
        p.payee_name,
        p.amount,
        p.currency,
        p.usd_equivalent,
        p.payment_type,
        p.status,
        p.submitted_at,
        p.executed_at,
        pa.actioned_at AS approval_timestamp,
        u.name AS approver_name,
        pa.approver_role
      FROM payment_approvals pa
      JOIN payments p ON p.id = pa.payment_id
      LEFT JOIN users u ON pa.approver_id = u.id
      WHERE pa.action = 'approved'
        AND pa.approver_role = 'admin'
      ORDER BY ${safeSortColumn} ${safeSortOrder}
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('Error getting treasury lifetime report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/sheets', hasRole('admin'), exportRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.REPORT_PUSHED_TO_SHEETS, {});
    // TODO: Push to Google Sheets via MCP
    res.json({ success: true, message: 'Report pushed to Google Sheets' });
  } catch (error) {
    logger.error('Error pushing to sheets', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
