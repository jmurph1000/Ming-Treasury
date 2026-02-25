import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { rows } = await query(
      `SELECT * FROM payment_templates
       WHERE user_id = $1 OR is_shared = true
       ORDER BY usage_count DESC, name`,
      [user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing templates', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, payeeId, payeeName, paymentType, accountId, defaultAmount, currency, defaultJustification, isShared } = req.body;
    const { rows } = await query(
      `INSERT INTO payment_templates (user_id, name, payee_id, payee_name, payment_type, account_id, default_amount, currency, default_justification, is_shared)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [user.id, name, payeeId, payeeName, paymentType, accountId, defaultAmount, currency || 'USD', defaultJustification, isShared || false]
    );
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error creating template', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    await query('DELETE FROM payment_templates WHERE id = $1 AND user_id = $2', [id, user.id]);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    logger.error('Error deleting template', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
