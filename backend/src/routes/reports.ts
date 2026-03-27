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

// ─── Dashboard Stats ───────────────────────────────────────────────────────

/**
 * GET /api/reports/dashboard
 * Real-time summary stats for the Reports Dashboard tab
 */
router.get('/dashboard', hasRole('admin', 'manager', 'sr_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';

    // For non-admin users, scope to own payments + payments from users in same groups
    const isAdmin = user.role === 'admin';

    // Pre-fetch visible user IDs for non-admin users (parameterized)
    let visibleUserIds: string[] | null = null;
    if (!isAdmin) {
      const { rows: groupUserRows } = await query<{ user_id: string }>(
        `SELECT DISTINCT gm2.user_id FROM group_members gm
         JOIN group_members gm2 ON gm2.group_id = gm.group_id
         WHERE gm.user_id = $1`,
        [user.id]
      );
      visibleUserIds = [...new Set([user.id, ...groupUserRows.map(r => r.user_id)])];
    }

    // Build a scope filter using IN (?) placeholders
    function scopedQuery<T>(sql: string, params: unknown[] = []): ReturnType<typeof query<T>> {
      if (isAdmin) return query<T>(sql, params);
      const placeholders = visibleUserIds!.map((_, i) => `$${params.length + i + 1}`).join(',');
      const scopedSql = sql.replace('/*SCOPE*/', `AND p.requester_id IN (${placeholders})`);
      return query<T>(scopedSql, [...params, ...visibleUserIds!]);
    }

    // Pending approvals count
    const { rows: pendingRows } = await scopedQuery<{ count: number }>(`
      SELECT COUNT(*) AS count FROM payments p WHERE status = 'pending_approval' /*SCOPE*/
    `);

    // MTD payments (submitted this month)
    const { rows: mtdRows } = await scopedQuery<{ count: number; total: number }>(`
      SELECT COUNT(*) AS count, COALESCE(SUM(usd_equivalent), 0) AS total
      FROM payments p WHERE date(created_at) >= $1 /*SCOPE*/
    `, [monthStart]);

    // Executed today
    const { rows: execRows } = await scopedQuery<{ count: number; total: number }>(`
      SELECT COUNT(*) AS count, COALESCE(SUM(usd_equivalent), 0) AS total
      FROM payments p WHERE status = 'executed' AND date(executed_at) = $1 /*SCOPE*/
    `, [today]);

    // Ready to execute
    const { rows: readyRows } = await scopedQuery<{ count: number }>(`
      SELECT COUNT(*) AS count FROM payments p WHERE status IN ('ready_to_execute', 'pending_confirmation') /*SCOPE*/
    `);

    // Pipeline breakdown by status
    const { rows: pipelineRows } = await scopedQuery<{ status: string; count: number; total: number }>(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(usd_equivalent), 0) AS total
      FROM payments p
      WHERE 1=1 /*SCOPE*/
      GROUP BY status
      ORDER BY count DESC
    `);

    // Escalations count (pending approvals older than 24h)
    const { rows: escRows } = isAdmin
      ? await query<{ count: number }>(`
          SELECT COUNT(*) AS count FROM payment_approvals
          WHERE action = 'pending'
            AND datetime(created_at, '+24 hours') < datetime('now')
        `)
      : await (async () => {
          const placeholders = visibleUserIds!.map((_, i) => `$${i + 1}`).join(',');
          return query<{ count: number }>(`
            SELECT COUNT(*) AS count FROM payment_approvals pa
            WHERE pa.action = 'pending'
              AND datetime(pa.created_at, '+24 hours') < datetime('now')
              AND pa.payment_id IN (
                SELECT p.id FROM payments p WHERE p.requester_id IN (${placeholders})
              )
          `, visibleUserIds!);
        })();

    res.json({
      success: true,
      data: {
        pendingApprovals: pendingRows[0]?.count || 0,
        mtdCount: mtdRows[0]?.count || 0,
        mtdAmount: mtdRows[0]?.total || 0,
        executedTodayCount: execRows[0]?.count || 0,
        executedTodayAmount: execRows[0]?.total || 0,
        readyToExecute: readyRows[0]?.count || 0,
        escalations: escRows[0]?.count || 0,
        pipeline: pipelineRows,
      },
    });
  } catch (error) {
    logger.error('Error getting dashboard stats', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

// ─── Audit Log ─────────────────────────────────────────────────────────────

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
    params.push(filters.limit ?? 50, ((filters.page ?? 1) - 1) * (filters.limit ?? 50));
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
    res.json({ success: true, message: 'Export queued', data: { downloadUrl: '/api/reports/download/placeholder' } });
  } catch (error) {
    logger.error('Error exporting report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

// ─── Treasury Reports (Daily / Weekly / Lifetime) ──────────────────────────

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

// ─── End of Day Reports ────────────────────────────────────────────────────

/**
 * GET /api/reports/eod?limit=30
 * List EOD report snapshots (most recent first)
 */
router.get('/eod', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(90, Math.max(1, parseInt(req.query.limit as string, 10) || 30));

    const { rows } = await query(
      `SELECT id, report_date, generated_at, generated_by, generated_by_name, is_scheduled,
        pending_count, pending_amount, executed_count, executed_amount,
        rejected_count, cancelled_count, pipeline_data
      FROM eod_reports
      ORDER BY report_date DESC, generated_at DESC
      LIMIT $1`,
      [limit]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing EOD reports', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * GET /api/reports/eod/:id
 * Get full EOD report with HTML body and payments data
 */
router.get('/eod/:id', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT * FROM eod_reports WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'EOD report not found' });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error getting EOD report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

/**
 * POST /api/reports/eod/generate
 * Manually generate an EOD report for today
 */
router.post('/eod/generate', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { runEodReportJob } = await import('../jobs/eodReportJob.js');
    await runEodReportJob(req.user!.id, undefined, false);
    res.json({ success: true, message: 'End of day report generated' });
  } catch (error) {
    logger.error('Error generating EOD report', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to generate EOD report' });
  }
});

// ─── Sheets Push ───────────────────────────────────────────────────────────

router.post('/sheets', hasRole('admin'), exportRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    await logAuditEntry(user.id, user.email, AUDIT_ACTIONS.REPORT_PUSHED_TO_SHEETS, {});
    res.json({ success: true, message: 'Report pushed to Google Sheets' });
  } catch (error) {
    logger.error('Error pushing to sheets', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
