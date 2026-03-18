import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * POST /api/confirmations
 * Create a new bank confirmation record
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { paymentId, accountId, bankName, confirmationType, confirmationReference, amount, currency, notes } = req.body;

    if (!bankName || !confirmationType) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'bankName and confirmationType are required',
      });
      return;
    }

    const { rows } = query<{ id: string }>(
      `INSERT INTO bank_confirmations (
        payment_id, account_id, bank_name, confirmation_type,
        confirmation_reference, confirmed_by_user_id, confirmed_by_name,
        confirmation_notes, amount, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        paymentId || null,
        accountId || null,
        bankName,
        confirmationType,
        confirmationReference || null,
        user.id,
        user.name,
        notes || null,
        amount || null,
        currency || 'USD',
      ]
    );

    res.json({
      success: true,
      data: { id: rows[0]?.id },
      message: 'Bank confirmation logged',
    });
  } catch (error) {
    logger.error('Error creating bank confirmation', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to create confirmation',
    });
  }
});

/**
 * GET /api/confirmations/recent
 * Get all confirmations from the last 7 days (Treasury admin only)
 */
router.get('/recent', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = query(
      `SELECT bc.*, p.reference_number, p.payee_name
       FROM bank_confirmations bc
       LEFT JOIN payments p ON p.id = bc.payment_id
       WHERE bc.confirmed_at >= datetime('now', '-7 days')
       ORDER BY bc.confirmed_at DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting recent confirmations', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

/**
 * GET /api/confirmations/:paymentId
 * Get confirmations for a specific payment
 */
router.get('/:paymentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { rows } = query(
      `SELECT * FROM bank_confirmations WHERE payment_id = $1 ORDER BY confirmed_at DESC`,
      [paymentId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting payment confirmations', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

export default router;
