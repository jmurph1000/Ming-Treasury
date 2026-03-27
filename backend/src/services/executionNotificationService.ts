import { query } from '../config/sqlite.js';
import { sendEmail } from './emailService.js';
import { logger } from '../utils/logger.js';

interface PaymentDetails {
  id: string;
  reference_number: string;
  payee_name: string;
  amount: number;
  currency: string;
  usd_equivalent: number;
  payment_type: string;
  requester_id: string;
  account_id: string;
  bank_reference?: string;
  executed_at?: string;
  executed_by_name?: string;
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount);
}

function formatPaymentType(type: string): string {
  const labels: Record<string, string> = {
    ach: 'ACH', wire: 'Wire Transfer', check: 'Check', internal: 'Internal Transfer',
  };
  return labels[type] || type;
}

function buildExecutionEmailHtml(payment: PaymentDetails, accountName: string): string {
  const executedAtET = payment.executed_at
    ? new Date(payment.executed_at.endsWith('Z') ? payment.executed_at : payment.executed_at + 'Z')
        .toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'
    : 'N/A';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#047857;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Payment Executed</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Reference</td><td style="padding:8px 0;font-weight:600;">${payment.reference_number}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Payee</td><td style="padding:8px 0;">${payment.payee_name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td style="padding:8px 0;font-weight:600;">${formatCurrency(payment.amount, payment.currency)}${payment.currency !== 'USD' ? ` (${formatCurrency(payment.usd_equivalent, 'USD')})` : ''}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Payment Type</td><td style="padding:8px 0;">${formatPaymentType(payment.payment_type)}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Source Account</td><td style="padding:8px 0;">${accountName}</td></tr>
          ${payment.bank_reference ? `<tr><td style="padding:8px 0;color:#6b7280;">Bank Reference</td><td style="padding:8px 0;font-family:monospace;">${payment.bank_reference}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;">Executed</td><td style="padding:8px 0;">${executedAtET}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Executed By</td><td style="padding:8px 0;">${payment.executed_by_name || 'Treasury'}</td></tr>
        </table>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin-top:16px;text-align:center;">
        Gusto Treasury Payment Portal
      </p>
    </div>
  `;
}

/**
 * Send execution notifications (email + in-portal) to the initiator and all approvers.
 * Called after a payment is marked as executed.
 */
export async function notifyPaymentExecuted(payment: PaymentDetails): Promise<void> {
  try {
    // Get account name
    const { rows: accountRows } = await query<{ name: string; bank_name: string }>(
      `SELECT name, bank_name FROM accounts WHERE id = $1`, [payment.account_id]
    );
    const accountName = accountRows[0] ? `${accountRows[0].name} — ${accountRows[0].bank_name}` : 'Unknown';

    // Get initiator
    const { rows: initiatorRows } = await query<{ id: string; email: string; name: string }>(
      `SELECT id, email, name FROM users WHERE id = $1`, [payment.requester_id]
    );

    // Get approvers (distinct users who approved this payment)
    const { rows: approverRows } = await query<{ id: string; email: string; name: string }>(
      `SELECT DISTINCT u.id, u.email, u.name
       FROM payment_approvals pa
       JOIN users u ON pa.approver_id = u.id
       WHERE pa.payment_id = $1 AND pa.action = 'approved'`,
      [payment.id]
    );

    // Combine unique recipients (initiator + approvers)
    const recipientMap = new Map<string, { id: string; email: string; name: string }>();
    for (const user of [...initiatorRows, ...approverRows]) {
      if (user.id && user.email) {
        recipientMap.set(user.id, user);
      }
    }
    const recipients = Array.from(recipientMap.values());

    if (recipients.length === 0) {
      logger.warn('No recipients found for execution notification', { paymentId: payment.id });
      return;
    }

    const emailSubject = `Payment Executed — ${payment.payee_name} ${formatCurrency(payment.amount, payment.currency)} (${payment.reference_number})`;
    const emailHtml = buildExecutionEmailHtml(payment, accountName);

    const executedAtET = payment.executed_at
      ? new Date(payment.executed_at.endsWith('Z') ? payment.executed_at : payment.executed_at + 'Z')
          .toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'
      : 'now';

    for (const recipient of recipients) {
      // 1. In-portal notification
      await query(
        `INSERT INTO portal_notifications (user_id, type, title, message, payment_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          recipient.id,
          'payment_executed',
          `Payment Executed — ${payment.reference_number}`,
          `${payment.payee_name} for ${formatCurrency(payment.amount, payment.currency)} was executed by ${payment.executed_by_name || 'Treasury'} at ${executedAtET}`,
          payment.id,
        ]
      );

      // 2. Email notification
      const emailSent = await sendEmail(recipient.email, emailSubject, emailHtml);

      // 3. Log to notification_log
      await query(
        `INSERT INTO notification_log (
          notification_type, recipient_user_id, recipient_name, recipient_email,
          channel, subject, message_body, payment_id, delivery_status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          'payment_executed',
          recipient.id,
          recipient.name,
          recipient.email,
          'email',
          emailSubject,
          emailHtml,
          payment.id,
          emailSent ? 'sent' : 'failed',
          emailSent ? null : 'SMTP not configured or send failed',
        ]
      );
    }

    logger.info(`Execution notifications sent for ${payment.reference_number}`, {
      paymentId: payment.id,
      recipientCount: recipients.length,
      recipients: recipients.map(r => r.email),
    });
  } catch (error) {
    logger.error('Failed to send execution notifications', {
      paymentId: payment.id,
      error: (error as Error).message,
    });
  }
}
