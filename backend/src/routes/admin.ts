import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { adminOnly } from '../middleware/rbac.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();
router.use(adminOnly);

router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT key, value, description, category FROM system_settings ORDER BY category, key');
    const settings: Record<string, unknown> = {};
    rows.forEach((row: { key: string; value: unknown }) => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error getting settings', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await query(
        `INSERT INTO system_settings (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, datetime('now'))
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = datetime('now')`,
        [key, JSON.stringify(value), admin.id]
      );
    }
    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.SETTINGS_UPDATED, { newValues: updates });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    logger.error('Error updating settings', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/ip-allowlist', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT id, cidr, description, is_active, created_at FROM ip_allowlist ORDER BY created_at');
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting IP allowlist', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.post('/ip-allowlist', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { cidr, description } = req.body;
    const { rows } = await query(
      'INSERT INTO ip_allowlist (cidr, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [cidr, description, admin.id]
    );
    res.status(HTTP_STATUS.CREATED).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error adding to IP allowlist', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.delete('/ip-allowlist/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await query('UPDATE ip_allowlist SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'IP removed from allowlist' });
  } catch (error) {
    logger.error('Error removing from IP allowlist', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

router.get('/access-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT ar.*, u.name as admin_name
       FROM access_requests ar
       LEFT JOIN users u ON ar.admin_id = u.id
       ORDER BY ar.created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error getting access requests', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR });
  }
});

export default router;
