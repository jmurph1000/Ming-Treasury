import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

interface NotificationLogEntry {
  notificationType: string;
  recipientUserId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientSlackId?: string;
  channel: 'email' | 'slack' | 'both';
  subject?: string;
  messageBody?: string;
  paymentId?: string;
  deliveryStatus?: 'sent' | 'failed';
  errorMessage?: string;
}

export function logNotification(entry: NotificationLogEntry): void {
  try {
    query(
      `INSERT INTO notification_log (
        notification_type, recipient_user_id, recipient_name, recipient_email,
        recipient_slack_id, channel, subject, message_body, payment_id,
        delivery_status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        entry.notificationType,
        entry.recipientUserId || null,
        entry.recipientName || null,
        entry.recipientEmail || null,
        entry.recipientSlackId || null,
        entry.channel,
        entry.subject || null,
        entry.messageBody || null,
        entry.paymentId || null,
        entry.deliveryStatus || 'sent',
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    logger.error('Failed to log notification', { error: (error as Error).message, entry });
  }
}
