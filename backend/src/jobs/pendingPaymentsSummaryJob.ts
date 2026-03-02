import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../services/emailService.js';

const RECIPIENTS = [
  'john.murphy@gusto.com',
  'ming.huey@gusto.com',
  'treasury@gusto.com',
];

interface PendingPayment {
  reference_number: string;
  payee_name: string;
  amount: number;
  currency: string;
  payment_type: string;
  funding_type: string;
  submitted_at: string;
  requester_name: string;
  days_pending: number;
  waiting_on_name: string | null;
  waiting_on_role: string | null;
}

interface CompletedPayment {
  reference_number: string;
  payee_name: string;
  amount: number;
  currency: string;
  payment_type: string;
  submitted_at: string;
  executed_at: string;
  confirmer_name: string | null;
  treasury_approved_at: string | null;
}

export async function runPendingPaymentsSummaryJob(): Promise<void> {
  try {
    logger.info('Pending payments summary job started');

    // Section 1: Pending Payments (Life to Date)
    const { rows: pendingRows } = await query<PendingPayment>(`
      SELECT
        p.reference_number,
        p.payee_name,
        p.amount,
        p.currency,
        p.payment_type,
        p.funding_type,
        p.submitted_at,
        u.name AS requester_name,
        CAST(julianday('now') - julianday(p.submitted_at) AS INTEGER) AS days_pending,
        wu.name AS waiting_on_name,
        pa_wait.approver_role AS waiting_on_role
      FROM payments p
      JOIN users u ON p.requester_id = u.id
      LEFT JOIN payment_approvals pa_wait ON pa_wait.payment_id = p.id
        AND pa_wait.action = 'pending'
        AND pa_wait.step_number = p.current_approval_step
      LEFT JOIN users wu ON pa_wait.approver_id = wu.id
      WHERE p.status = 'pending_approval'
      ORDER BY p.submitted_at ASC
    `);

    // Section 2: Completed Payments (Today)
    const { rows: completedRows } = await query<CompletedPayment>(`
      SELECT
        p.reference_number,
        p.payee_name,
        p.amount,
        p.currency,
        p.payment_type,
        p.submitted_at,
        p.executed_at,
        cu.name AS confirmer_name,
        pa_treasury.actioned_at AS treasury_approved_at
      FROM payments p
      LEFT JOIN execution_confirmations ec ON ec.payment_id = p.id
      LEFT JOIN users cu ON ec.confirmer_id = cu.id
      LEFT JOIN payment_approvals pa_treasury ON pa_treasury.payment_id = p.id
        AND pa_treasury.approver_role = 'admin'
        AND pa_treasury.action = 'approved'
      WHERE p.status = 'executed'
        AND date(p.executed_at) = date('now')
      GROUP BY p.id
      ORDER BY p.executed_at ASC
    `);

    logger.info(`Summary job found ${pendingRows.length} pending and ${completedRows.length} completed today`);

    const today = new Date().toISOString().slice(0, 10);
    const subject = `[Treasury Portal] Daily Payments Summary – ${today}`;
    const html = buildHtml(pendingRows, completedRows, today);

    const sent = await sendEmail(RECIPIENTS, subject, html);

    if (sent) {
      logger.info('Daily payments summary email sent successfully');
    } else {
      logger.warn('Daily payments summary email was not sent (SMTP may be unconfigured)');
    }

    // Store in DB so the admin UI can display it (one record per day)
    const pendingTotal = pendingRows.reduce((sum, p) => sum + p.amount, 0);
    const completedTotal = completedRows.reduce((sum, p) => sum + p.amount, 0);
    const templateData = JSON.stringify({
      pendingCount: pendingRows.length,
      pendingTotal,
      completedCount: completedRows.length,
      completedTotal,
      recipients: RECIPIENTS,
    });
    const status = sent ? 'sent' : 'draft';
    const sentAt = sent ? new Date().toISOString() : null;

    const { rows: existing } = await query(
      `SELECT id FROM notifications
       WHERE type = 'pending_payments_summary' AND date(created_at) = $1`,
      [today]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE notifications
         SET subject = $1, body = $2, template_data = $3, status = $4, sent_at = $5, created_at = datetime('now')
         WHERE id = $6`,
        [subject, html, templateData, status, sentAt, existing[0].id]
      );
      logger.info('Daily payments summary notification updated in database');
    } else {
      await query(
        `INSERT INTO notifications (type, channel, recipient_email, subject, body, template_data, status, sent_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, datetime('now'))`,
        [
          'pending_payments_summary',
          'email',
          RECIPIENTS.join(', '),
          subject,
          html,
          templateData,
          status,
          sentAt,
        ]
      );
      logger.info('Daily payments summary notification stored in database');
    }
  } catch (error) {
    logger.error('Pending payments summary job error', { error: (error as Error).message });
    throw error;
  }
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    staff: 'Staff',
    manager: 'Manager',
    sr_manager: 'Senior Manager',
    admin: 'Administrator',
  };
  return labels[role] || role;
}

function buildHtml(pending: PendingPayment[], completed: CompletedPayment[], date: string): string {
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);
  const completedTotal = completed.reduce((sum, p) => sum + p.amount, 0);

  const cellStyle = 'padding:8px;border:1px solid #ddd;';

  const pendingTableRows = pending.map((p) => `
    <tr>
      <td style="${cellStyle}">${p.reference_number}</td>
      <td style="${cellStyle}">${p.payee_name}</td>
      <td style="${cellStyle}text-align:right;">${formatCurrency(p.amount, p.currency)}</td>
      <td style="${cellStyle}">${p.payment_type.toUpperCase()}</td>
      <td style="${cellStyle}">${p.funding_type}</td>
      <td style="${cellStyle}">${p.submitted_at ?? '—'}</td>
      <td style="${cellStyle}text-align:center;">${p.days_pending}</td>
      <td style="${cellStyle}">${p.waiting_on_name || (p.waiting_on_role ? getRoleLabel(p.waiting_on_role) : '—')}</td>
      <td style="${cellStyle}">${p.requester_name}</td>
    </tr>
  `).join('');

  const completedTableRows = completed.map((p) => `
    <tr>
      <td style="${cellStyle}">${p.reference_number}</td>
      <td style="${cellStyle}">${p.payee_name}</td>
      <td style="${cellStyle}text-align:right;">${formatCurrency(p.amount, p.currency)}</td>
      <td style="${cellStyle}">${p.payment_type.toUpperCase()}</td>
      <td style="${cellStyle}">${p.submitted_at ?? '—'}</td>
      <td style="${cellStyle}">${p.treasury_approved_at ?? '—'}</td>
      <td style="${cellStyle}">${p.executed_at ?? '—'}</td>
      <td style="${cellStyle}">${p.confirmer_name ?? '—'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — ${date}</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (Life to Date)</h3>
      ${pending.length === 0
        ? '<p style="color:#666;">No payments are currently pending approval.</p>'
        : `
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="${cellStyle}text-align:left;">Reference</th>
                <th style="${cellStyle}text-align:left;">Payee</th>
                <th style="${cellStyle}text-align:right;">Amount</th>
                <th style="${cellStyle}text-align:left;">Type</th>
                <th style="${cellStyle}text-align:left;">Funding</th>
                <th style="${cellStyle}text-align:left;">Submitted</th>
                <th style="${cellStyle}text-align:center;">Days Pending</th>
                <th style="${cellStyle}text-align:left;">Waiting On</th>
                <th style="${cellStyle}text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              ${pendingTableRows}
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> ${pending.length} payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> ${formatCurrency(pendingTotal, 'USD')}
          </p>
        `
      }

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      ${completed.length === 0
        ? '<p style="color:#666;">No payments were completed today.</p>'
        : `
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#d1fae5;">
                <th style="${cellStyle}text-align:left;">Reference</th>
                <th style="${cellStyle}text-align:left;">Payee</th>
                <th style="${cellStyle}text-align:right;">Amount</th>
                <th style="${cellStyle}text-align:left;">Type</th>
                <th style="${cellStyle}text-align:left;">Submitted</th>
                <th style="${cellStyle}text-align:left;">Treasury Approved</th>
                <th style="${cellStyle}text-align:left;">Confirmed Sent</th>
                <th style="${cellStyle}text-align:left;">Confirmed By</th>
              </tr>
            </thead>
            <tbody>
              ${completedTableRows}
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total completed today:</strong> ${completed.length} payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> ${formatCurrency(completedTotal, 'USD')}
          </p>
        `
      }

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  `;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
