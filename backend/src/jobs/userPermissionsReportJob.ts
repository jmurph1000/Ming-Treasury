import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

interface UserSnapshot {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  title: string | null;
  payment_limit: number | null;
  last_login_at: string | null;
  account_count: number;
}

const ROLE_LABELS: Record<string, string> = {
  staff: 'Staff',
  manager: 'Manager',
  sr_manager: 'Senior Manager',
  admin: 'Administrator',
};

export async function runUserPermissionsReportJob(): Promise<void> {
  try {
    logger.info('User permissions report job started');

    const today = new Date().toISOString().slice(0, 10);

    // Snapshot all users and their assigned account counts
    const { rows: users } = await query<UserSnapshot>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.department,
        u.title,
        u.payment_limit,
        u.last_login_at,
        (SELECT COUNT(*) FROM user_account_access uaa WHERE uaa.user_id = u.id) AS account_count
      FROM users u
      ORDER BY
        CASE u.role
          WHEN 'admin' THEN 1
          WHEN 'sr_manager' THEN 2
          WHEN 'manager' THEN 3
          WHEN 'staff' THEN 4
          ELSE 5
        END,
        u.name
    `);

    const activeUsers = users.filter(u => u.status === 'active');
    const suspendedUsers = users.filter(u => u.status === 'suspended');
    const pendingUsers = users.filter(u => u.status === 'pending');

    // Build summary data
    const roleCounts: Record<string, number> = {};
    for (const u of activeUsers) {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    }

    const templateData = JSON.stringify({
      date: today,
      totalUsers: users.length,
      activeCount: activeUsers.length,
      suspendedCount: suspendedUsers.length,
      pendingCount: pendingUsers.length,
      roleCounts,
      users: users.map(u => ({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        department: u.department,
        title: u.title,
        paymentLimit: u.payment_limit,
        lastLogin: u.last_login_at,
        accountRestrictions: u.account_count > 0 ? u.account_count : null,
      })),
    });

    const subject = `[Treasury Portal] Daily User Permissions Report — ${today}`;
    const html = buildHtml(users, activeUsers, suspendedUsers, pendingUsers, roleCounts, today);

    // Check if today's report already exists
    const { rows: existing } = await query(
      `SELECT id FROM notifications
       WHERE type = 'user_permissions_report' AND date(created_at) = $1`,
      [today]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE notifications
         SET subject = $1, body = $2, template_data = $3, status = 'generated', created_at = datetime('now')
         WHERE id = $4`,
        [subject, html, templateData, existing[0].id]
      );
      logger.info('User permissions report updated for today');
    } else {
      await query(
        `INSERT INTO notifications (type, channel, subject, body, template_data, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, datetime('now'))`,
        ['user_permissions_report', 'in_app', subject, html, templateData, 'generated']
      );
      logger.info('User permissions report stored for today');
    }

    logger.info(`User permissions report completed: ${activeUsers.length} active, ${suspendedUsers.length} suspended, ${pendingUsers.length} pending`);
  } catch (error) {
    logger.error('User permissions report job error', { error: (error as Error).message });
    throw error;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function buildHtml(
  allUsers: UserSnapshot[],
  active: UserSnapshot[],
  suspended: UserSnapshot[],
  pending: UserSnapshot[],
  roleCounts: Record<string, number>,
  date: string
): string {
  const cell = 'padding:8px;border:1px solid #ddd;';

  const roleCountRows = Object.entries(roleCounts)
    .map(([role, count]) => `<li>${ROLE_LABELS[role] || role}: <strong>${count}</strong></li>`)
    .join('');

  const userRows = (users: UserSnapshot[], bgColor: string) =>
    users.map(u => `
      <tr>
        <td style="${cell}">${u.name}</td>
        <td style="${cell}">${u.email}</td>
        <td style="${cell}">${ROLE_LABELS[u.role] || u.role}</td>
        <td style="${cell}">${u.department || '—'}</td>
        <td style="${cell}">${u.title || '—'}</td>
        <td style="${cell}">${u.payment_limit ? formatCurrency(u.payment_limit) : 'Unlimited'}</td>
        <td style="${cell}">${u.account_count > 0 ? `${u.account_count} account(s)` : 'All accounts'}</td>
        <td style="${cell}"><span style="color:${bgColor};font-weight:600;">${u.status}</span></td>
        <td style="${cell}">${u.last_login_at || 'Never'}</td>
      </tr>
    `).join('');

  const tableHeader = `
    <tr style="background:#f3f4f6;">
      <th style="${cell}text-align:left;">Name</th>
      <th style="${cell}text-align:left;">Email</th>
      <th style="${cell}text-align:left;">Role</th>
      <th style="${cell}text-align:left;">Department</th>
      <th style="${cell}text-align:left;">Title</th>
      <th style="${cell}text-align:left;">Payment Limit</th>
      <th style="${cell}text-align:left;">Account Access</th>
      <th style="${cell}text-align:left;">Status</th>
      <th style="${cell}text-align:left;">Last Login</th>
    </tr>
  `;

  return `
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — ${date}</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        ${allUsers.length} total users — ${active.length} active, ${suspended.length} suspended, ${pending.length} pending
        <ul style="margin-top:8px;">${roleCountRows}</ul>
      </div>

      ${active.length > 0 ? `
        <h3 style="color:#047857;">Active Users (${active.length})</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>${tableHeader}</thead>
          <tbody>${userRows(active, '#16a34a')}</tbody>
        </table>
      ` : ''}

      ${suspended.length > 0 ? `
        <h3 style="color:#dc2626;">Suspended Users (${suspended.length})</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>${tableHeader}</thead>
          <tbody>${userRows(suspended, '#dc2626')}</tbody>
        </table>
      ` : ''}

      ${pending.length > 0 ? `
        <h3 style="color:#d97706;">Pending Users (${pending.length})</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>${tableHeader}</thead>
          <tbody>${userRows(pending, '#d97706')}</tbody>
        </table>
      ` : ''}

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  `;
}
