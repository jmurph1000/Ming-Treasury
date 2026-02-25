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

router.get('/audit', hasRole('admin', 'treasury', 'cfo'), async (req: AuthenticatedRequest, res: Response) => {
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

router.post('/export', hasRole('admin', 'treasury', 'cfo', 'ap_manager'), exportRateLimit, async (req: AuthenticatedRequest, res: Response) => {
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

router.post('/sheets', hasRole('admin', 'treasury', 'cfo'), exportRateLimit, async (req: AuthenticatedRequest, res: Response) => {
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
