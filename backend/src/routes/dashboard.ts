import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { hasRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/summary', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows: mtd } = await query(`
      SELECT COUNT(*) as count, COALESCE(SUM(usd_equivalent), 0) as amount
      FROM payments WHERE status = 'executed'
      AND executed_at >= date('now', 'start of month')
    `);
    const { rows: pending } = await query(`SELECT COUNT(*) as count FROM payments WHERE status = 'pending_approval'`);
    const { rows: ready } = await query(`SELECT COUNT(*) as count FROM payments WHERE status = 'ready_to_execute'`);
    const { rows: escalations } = await query(`
      SELECT COUNT(*) as count FROM payment_approvals
      WHERE action = 'pending' AND notified_at < datetime('now', '-24 hours')
    `);
    res.json({
      success: true,
      data: {
        mtdPaymentsCount: parseInt(mtd[0].count, 10),
        mtdPaymentsAmount: parseFloat(mtd[0].amount),
        pendingApprovalsCount: parseInt(pending[0].count, 10),
        readyToExecuteCount: parseInt(ready[0].count, 10),
        escalationsCount: parseInt(escalations[0].count, 10),
        onTimeRate: 95.5, // TODO: Calculate actual on-time rate
      },
    });
  } catch (error) {
    logger.error('Error getting dashboard summary', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/volume', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT DATE(executed_at) as date, COUNT(*) as count, SUM(usd_equivalent) as amount
      FROM payments WHERE status = 'executed'
      AND executed_at >= date('now', '-30 days')
      GROUP BY DATE(executed_at) ORDER BY date
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting volume data', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/pipeline', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT status, COUNT(*) as count
      FROM payments WHERE status NOT IN ('executed', 'cancelled', 'rejected', 'bank_rejected')
      GROUP BY status
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting pipeline data', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/vendors', hasRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT payee_name, SUM(usd_equivalent) as total_amount, COUNT(*) as payment_count
      FROM payments WHERE status = 'executed'
      AND executed_at >= date('now', 'start of month')
      GROUP BY payee_name ORDER BY total_amount DESC LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting top vendors', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
