import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

interface PaymentSnapshot {
  reference_number: string;
  payee_name: string;
  amount: number;
  currency: string;
  usd_equivalent: number;
  payment_type: string;
  status: string;
  requester_name: string;
  submitted_at: string | null;
  executed_at: string | null;
}

export async function runEodReportJob(manualUserId?: string): Promise<void> {
  try {
    logger.info('End-of-day report job started');

    const today = new Date().toISOString().slice(0, 10);

    // Check if report already exists for today
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM eod_reports WHERE report_date = $1`,
      [today]
    );

    // Pending payments
    const { rows: pendingRows } = await query<PaymentSnapshot>(`
      SELECT
        p.reference_number, p.payee_name, p.amount, p.currency, p.usd_equivalent,
        p.payment_type, p.status, u.name AS requester_name,
        p.submitted_at, p.executed_at
      FROM payments p
      LEFT JOIN users u ON p.requester_id = u.id
      WHERE p.status IN ('pending_approval', 'approved', 'ready_to_execute', 'pending_confirmation')
      ORDER BY p.submitted_at ASC
    `);

    // Executed today
    const { rows: executedRows } = await query<PaymentSnapshot>(`
      SELECT
        p.reference_number, p.payee_name, p.amount, p.currency, p.usd_equivalent,
        p.payment_type, p.status, u.name AS requester_name,
        p.submitted_at, p.executed_at
      FROM payments p
      LEFT JOIN users u ON p.requester_id = u.id
      WHERE p.status = 'executed' AND date(p.executed_at) = $1
      ORDER BY p.executed_at ASC
    `, [today]);

    // Rejected / returned today
    const { rows: rejectedRows } = await query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt FROM payments
      WHERE status IN ('rejected', 'bank_rejected') AND date(updated_at) = $1
    `, [today]);

    // Cancelled today
    const { rows: cancelledRows } = await query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt FROM payments
      WHERE status = 'cancelled' AND date(updated_at) = $1
    `, [today]);

    // Pipeline breakdown
    const { rows: pipelineRows } = await query<{ status: string; count: number; total: number }>(`
      SELECT status, COUNT(*) AS count, COALESCE(SUM(usd_equivalent), 0) AS total
      FROM payments
      WHERE status NOT IN ('cancelled', 'rejected', 'bank_rejected')
      GROUP BY status
    `);

    const pendingCount = pendingRows.length;
    const pendingAmount = pendingRows.reduce((sum, p) => sum + (p.usd_equivalent || p.amount), 0);
    const executedCount = executedRows.length;
    const executedAmount = executedRows.reduce((sum, p) => sum + (p.usd_equivalent || p.amount), 0);
    const rejectedCount = rejectedRows[0]?.cnt || 0;
    const cancelledCount = cancelledRows[0]?.cnt || 0;

    const allPayments = [...pendingRows, ...executedRows];
    const pipelineData = JSON.stringify(pipelineRows);
    const paymentsData = JSON.stringify(allPayments);
    const htmlBody = buildEodHtml(pendingRows, executedRows, pipelineRows, today, {
      pendingCount, pendingAmount, executedCount, executedAmount, rejectedCount, cancelledCount,
    });

    const generatedAt = new Date().toISOString();

    if (existing.length > 0) {
      await query(
        `UPDATE eod_reports SET
          generated_at = $1, generated_by = $2,
          pending_count = $3, pending_amount = $4,
          executed_count = $5, executed_amount = $6,
          rejected_count = $7, cancelled_count = $8,
          pipeline_data = $9, payments_data = $10,
          html_body = $11, created_at = datetime('now')
        WHERE id = $12`,
        [generatedAt, manualUserId || null,
         pendingCount, pendingAmount, executedCount, executedAmount,
         rejectedCount, cancelledCount, pipelineData, paymentsData,
         htmlBody, existing[0].id]
      );
      logger.info('EOD report updated for today');
    } else {
      await query(
        `INSERT INTO eod_reports (report_date, generated_at, generated_by,
          pending_count, pending_amount, executed_count, executed_amount,
          rejected_count, cancelled_count, pipeline_data, payments_data, html_body)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [today, generatedAt, manualUserId || null,
         pendingCount, pendingAmount, executedCount, executedAmount,
         rejectedCount, cancelledCount, pipelineData, paymentsData, htmlBody]
      );
      logger.info('EOD report created for today');
    }

    logger.info(`EOD report completed: ${pendingCount} pending, ${executedCount} executed today`);
  } catch (error) {
    logger.error('EOD report job error', { error: (error as Error).message });
    throw error;
  }
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount);
}

function buildEodHtml(
  pending: PaymentSnapshot[],
  executed: PaymentSnapshot[],
  pipeline: Array<{ status: string; count: number; total: number }>,
  date: string,
  stats: { pendingCount: number; pendingAmount: number; executedCount: number; executedAmount: number; rejectedCount: number; cancelledCount: number }
): string {
  const cell = 'padding:8px;border:1px solid #ddd;';

  const statusLabels: Record<string, string> = {
    draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
    ready_to_execute: 'Ready to Execute', pending_confirmation: 'Awaiting Confirmation',
    executed: 'Completed', rejected: 'Rejected', bank_rejected: 'Bank Rejected', cancelled: 'Cancelled',
  };

  const pipelineRows = pipeline.map(p => `
    <tr>
      <td style="${cell}">${statusLabels[p.status] || p.status}</td>
      <td style="${cell}text-align:center;">${p.count}</td>
      <td style="${cell}text-align:right;">${formatCurrency(p.total)}</td>
    </tr>
  `).join('');

  const paymentRows = (payments: PaymentSnapshot[], bgColor: string) =>
    payments.map(p => `
      <tr>
        <td style="${cell}">${p.reference_number}</td>
        <td style="${cell}">${p.payee_name}</td>
        <td style="${cell}text-align:right;">${formatCurrency(p.amount, p.currency)}</td>
        <td style="${cell}">${p.payment_type.toUpperCase()}</td>
        <td style="${cell}"><span style="color:${bgColor};font-weight:600;">${statusLabels[p.status] || p.status}</span></td>
        <td style="${cell}">${p.requester_name || '—'}</td>
        <td style="${cell}">${p.submitted_at || '—'}</td>
      </tr>
    `).join('');

  const tableHeader = `
    <tr style="background:#f3f4f6;">
      <th style="${cell}text-align:left;">Reference</th>
      <th style="${cell}text-align:left;">Payee</th>
      <th style="${cell}text-align:right;">Amount</th>
      <th style="${cell}text-align:left;">Type</th>
      <th style="${cell}text-align:left;">Status</th>
      <th style="${cell}text-align:left;">Requester</th>
      <th style="${cell}text-align:left;">Submitted</th>
    </tr>
  `;

  return `
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — ${date}</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        ${stats.pendingCount} pending (${formatCurrency(stats.pendingAmount)}) |
        ${stats.executedCount} executed today (${formatCurrency(stats.executedAmount)}) |
        ${stats.rejectedCount} rejected | ${stats.cancelledCount} cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="${cell}text-align:left;">Status</th>
            <th style="${cell}text-align:center;">Count</th>
            <th style="${cell}text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>${pipelineRows}</tbody>
      </table>

      ${pending.length > 0 ? `
        <h3 style="color:#b45309;">Pending Payments (${pending.length})</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>${tableHeader}</thead>
          <tbody>${paymentRows(pending, '#d97706')}</tbody>
        </table>
      ` : '<p style="color:#666;">No pending payments.</p>'}

      ${executed.length > 0 ? `
        <h3 style="color:#047857;">Executed Today (${executed.length})</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>${tableHeader}</thead>
          <tbody>${paymentRows(executed, '#16a34a')}</tbody>
        </table>
      ` : '<p style="color:#666;">No payments executed today.</p>'}

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  `;
}
