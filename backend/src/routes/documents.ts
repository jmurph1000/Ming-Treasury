import { Router, Response } from 'express';
import { query } from '../config/sqlite.js';
import { AuthenticatedRequest } from '../types/index.js';
import { adminOnly } from '../middleware/rbac.js';
import { logAuditEntry, AUDIT_ACTIONS } from '../middleware/audit.js';
import { logger } from '../utils/logger.js';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants.js';

const router = Router();

/**
 * GET /api/documents/:slug
 * Get a document by slug (accessible to all authenticated users)
 */
router.get('/:slug', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;

    const { rows } = await query(
      `SELECT d.*, u.name as updated_by_name
       FROM documents d
       LEFT JOIN users u ON d.updated_by = u.id
       WHERE d.slug = $1`,
      [slug]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error getting document', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get document',
    });
  }
});

/**
 * PUT /api/documents/:slug
 * Update a document (admin only)
 */
router.put('/:slug', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { title, content } = req.body;
    const admin = req.user!;

    if (!content) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Content is required',
      });
      return;
    }

    // Get existing document
    const { rows: existing } = await query(
      'SELECT * FROM documents WHERE slug = $1',
      [slug]
    );

    if (existing.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Document not found',
      });
      return;
    }

    const oldDocument = existing[0];
    const newVersion = (oldDocument.version || 1) + 1;

    // Save the old version to document_versions
    await query(
      `INSERT INTO document_versions (document_id, version, title, content, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [oldDocument.id, oldDocument.version, oldDocument.title, oldDocument.content, oldDocument.updated_by, oldDocument.updated_at]
    );

    // Update the document
    const { rows } = await query(
      `UPDATE documents
       SET title = COALESCE($2, title),
           content = $3,
           version = $4,
           updated_by = $5,
           updated_at = datetime('now')
       WHERE slug = $1
       RETURNING *`,
      [slug, title, content, newVersion, admin.id]
    );

    // Log audit entry
    await logAuditEntry(admin.id, admin.email, AUDIT_ACTIONS.DOCUMENT_UPDATED, {
      tableName: 'documents',
      recordId: oldDocument.id,
      oldValues: { version: oldDocument.version, title: oldDocument.title },
      newValues: { version: newVersion, title: title || oldDocument.title },
    });

    logger.info('Document updated', { slug, version: newVersion, adminId: admin.id });

    res.json({
      success: true,
      message: `Document updated to version ${newVersion}`,
      data: rows[0],
    });
  } catch (error) {
    logger.error('Error updating document', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to update document',
    });
  }
});

/**
 * GET /api/documents/:slug/versions
 * Get version history for a document (admin only)
 */
router.get('/:slug/versions', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;

    // Get document ID
    const { rows: doc } = await query('SELECT id FROM documents WHERE slug = $1', [slug]);
    if (doc.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Document not found',
      });
      return;
    }

    const { rows } = await query(
      `SELECT dv.*, u.name as updated_by_name
       FROM document_versions dv
       LEFT JOIN users u ON dv.updated_by = u.id
       WHERE dv.document_id = $1
       ORDER BY dv.version DESC`,
      [doc[0].id]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    logger.error('Error getting document versions', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to get document versions',
    });
  }
});

/**
 * POST /api/documents/:slug/send
 * Send a document to an email address (admin only)
 */
router.post('/:slug/send', adminOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const { email } = req.body;
    const admin = req.user!;

    if (!email || !email.includes('@')) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: ERROR_CODES.VALIDATION_ERROR,
        message: 'Valid email address is required',
      });
      return;
    }

    // Get document
    const { rows } = await query(
      `SELECT d.*, u.name as updated_by_name
       FROM documents d
       LEFT JOIN users u ON d.updated_by = u.id
       WHERE d.slug = $1`,
      [slug]
    );

    if (rows.length === 0) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: ERROR_CODES.NOT_FOUND,
        message: 'Document not found',
      });
      return;
    }

    const document = rows[0];

    // In production, this would send via Gmail MCP or email service
    // For now, log the action
    logger.info('Document sent via email', {
      slug,
      recipientEmail: email,
      documentVersion: document.version,
      sentBy: admin.email,
    });

    // Log audit entry
    await logAuditEntry(admin.id, admin.email, 'DOCUMENT_SENT', {
      tableName: 'documents',
      recordId: document.id,
      newValues: { recipientEmail: email, version: document.version },
    });

    res.json({
      success: true,
      message: `Document sent to ${email}`,
      data: {
        recipientEmail: email,
        documentTitle: document.title,
        version: document.version,
      },
    });
  } catch (error) {
    logger.error('Error sending document', { error: (error as Error).message });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: 'Failed to send document',
    });
  }
});

export default router;
