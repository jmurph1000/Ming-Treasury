import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory conversation storage per user session (last 20 messages)
const conversationStore = new Map<string, Array<{ role: string; content: string }>>();

const TREASURY_ADMIN_EMAILS = ['john.murphy@gusto.com', 'ming.huey@gusto.com', 'bobby.cajucom@gusto.com'];

function isTreasuryAdmin(userId: string): boolean {
  // Check if user is a supervisor in the Treasury group
  const { rows } = query<{ is_supervisor: number }>(
    `SELECT is_supervisor FROM group_members WHERE user_id = $1 AND group_id = 'grp-treasury'`,
    [userId]
  );
  return rows.length > 0 && rows[0].is_supervisor === 1;
}

function getUserGroup(userId: string): { groupId: string; groupName: string } | null {
  const { rows } = query<{ group_id: string; name: string }>(
    `SELECT gm.group_id, g.name FROM group_members gm JOIN groups g ON g.id = gm.group_id WHERE gm.user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? { groupId: rows[0].group_id, groupName: rows[0].name } : null;
}

function getAdminPortalData(): string {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // All payments from last 30 days
  const { rows: payments } = query<any>(
    `SELECT p.reference_number, p.payee_name, p.amount, p.currency, p.payment_type, p.status,
            u.name as submitted_by, p.created_at
     FROM payments p
     LEFT JOIN users u ON u.id = p.requester_id
     WHERE p.created_at >= $1
     ORDER BY p.created_at DESC
     LIMIT 100`,
    [thirtyDaysAgo]
  );

  // Status counts
  const { rows: statusCounts } = query<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM payments WHERE created_at >= $1 GROUP BY status`,
    [thirtyDaysAgo]
  );

  // Active users and groups
  const { rows: users } = query<{ name: string; email: string; role: string; group_name: string }>(
    `SELECT u.name, u.email, u.role, COALESCE(g.name, 'Unassigned') as group_name
     FROM users u
     LEFT JOIN group_members gm ON gm.user_id = u.id
     LEFT JOIN groups g ON g.id = gm.group_id
     WHERE u.status = 'active'
     ORDER BY u.name`
  );

  let data = `Today: ${today}\n\n`;

  data += `PAYMENT STATUS SUMMARY (Last 30 Days):\n`;
  statusCounts.forEach((s: any) => {
    data += `- ${s.status}: ${s.count}\n`;
  });

  data += `\nRECENT PAYMENTS (Last 30 Days, up to 100):\n`;
  payments.forEach((p: any) => {
    data += `- ${p.reference_number} | ${p.payee_name || 'N/A'} | ${p.currency} ${p.amount} | ${p.payment_type} | ${p.status} | by ${p.submitted_by || 'Unknown'} | ${p.created_at}\n`;
  });

  data += `\nACTIVE USERS:\n`;
  users.forEach((u: any) => {
    data += `- ${u.name} (${u.email}) | Role: ${u.role} | Group: ${u.group_name}\n`;
  });

  // Escalated payments
  const { rows: escalated } = query<any>(
    `SELECT p.reference_number, p.payee_name, p.amount, p.currency, p.sla_hours, p.submitted_at, p.escalated_at, u.name as requester_name
     FROM payments p LEFT JOIN users u ON u.id = p.requester_id
     WHERE p.is_escalated = 1 ORDER BY p.escalated_at DESC`
  );
  data += `\nESCALATED PAYMENTS (SLA exceeded):\n`;
  if (escalated.length === 0) { data += `- None\n`; }
  escalated.forEach((e: any) => {
    data += `- ${e.reference_number} | ${e.payee_name || 'N/A'} | ${e.currency} ${e.amount} | SLA: ${e.sla_hours}h | Submitted: ${e.submitted_at} | Escalated: ${e.escalated_at} | by ${e.requester_name}\n`;
  });

  // Today's logins
  const { rows: sessions } = query<any>(
    `SELECT user_name, user_group, login_at, last_active_at FROM user_sessions WHERE date(login_at) = date('now') ORDER BY login_at DESC`
  );
  data += `\nTODAY'S LOGINS:\n`;
  if (sessions.length === 0) { data += `- None\n`; }
  sessions.forEach((s: any) => {
    data += `- ${s.user_name} (${s.user_group || 'N/A'}) logged in at ${s.login_at}, last active: ${s.last_active_at}\n`;
  });

  // Recent bank confirmations (last 7 days)
  const { rows: confirmations } = query<any>(
    `SELECT bc.confirmation_type, bc.bank_name, bc.confirmation_reference, bc.confirmed_at, bc.confirmed_by_name, bc.amount, bc.currency, p.reference_number
     FROM bank_confirmations bc LEFT JOIN payments p ON p.id = bc.payment_id
     WHERE bc.confirmed_at >= datetime('now', '-7 days') ORDER BY bc.confirmed_at DESC LIMIT 20`
  );
  data += `\nRECENT BANK CONFIRMATIONS (Last 7 Days):\n`;
  if (confirmations.length === 0) { data += `- None\n`; }
  confirmations.forEach((c: any) => {
    data += `- ${c.confirmation_type} | ${c.bank_name} | Ref: ${c.confirmation_reference || 'N/A'} | ${c.currency} ${c.amount || 'N/A'} | Payment: ${c.reference_number || 'N/A'} | by ${c.confirmed_by_name} | ${c.confirmed_at}\n`;
  });

  // Recent notifications (last 24 hours)
  const { rows: notifications } = query<any>(
    `SELECT notification_type, recipient_email, channel, subject, delivery_status, sent_at FROM notification_log
     WHERE sent_at >= datetime('now', '-24 hours') ORDER BY sent_at DESC LIMIT 20`
  );
  data += `\nRECENT NOTIFICATIONS (Last 24 Hours):\n`;
  if (notifications.length === 0) { data += `- None\n`; }
  notifications.forEach((n: any) => {
    data += `- ${n.notification_type} | To: ${n.recipient_email || 'N/A'} | ${n.channel} | ${n.subject || 'N/A'} | ${n.delivery_status} | ${n.sent_at}\n`;
  });

  return data;
}

function getStandardUserPortalData(userId: string, groupId: string): string {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // User's own payments
  const { rows: myPayments } = query<any>(
    `SELECT p.reference_number, p.payee_name, p.amount, p.currency, p.payment_type, p.status, p.created_at
     FROM payments p
     WHERE p.requester_id = $1 AND p.created_at >= $2
     ORDER BY p.created_at DESC`,
    [userId, thirtyDaysAgo]
  );

  // Group members' payments
  const { rows: groupPayments } = query<any>(
    `SELECT p.reference_number, p.payee_name, p.amount, p.currency, p.payment_type, p.status,
            u.name as submitted_by, p.created_at
     FROM payments p
     JOIN users u ON u.id = p.requester_id
     JOIN group_members gm ON gm.user_id = p.requester_id AND gm.group_id = $1
     WHERE p.created_at >= $2
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [groupId, thirtyDaysAgo]
  );

  // Group's permitted accounts
  const { rows: accounts } = query<any>(
    `SELECT a.name, a.bank_name, a.account_type, ga.direction, ga.funding_type
     FROM group_accounts ga
     JOIN accounts a ON a.id = ga.account_id
     WHERE ga.group_id = $1 AND a.is_active = 1`,
    [groupId]
  );

  let data = `Today: ${today}\n\n`;

  data += `YOUR PAYMENTS (Last 30 Days):\n`;
  if (myPayments.length === 0) {
    data += `- No payments found\n`;
  } else {
    myPayments.forEach((p: any) => {
      data += `- ${p.reference_number} | ${p.payee_name || 'N/A'} | ${p.currency} ${p.amount} | ${p.payment_type} | ${p.status} | ${p.created_at}\n`;
    });
  }

  data += `\nGROUP PAYMENTS (Last 30 Days, up to 50):\n`;
  groupPayments.forEach((p: any) => {
    data += `- ${p.reference_number} | ${p.payee_name || 'N/A'} | ${p.currency} ${p.amount} | ${p.payment_type} | ${p.status} | by ${p.submitted_by} | ${p.created_at}\n`;
  });

  data += `\nGROUP PERMITTED ACCOUNTS:\n`;
  if (accounts.length === 0) {
    data += `- No accounts configured\n`;
  } else {
    accounts.forEach((a: any) => {
      data += `- ${a.name} (${a.bank_name}) | Type: ${a.account_type} | Direction: ${a.direction} | Funding: ${a.funding_type}\n`;
    });
  }

  // User's pending payments with SLA info
  const { rows: pendingSla } = query<any>(
    `SELECT p.reference_number, p.payee_name, p.amount, p.currency, p.sla_hours, p.submitted_at, p.is_escalated,
            ROUND((julianday('now') - julianday(p.submitted_at)) * 24, 1) as hours_waiting
     FROM payments p
     WHERE p.requester_id = $1 AND p.status = 'pending_approval'`,
    [userId]
  );
  data += `\nYOUR PENDING PAYMENTS (SLA Status):\n`;
  if (pendingSla.length === 0) { data += `- None pending\n`; }
  pendingSla.forEach((p: any) => {
    const deadline = p.sla_hours ? `${p.sla_hours}h SLA` : 'No SLA';
    const status = p.is_escalated ? 'ESCALATED' : `${p.hours_waiting}h waiting`;
    data += `- ${p.reference_number} | ${p.payee_name || 'N/A'} | ${p.currency} ${p.amount} | ${deadline} | ${status}\n`;
  });

  // Notifications sent to this user in last 7 days
  const { rows: userNotifs } = query<any>(
    `SELECT notification_type, subject, channel, sent_at, delivery_status FROM notification_log
     WHERE recipient_user_id = $1 AND sent_at >= datetime('now', '-7 days') ORDER BY sent_at DESC LIMIT 10`,
    [userId]
  );
  data += `\nYOUR RECENT NOTIFICATIONS (Last 7 Days):\n`;
  if (userNotifs.length === 0) { data += `- None\n`; }
  userNotifs.forEach((n: any) => {
    data += `- ${n.notification_type} | ${n.subject || 'N/A'} | ${n.channel} | ${n.delivery_status} | ${n.sent_at}\n`;
  });

  return data;
}

function buildAdminSystemPrompt(userName: string, portalData: string, today: string): string {
  return `You are Bunmahon, the AI treasury assistant for Gusto's Treasury Payment Portal. You are named after the beautiful coastal village of Bunmahon in County Waterford, Ireland — a historic copper mining village on the UNESCO Copper Coast Geopark, whose people showed resilience and resourcefulness through generations of hardship and emigration. You carry that spirit into treasury work.

You have a professional tone with occasional Irish wit — knowledgeable, precise, and occasionally charming in a distinctly Irish way. Never overdo the Irish references. Never use fake Irish spellings or stereotypes. Think of yourself as a sharp, warm Irish colleague who happens to know everything about Gusto's treasury operation.

You are speaking with ${userName}, a Treasury Administrator with full access to all portal data, Google Drive, Slack, and Gmail.

CAPABILITIES:
- Answer questions about any payment using the CURRENT PORTAL DATA below
- Search Google Drive for treasury documents using your Drive tool
- Search Slack for past treasury conversations using your Slack tool
- Search Gmail for bank communications using your Gmail tool
- Explain portal features, approval workflows, account permissions
- Provide payment statistics across all users and groups

RULES:
- Always be accurate — never guess at amounts, dates, or statuses
- Use CURRENT PORTAL DATA when the answer is there — do not fabricate data
- Keep responses concise — this is a busy treasury operation
- Occasional light Irish wit is welcome, never forced
- If someone asks about Bunmahon the village, share a brief, warm fact about it

CURRENT PORTAL DATA:
${portalData}

Today is ${today}. Logged-in user: ${userName}, Treasury Administrator.`;
}

function buildStandardSystemPrompt(userName: string, groupName: string, portalData: string, today: string): string {
  return `You are Bunmahon, the AI treasury assistant for Gusto's Treasury Payment Portal. You are named after the coastal village of Bunmahon in County Waterford, Ireland. You have a professional tone with occasional Irish wit — knowledgeable, precise, and occasionally charming.

You are speaking with ${userName}, a member of the ${groupName} group.

CAPABILITIES:
- Answer questions about ${userName}'s own payments and their group's activity
- Explain how to submit, approve, edit, or cancel payments
- Describe the approval workflow and thresholds ($1M dual approval rule)
- List accounts the user's group can access
- Provide payment counts and summaries for the user and their group
- Guide users step by step through portal features
- Explain Returned for Info status and how to resubmit with required changes

YOU CANNOT ACCESS:
- Other groups' data
- Treasury-level reports
- Google Drive, Slack, or Gmail
- Bank balances or external systems

If asked about something outside your scope: "That's a wee bit outside what I can help with — I'm scoped to your group's portal activity. For anything broader, reach out to Treasury directly."

CURRENT PORTAL DATA:
${portalData}

Today is ${today}. Logged-in user: ${userName}, ${groupName} group.`;
}

// POST /api/bunmahon/chat
router.post('/chat', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.json({
        success: true,
        data: {
          response: "I'm not quite ready yet — ask your Treasury admin to set up my API key and I'll be right with ya!"
        }
      });
      return;
    }

    const isAdmin = isTreasuryAdmin(user.id);
    const today = new Date().toISOString().split('T')[0];
    const firstName = user.name.split(' ')[0];

    // Build system prompt
    let systemPrompt: string;
    if (isAdmin) {
      const portalData = getAdminPortalData();
      systemPrompt = buildAdminSystemPrompt(user.name, portalData, today);
    } else {
      const group = getUserGroup(user.id);
      const groupName = group?.groupName || 'Unknown';
      const groupId = group?.groupId || '';
      const portalData = getStandardUserPortalData(user.id, groupId);
      systemPrompt = buildStandardSystemPrompt(user.name, groupName, portalData, today);
    }

    // Get or initialize conversation history
    const sessionKey = `${user.id}-${req.sessionId || 'default'}`;
    if (!conversationStore.has(sessionKey)) {
      conversationStore.set(sessionKey, []);
    }
    const history = conversationStore.get(sessionKey)!;

    // Add user message
    history.push({ role: 'user', content: message.trim() });

    // Keep only last 20 messages
    while (history.length > 20) {
      history.shift();
    }

    // Build Anthropic API request
    const requestBody: any = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history,
    };

    // Add MCP servers for treasury admins
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    if (isAdmin) {
      headers['anthropic-beta'] = 'mcp-client-2025-04-04';
      requestBody.mcp_servers = [
        {
          type: 'url',
          url: 'https://gusto.runlayer.com/api/v1/proxy/eb61d550-9562-4a2c-bb8f-f32ce5e59f37/mcp',
          name: 'Gdrive_Gusto'
        },
        {
          type: 'url',
          url: 'https://gusto.runlayer.com/api/v1/proxy/1ceccfb7-3fea-4c7d-a82f-673dac326434/mcp',
          name: 'Slack_Gusto'
        },
        {
          type: 'url',
          url: 'https://gusto.runlayer.com/api/v1/proxy/cb9bacf6-95bb-464f-a7d7-c1a6925208ad/mcp',
          name: 'Gmail_Gusto'
        }
      ];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Anthropic API error', { status: response.status, body: errorText });
      res.json({
        success: true,
        data: {
          response: "Ah, I seem to be having a bit of trouble connecting to my thinking cap. Give it another go in a moment."
        }
      });
      return;
    }

    const result = await response.json() as any;

    // Extract text from response
    let assistantMessage = '';
    if (result.content && Array.isArray(result.content)) {
      for (const block of result.content) {
        if (block.type === 'text') {
          assistantMessage += block.text;
        }
      }
    }

    if (!assistantMessage) {
      assistantMessage = "I'm still processing that one — give me a moment and try again.";
    }

    // Store assistant response in history
    history.push({ role: 'assistant', content: assistantMessage });

    // Keep only last 20 messages
    while (history.length > 20) {
      history.shift();
    }

    res.json({
      success: true,
      data: {
        response: assistantMessage,
        isAdmin,
      }
    });
  } catch (error) {
    logger.error('Bunmahon chat error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
    });
  }
});

// GET /api/bunmahon/welcome - Get the welcome message for the current user
router.get('/welcome', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const firstName = user.name.split(' ')[0];
  const isAdmin = isTreasuryAdmin(user.id);

  let welcomeMessage: string;
  if (isAdmin) {
    welcomeMessage = `Good day to ya, ${firstName}! I'm Bunmahon, your treasury assistant. I can search your payments, dive into Google Drive, check Slack, pull reports — the full run of it. What can I help you with?`;
  } else {
    welcomeMessage = `Good day to ya, ${firstName}! I'm Bunmahon, your treasury assistant. Ask me anything about your payments, your group's activity, or how to use the portal. What can I get for ya?`;
  }

  res.json({
    success: true,
    data: {
      welcomeMessage,
      isAdmin,
      userName: user.name,
    }
  });
});

export default router;
