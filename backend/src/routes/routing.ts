import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { adminOnly } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT r.*, a.name as account_name
       FROM routing_rules r
       LEFT JOIN accounts a ON r.account_id = a.id
       WHERE r.is_active = true
       ORDER BY r.priority`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing routing rules', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM routing_rules WHERE id = $1', [id]);
    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND });
      return;
    }
    const { rows: chain } = await query(
      'SELECT * FROM approval_chains WHERE rule_id = $1 ORDER BY step',
      [id]
    );
    res.json({ success: true, data: { ...rows[0], approvalChain: chain } });
  } catch (error) {
    logger.error('Error getting routing rule', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, num_approvers } = req.body;

    // Get next priority
    const { rows: maxPriority } = await query('SELECT MAX(priority) as max_priority FROM routing_rules');
    const nextPriority = (maxPriority[0]?.max_priority || 0) + 1;

    const { rows } = await query(
      `INSERT INTO routing_rules (priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, num_approvers, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING *`,
      [nextPriority, name, description, trigger_type, account_id || null, payment_type || null, min_amount || null, max_amount || null, department || null, num_approvers || 1]
    );

    await query(
      `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, after_value, affected_component)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Routing Rules', 'Rule Added', `Routing rule created: ${name}`, admin.id, admin.name || admin.email, JSON.stringify(rows[0]), 'Routing Rules']
    );
    logger.info('Routing rule created', { ruleId: rows[0].id, adminId: admin.id });
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error creating routing rule', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.put('/:id', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, num_approvers, is_active } = req.body;

    const { rows: existing } = await query('SELECT * FROM routing_rules WHERE id = $1', [id]);
    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND });
      return;
    }

    const admin = req.user!;
    const { rows } = await query(
      `UPDATE routing_rules
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           trigger_type = COALESCE($4, trigger_type),
           account_id = $5,
           payment_type = $6,
           min_amount = $7,
           max_amount = $8,
           department = $9,
           num_approvers = COALESCE($10, num_approvers),
           is_active = COALESCE($11, is_active),
           updated_at = datetime('now')
       WHERE id = $1
       RETURNING *`,
      [id, name, description, trigger_type, account_id || null, payment_type || null, min_amount || null, max_amount || null, department || null, num_approvers, is_active]
    );

    await query(
      `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, before_value, after_value, affected_component)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['Routing Rules', 'Rule Edited', `Routing rule updated: ${rows[0]?.name || id}`, admin.id, admin.name || admin.email,
       JSON.stringify(existing[0]), JSON.stringify(rows[0]), 'Routing Rules']
    );

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error updating routing rule', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.delete('/:id', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const admin = req.user!;
    // Soft delete by setting is_active to false
    const { rows } = await query(
      `UPDATE routing_rules SET is_active = false, updated_at = datetime('now') WHERE id = $1 RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, error: ERROR_CODES.NOT_FOUND });
      return;
    }

    await query(
      `INSERT INTO system_change_log (change_category, change_type, description, changed_by_id, changed_by_name, before_value, affected_component)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Routing Rules', 'Rule Deleted', `Routing rule deactivated: ${rows[0]?.name || id}`, admin.id, admin.name || admin.email, JSON.stringify(rows[0]), 'Routing Rules']
    );

    res.json({ success: true, message: 'Routing rule deleted' });
  } catch (error) {
    logger.error('Error deleting routing rule', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.put('/reorder', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ruleIds } = req.body;

    if (!Array.isArray(ruleIds)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: ERROR_CODES.VALIDATION_ERROR });
      return;
    }

    for (let i = 0; i < ruleIds.length; i++) {
      await query('UPDATE routing_rules SET priority = $2 WHERE id = $1', [ruleIds[i], i + 1]);
    }

    res.json({ success: true, message: 'Rules reordered' });
  } catch (error) {
    logger.error('Error reordering routing rules', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
