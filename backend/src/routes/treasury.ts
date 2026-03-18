import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { query } from '../config/sqlite.js';
import { logger } from '../utils/logger.js';

const router = Router();

function isTreasurySupervisor(userId: string): boolean {
  const { rows } = query<{ is_supervisor: number }>(
    `SELECT is_supervisor FROM group_members WHERE user_id = $1 AND group_id = 'grp-treasury'`,
    [userId]
  );
  return rows.length > 0 && rows[0].is_supervisor === 1;
}

// GET /api/treasury/cash-balances
router.get('/cash-balances', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isTreasurySupervisor(user.id)) {
    res.status(403).json({ success: false, message: 'Treasury access required' });
    return;
  }

  const accountType = (req.query.account_type as string) || 'both';
  const topN = parseInt(req.query.top_n as string) || 5;
  const daysBack = parseInt(req.query.days_back as string) || 2;

  let typeFilter = '';
  if (accountType === 'corporate') typeFilter = `AND account_type = 'corporate'`;
  else if (accountType === 'customer') typeFilter = `AND account_type = 'customer'`;

  const { rows } = query<any>(
    `SELECT account_name, account_type, balance_date, balance, currency, bank, account_number_last4
     FROM cash_balance_snapshots
     WHERE balance_date >= date('now', '-' || $1 || ' days')
     ${typeFilter}
     ORDER BY balance_date DESC, balance DESC`,
    [daysBack.toString()]
  );

  // Group by account, get top N by most recent balance
  const accountMap = new Map<string, any[]>();
  for (const row of rows) {
    const key = `${row.account_type}:${row.account_name}`;
    if (!accountMap.has(key)) accountMap.set(key, []);
    accountMap.get(key)!.push(row);
  }

  // Sort accounts by most recent balance descending
  const sorted = Array.from(accountMap.entries()).sort((a, b) => {
    const aBalance = a[1][0]?.balance || 0;
    const bBalance = b[1][0]?.balance || 0;
    return bBalance - aBalance;
  });

  const limited = topN > 0 && topN < 999 ? sorted.slice(0, topN) : sorted;

  // Get all unique dates for column headers
  const dates = [...new Set(rows.map((r: any) => r.balance_date))].sort();

  res.json({
    success: true,
    data: {
      accounts: limited.map(([key, balances]) => ({
        accountName: balances[0].account_name,
        accountType: balances[0].account_type,
        bank: balances[0].bank,
        balances: balances.reduce((acc: any, b: any) => {
          acc[b.balance_date] = b.balance;
          return acc;
        }, {}),
      })),
      dates,
    },
  });
});

// GET /api/treasury/cash-balances/last-ingestion
router.get('/cash-balances/last-ingestion', (req: AuthenticatedRequest, res: Response) => {
  const { rows } = query<any>(
    `SELECT MAX(ingested_at) as last_run FROM treasury_ingestion_log WHERE module = 'cash_balances' AND status = 'success'`
  );
  res.json({ success: true, data: { lastIngestion: rows[0]?.last_run || null } });
});

// GET /api/treasury/corp-forecast
router.get('/corp-forecast', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isTreasurySupervisor(user.id)) {
    res.status(403).json({ success: false, message: 'Treasury access required' });
    return;
  }

  const weeksBack = parseInt(req.query.weeks_back as string) || 4;
  const daysBack = weeksBack * 7;

  const { rows } = query<any>(
    `SELECT account_name, forecast_date, forecast_amount, actual_amount, min_balance, responsible_person
     FROM corp_forecast_snapshots
     WHERE forecast_date >= date('now', '-' || $1 || ' days')
     ORDER BY account_name, forecast_date`,
    [daysBack.toString()]
  );

  // Group by account
  const accountMap = new Map<string, any>();
  for (const row of rows) {
    if (!accountMap.has(row.account_name)) {
      accountMap.set(row.account_name, {
        accountName: row.account_name,
        minBalance: row.min_balance,
        responsiblePerson: row.responsible_person,
        forecasts: {},
      });
    }
    const acc = accountMap.get(row.account_name)!;
    if (row.min_balance != null) acc.minBalance = row.min_balance;
    if (row.responsible_person) acc.responsiblePerson = row.responsible_person;
    acc.forecasts[row.forecast_date] = {
      forecast: row.forecast_amount,
      actual: row.actual_amount,
    };
  }

  const dates = [...new Set(rows.map((r: any) => r.forecast_date))].sort();
  const accounts = Array.from(accountMap.values());

  // Summary stats
  const latestDate = dates[dates.length - 1];
  let belowMinimum = 0;
  let nearMinimum = 0;
  let totalForecast = 0;
  for (const acc of accounts) {
    const latest = acc.forecasts[latestDate];
    if (latest && latest.forecast != null) {
      totalForecast += latest.forecast;
      if (acc.minBalance != null) {
        if (latest.forecast < acc.minBalance) belowMinimum++;
        else if (latest.forecast < acc.minBalance * 1.2) nearMinimum++;
      }
    }
  }

  res.json({
    success: true,
    data: {
      accounts,
      dates,
      summary: { belowMinimum, nearMinimum, totalForecast },
    },
  });
});

// GET /api/treasury/new-accounts
router.get('/new-accounts', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isTreasurySupervisor(user.id)) {
    res.status(403).json({ success: false, message: 'Treasury access required' });
    return;
  }

  const { rows } = query<any>(
    `SELECT * FROM new_account_tracker ORDER BY
      CASE priority WHEN 'High' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Low' THEN 3 END,
      requested_date ASC`
  );

  res.json({ success: true, data: rows });
});

// POST /api/treasury/new-accounts
router.post('/new-accounts', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isTreasurySupervisor(user.id)) {
    res.status(403).json({ success: false, message: 'Treasury admin required' });
    return;
  }

  const { account_name, bank, legal_entity, purpose, requesting_team, status, assigned_to, priority, requested_date, target_open_date, notes } = req.body;

  if (!account_name || !bank) {
    res.status(400).json({ success: false, message: 'account_name and bank are required' });
    return;
  }

  const { rows } = query<any>(
    `INSERT INTO new_account_tracker (account_name, bank, legal_entity, purpose, requesting_team, status, assigned_to, priority, requested_date, target_open_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [account_name, bank, legal_entity || null, purpose || null, requesting_team || null, status || 'Requested', assigned_to || null, priority || 'Normal', requested_date || null, target_open_date || null, notes || null]
  );

  res.json({ success: true, data: rows[0] });
});

// PATCH /api/treasury/new-accounts/:id
router.patch('/new-accounts/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (!isTreasurySupervisor(user.id)) {
    res.status(403).json({ success: false, message: 'Treasury admin required' });
    return;
  }

  const { id } = req.params;
  const updates = req.body;

  const fields: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  const allowedFields = ['account_name', 'bank', 'legal_entity', 'purpose', 'requesting_team', 'status', 'assigned_to', 'priority', 'requested_date', 'target_open_date', 'actual_open_date', 'notes'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = $${paramIdx}`);
      values.push(updates[field]);
      paramIdx++;
    }
  }

  if (fields.length === 0) {
    res.status(400).json({ success: false, message: 'No valid fields to update' });
    return;
  }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  const { rows } = query<any>(
    `UPDATE new_account_tracker SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
    values
  );

  if (rows.length === 0) {
    res.status(404).json({ success: false, message: 'Account not found' });
    return;
  }

  res.json({ success: true, data: rows[0] });
});

// GET /api/treasury/user-preferences
router.get('/user-preferences', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { rows } = query<any>(
    `SELECT * FROM treasury_user_preferences WHERE user_id = $1`,
    [user.id]
  );
  res.json({
    success: true,
    data: rows[0] || { user_id: user.id, cash_top_n: 5, cash_days_back: 2, cash_account_type: 'both' },
  });
});

// PUT /api/treasury/user-preferences
router.put('/user-preferences', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { cash_top_n, cash_days_back, cash_account_type } = req.body;

  query(
    `INSERT OR REPLACE INTO treasury_user_preferences (user_id, cash_top_n, cash_days_back, cash_account_type, updated_at)
     VALUES ($1, $2, $3, $4, datetime('now'))`,
    [user.id, cash_top_n || 5, cash_days_back || 2, cash_account_type || 'both']
  );

  res.json({ success: true });
});

// GET /api/treasury/is-treasury-user
router.get('/is-treasury-user', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({ success: true, data: { isTreasurySupervisor: isTreasurySupervisor(user.id) } });
});

export default router;
