import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

/**
 * Determine SLA hours based on payment amount and type.
 * - Wire payments: 4 hours regardless of amount
 * - >= $1,000,000: 4 hours (dual approval)
 * - $10,000 to $999,999: 8 hours
 * - Under $10,000: 24 hours
 */
export function calculateSlaHours(amount: number, paymentType: string): number {
  if (paymentType === 'wire') return 4;
  if (amount >= 1_000_000) return 4;
  if (amount >= 10_000) return 8;
  return 24;
}

/**
 * Set SLA on a payment and create SLA log entry.
 * Called when a payment is submitted for approval.
 */
export function assignSla(paymentId: string, amount: number, paymentType: string, submittedAt: string): void {
  try {
    const slaHours = calculateSlaHours(amount, paymentType);

    // Update payment with SLA
    query(
      `UPDATE payments SET sla_hours = $2 WHERE id = $1`,
      [paymentId, slaHours]
    );

    // Create SLA log entry
    query(
      `INSERT INTO payment_sla_log (payment_id, sla_hours, submitted_at, sla_deadline)
       VALUES ($1, $2, $3, datetime($3, '+' || $2 || ' hours'))`,
      [paymentId, slaHours, submittedAt]
    );
  } catch (error) {
    logger.error('Failed to assign SLA', { error: (error as Error).message, paymentId });
  }
}

/**
 * Check and escalate overdue payments.
 * Called every 30 minutes by the escalation check job.
 */
export function checkSlaEscalations(): number {
  try {
    // Find pending_approval payments past their SLA deadline
    const { rows } = query<{ id: string; reference_number: string; sla_hours: number; submitted_at: string }>(
      `SELECT id, reference_number, sla_hours, submitted_at
       FROM payments
       WHERE status = 'pending_approval'
         AND is_escalated = 0
         AND submitted_at IS NOT NULL
         AND datetime(submitted_at, '+' || sla_hours || ' hours') < datetime('now')`
    );

    for (const payment of rows) {
      query(
        `UPDATE payments SET is_escalated = 1, escalated_at = datetime('now'), escalation_reason = 'SLA exceeded' WHERE id = $1`,
        [payment.id]
      );

      // Update SLA log
      query(
        `UPDATE payment_sla_log SET escalated_at = datetime('now') WHERE payment_id = $1 AND resolved_at IS NULL`,
        [payment.id]
      );

      logger.warn('Payment SLA exceeded — escalated', {
        paymentId: payment.id,
        reference: payment.reference_number,
        slaHours: payment.sla_hours,
      });
    }

    return rows.length;
  } catch (error) {
    logger.error('SLA escalation check failed', { error: (error as Error).message });
    return 0;
  }
}

/**
 * Resolve SLA when a payment is approved/executed/etc.
 */
export function resolveSla(paymentId: string, resolutionType: string): void {
  try {
    query(
      `UPDATE payment_sla_log SET resolved_at = datetime('now'), resolution_type = $2 WHERE payment_id = $1 AND resolved_at IS NULL`,
      [paymentId, resolutionType]
    );
    query(
      `UPDATE payments SET is_escalated = 0 WHERE id = $1`,
      [paymentId]
    );
  } catch (error) {
    logger.error('Failed to resolve SLA', { error: (error as Error).message, paymentId });
  }
}
