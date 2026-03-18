import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';
import { logNotification } from '../services/notificationLogger.js';

export async function runEscalationJob(): Promise<void> {
  try {
    // Find approvals that have been pending for more than their escalation window
    const { rows: overdueApprovals } = await query(`
      SELECT pa.id, pa.payment_id, pa.approver_role, pa.step_number,
             ac.escalation_hours, ac.escalation_role, ac.escalation_user_id,
             p.reference_number, p.payee_name, p.usd_equivalent
      FROM payment_approvals pa
      JOIN payments p ON pa.payment_id = p.id
      JOIN routing_rules rr ON p.routing_rule_id = rr.id
      JOIN approval_chains ac ON rr.id = ac.rule_id AND ac.step = pa.step_number
      WHERE pa.action = 'pending'
      AND pa.step_number = p.current_approval_step
      AND pa.notified_at < datetime('now', '-' || ac.escalation_hours || ' hours')
    `);

    for (const approval of overdueApprovals) {
      logger.info('Escalating approval', {
        approvalId: approval.id,
        paymentId: approval.payment_id,
        reference: approval.reference_number,
      });

      // Mark as escalated
      await query(
        `UPDATE payment_approvals
         SET action = 'escalated',
             escalated_at = datetime('now'),
             escalated_to_id = $2
         WHERE id = $1`,
        [approval.id, approval.escalation_user_id]
      );

      // Create new approval record for escalation target
      await query(
        `INSERT INTO payment_approvals (payment_id, approver_role, approver_id, step_number, action, notified_at)
         VALUES ($1, $2, $3, $4, 'pending', datetime('now'))`,
        [
          approval.payment_id,
          approval.escalation_role || approval.approver_role,
          approval.escalation_user_id,
          approval.step_number,
        ]
      );

      // Log escalation notification
      logNotification({
        notificationType: 'escalation_alert',
        recipientEmail: 'john.murphy@gusto.com',
        channel: 'both',
        subject: `Payment ${approval.reference_number} escalated — approval overdue`,
        paymentId: approval.payment_id,
      });
      // TODO: Send escalation notification via Gmail MCP
      // TODO: Send Slack alert via MCP
    }

    if (overdueApprovals.length > 0) {
      logger.info(`Escalation job completed: ${overdueApprovals.length} approvals escalated`);
    }
  } catch (error) {
    logger.error('Escalation job error', { error: (error as Error).message });
    throw error;
  }
}
