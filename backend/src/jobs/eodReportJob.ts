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

export async function runEodReportJob(manualUserId?: string, reportDate?: string): Promise<void> {
  try {
    const targetDate = reportDate || new Date().toISOString().slice(0, 10);
    const isRetroactive = reportDate && reportDate !== new Date().toISOString().slice(0, 10);
    logger.info(`End-of-day report job started for ${targetDate}${isRetroactive ? ' (retroactive catch-up)' : ''}`);

    // Check if report already exists for this date
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM eod_reports WHERE report_date = $1`,
      [targetDate]
    );

    // For retroactive reports, show payments that were pending as of end of that date
    // (created on or before targetDate and still in a pending-like state, or were updated after)
    // Best-effort: query current pending for today, or pending-as-of-date for retroactive
    let pendingRows: PaymentSnapshot[];
    if (isRetroactive) {
      // Best effort: payments created on or before this date that are currently still pending,
      // OR were in a pending state and transitioned after this date
      const { rows } = await query<PaymentSnapshot>(`
        SELECT
          p.reference_number, p.payee_name, p.amount, p.currency, p.usd_equivalent,
          p.payment_type, p.status, u.name AS requester_name,
          p.submitted_at, p.executed_at
        FROM payments p
        LEFT JOIN users u ON p.requester_id = u.id
        WHERE date(p.created_at) <= $1
          AND (
            p.status IN ('pending_approval', 'approved', 'ready_to_execute', 'pending_confirmation')
            OR (p.status IN ('executed', 'rejected', 'bank_rejected', 'cancelled') AND date(p.updated_at) > $1)
          )
        ORDER BY p.submitted_at ASC
      `, [targetDate]);
      pendingRows = rows;
    } else {
      const { rows } = await query<PaymentSnapshot>(`
        SELECT
          p.reference_number, p.payee_name, p.amount, p.currency, p.usd_equivalent,
          p.payment_type, p.status, u.name AS requester_name,
          p.submitted_at, p.executed_at
        FROM payments p
        LEFT JOIN users u ON p.requester_id = u.id
        WHERE p.status IN ('pending_approval', 'approved', 'ready_to_execute', 'pending_confirmation')
        ORDER BY p.submitted_at ASC
      `);
      pendingRows = rows;
    }

    // Executed on target date
    const { rows: executedRows } = await query<PaymentSnapshot>(`
      SELECT
        p.reference_number, p.payee_name, p.amount, p.currency, p.usd_equivalent,
        p.payment_type, p.status, u.name AS requester_name,
        p.submitted_at, p.executed_at
      FROM payments p
      LEFT JOIN users u ON p.requester_id = u.id
      WHERE p.status = 'executed' AND date(p.executed_at) = $1
      ORDER BY p.executed_at ASC
    `, [targetDate]);

    // Rejected / returned on target date
    const { rows: rejectedRows } = await query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt FROM payments
      WHERE status IN ('rejected', 'bank_rejected') AND date(updated_at) = $1
    `, [targetDate]);

    // Cancelled on target date
    const { rows: cancelledRows } = await query<{ cnt: number }>(`
      SELECT COUNT(*) AS cnt FROM payments
      WHERE status = 'cancelled' AND date(updated_at) = $1
    `, [targetDate]);

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
    const htmlBody = buildEodHtml(pendingRows, executedRows, pipelineRows, targetDate, {
      pendingCount, pendingAmount, executedCount, executedAmount, rejectedCount, cancelledCount,
    }, !!isRetroactive);

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
      logger.info(`EOD report updated for ${targetDate}`);
    } else {
      await query(
        `INSERT INTO eod_reports (report_date, generated_at, generated_by,
          pending_count, pending_amount, executed_count, executed_amount,
          rejected_count, cancelled_count, pipeline_data, payments_data, html_body)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [targetDate, generatedAt, manualUserId || null,
         pendingCount, pendingAmount, executedCount, executedAmount,
         rejectedCount, cancelledCount, pipelineData, paymentsData, htmlBody]
      );
      logger.info(`EOD report created for ${targetDate}`);
    }

    logger.info(`EOD report completed for ${targetDate}: ${pendingCount} pending, ${executedCount} executed`);
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
  stats: { pendingCount: number; pendingAmount: number; executedCount: number; executedAmount: number; rejectedCount: number; cancelledCount: number },
  isRetroactive: boolean = false
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
      ${isRetroactive ? `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
        <strong>Retroactive report:</strong> This report was auto-generated on server startup to cover a missed scheduled run.
        Pending payment counts are best-effort reconstructions.
      </div>` : ''}

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

/**
 * Check for missed EOD reports and generate them retroactively.
 * Called on server startup to catch up after downtime.
 *
 * Looks at the earliest payment date and the most recent EOD report,
 * then fills in any missing dates up to yesterday.
 */
export async function runMissedEodReports(): Promise<void> {
  try {
    // Find the earliest date we should have reports for (first payment created)
    const { rows: earliestPayment } = await query<{ earliest: string }>(
      `SELECT MIN(date(created_at)) AS earliest FROM payments`
    );

    if (!earliestPayment[0]?.earliest) {
      logger.info('No payments in database, skipping missed report catch-up');
      return;
    }

    const startDate = earliestPayment[0].earliest;

    // End date = yesterday (today's report is handled by the scheduled job / startup)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const endDate = `${yyyy}-${mm}-${dd}`;

    if (startDate > endDate) {
      logger.info('No missed EOD reports to generate (earliest payment is today)');
      return;
    }

    // Collect all dates that already have reports in the range
    const { rows: existingDates } = await query<{ report_date: string }>(
      `SELECT report_date FROM eod_reports WHERE report_date >= $1 AND report_date <= $2`,
      [startDate, endDate]
    );
    const existingSet = new Set(existingDates.map(r => r.report_date));

    // Walk every date from startDate to endDate and find gaps
    const missingDates: string[] = [];
    const current = new Date(startDate + 'T12:00:00'); // noon to avoid timezone edge cases
    const end = new Date(endDate + 'T12:00:00');
    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (!existingSet.has(dateStr)) {
        missingDates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }

    if (missingDates.length === 0) {
      logger.info('No missed EOD reports to generate');
      return;
    }

    logger.info(`Found ${missingDates.length} missed EOD report(s): ${missingDates.join(', ')}`);

    for (const date of missingDates) {
      try {
        await runEodReportJob(undefined, date);
        logger.info(`Retroactive EOD report generated for ${date}`);
      } catch (error) {
        logger.error(`Failed to generate retroactive EOD report for ${date}`, {
          error: (error as Error).message,
        });
      }
    }

    logger.info(`Missed EOD report catch-up complete: ${missingDates.length} report(s) generated`);
  } catch (error) {
    logger.error('Missed EOD report catch-up failed', { error: (error as Error).message });
  }
}
