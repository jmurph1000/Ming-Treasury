import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { encryptAccountNumber, encryptRoutingNumber, decryptAccountNumber, decryptRoutingNumber } from '../services/encryptionService.js';
import { maskAccountNumber, maskRoutingNumber } from '../utils/masks.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, paymentType } = req.query;
    let sql = 'SELECT id, name, payment_type, bank_name, swift_code, country, currency, is_active FROM saved_payees WHERE is_active = true';
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND name LIKE $${params.length}`;
    }
    if (paymentType) {
      params.push(paymentType);
      sql += ` AND payment_type = $${params.length}`;
    }
    sql += ' ORDER BY name LIMIT 100';
    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing payees', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM saved_payees WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND });
      return;
    }
    const payee = rows[0];
    let accountNumber = '', routingNumber = '';
    try {
      if (payee.account_number_encrypted) accountNumber = decryptAccountNumber(payee.account_number_encrypted);
      if (payee.routing_number_encrypted) routingNumber = decryptRoutingNumber(payee.routing_number_encrypted);
    } catch {}
    res.json({
      success: true,
      data: {
        ...payee,
        accountNumberMasked: maskAccountNumber(accountNumber),
        routingNumberMasked: maskRoutingNumber(routingNumber),
        account_number_encrypted: undefined,
        routing_number_encrypted: undefined,
      },
    });
  } catch (error) {
    logger.error('Error getting payee', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { name, paymentType, bankName, routingNumber, accountNumber, swiftCode, iban, address, city, state, postalCode, country, currency } = req.body;
    const accountEnc = accountNumber ? encryptAccountNumber(accountNumber) : null;
    const routingEnc = routingNumber ? encryptRoutingNumber(routingNumber) : null;
    const { rows } = await query(
      `INSERT INTO saved_payees (name, payment_type, bank_name, routing_number_encrypted, account_number_encrypted, swift_code, iban, address, city, state, postal_code, country, currency, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, name, payment_type`,
      [name, paymentType, bankName, routingEnc, accountEnc, swiftCode, iban, address, city, state, postalCode, country || 'USA', currency || 'USD', user.id]
    );
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error creating payee', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
