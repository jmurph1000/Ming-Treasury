import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { hasRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/notifications/summaries — pending payments summary emails
router.get('/summaries', hasRole('admin', 'treasury', 'cfo'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT id, type, channel, recipient_email, subject, body, template_data, status, sent_at, created_at
       FROM notifications
       WHERE type = 'pending_payments_summary'
       ORDER BY created_at DESC
       LIMIT 90`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Failed to fetch notification summaries', { error: (error as Error).message });
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/summaries/run — manually trigger the daily summary job
router.post('/summaries/run', hasRole('admin', 'treasury'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { runPendingPaymentsSummaryJob } = await import('../jobs/pendingPaymentsSummaryJob.js');
    await runPendingPaymentsSummaryJob();
    res.json({ success: true, message: 'Daily summary job completed' });
  } catch (error) {
    logger.error('Failed to run summary job manually', { error: (error as Error).message });
    res.status(500).json({ success: false, message: 'Failed to run summary job' });
  }
});

export default router;
