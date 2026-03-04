import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger.js';

// Use SQLite file in project root for persistence, or :memory: for testing
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'treasury.db');
const isMemory = dbPath === ':memory:';

logger.info(`Using SQLite database: ${isMemory ? 'in-memory' : dbPath}`);

export const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeSchema() {
  logger.info('Initializing SQLite schema...');

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('staff', 'manager', 'sr_manager', 'admin')),
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
      workday_id TEXT,
      title TEXT,
      department TEXT,
      cost_center TEXT,
      manager_name TEXT,
      manager_email TEXT,
      pe_partner_name TEXT,
      pe_partner_email TEXT,
      payment_limit REAL,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Bank accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number_encrypted TEXT NOT NULL,
      routing_number_encrypted TEXT NOT NULL,
      account_type TEXT CHECK (account_type IN ('checking', 'savings', 'payroll', 'operating')),
      currency TEXT DEFAULT 'USD',
      daily_limit REAL,
      dual_control_required INTEGER DEFAULT 1,
      dual_control_threshold REAL,
      dual_control_mode TEXT DEFAULT 'above_threshold',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Saved payees
    CREATE TABLE IF NOT EXISTS saved_payees (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('ach', 'wire', 'check', 'internal')),
      bank_name TEXT,
      routing_number_encrypted TEXT,
      account_number_encrypted TEXT,
      swift_code TEXT,
      iban TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      postal_code TEXT,
      country TEXT DEFAULT 'USA',
      currency TEXT DEFAULT 'USD',
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      reference_number TEXT UNIQUE,
      requester_id TEXT NOT NULL REFERENCES users(id),
      payee_id TEXT REFERENCES saved_payees(id),
      payee_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      fx_rate REAL,
      usd_equivalent REAL NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      payment_type TEXT NOT NULL CHECK (payment_type IN ('ach', 'wire', 'check', 'internal')),
      funding_type TEXT NOT NULL DEFAULT 'external' CHECK (funding_type IN ('internal', 'external')),
      destination_account_id TEXT REFERENCES accounts(id),
      ext_bank_name TEXT,
      ext_routing_number TEXT,
      ext_bank_account TEXT,
      ext_recipient_address TEXT,
      ext_special_instructions TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 'returned',
        'ready_to_execute', 'pending_confirmation', 'executed', 'bank_rejected', 'cancelled'
      )),
      business_justification TEXT NOT NULL,
      requested_date TEXT NOT NULL,
      actual_execution_date TEXT,
      bank_reference TEXT,
      bank_rejection_reason TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      recurring_end_date TEXT,
      parent_recurring_id TEXT,
      template_id TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_size INTEGER,
      current_approval_step INTEGER DEFAULT 0,
      total_approval_steps INTEGER,
      routing_rule_id TEXT,
      is_duplicate_flagged INTEGER DEFAULT 0,
      duplicate_reference_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      submitted_at TEXT,
      executed_at TEXT
    );

    -- Payment approvals
    CREATE TABLE IF NOT EXISTS payment_approvals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL REFERENCES payments(id),
      approver_id TEXT REFERENCES users(id),
      approver_role TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      action TEXT DEFAULT 'pending' CHECK (action IN ('pending', 'approved', 'rejected', 'returned', 'escalated')),
      comment TEXT,
      notified_at TEXT,
      actioned_at TEXT,
      escalated_at TEXT,
      escalated_to_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Approval comments
    CREATE TABLE IF NOT EXISTS approval_comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL REFERENCES payments(id),
      approval_id TEXT REFERENCES payment_approvals(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      comment TEXT NOT NULL,
      is_internal INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Execution confirmations
    CREATE TABLE IF NOT EXISTS execution_confirmations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL REFERENCES payments(id),
      confirmer_id TEXT NOT NULL REFERENCES users(id),
      confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('primary', 'secondary')),
      bank_reference TEXT,
      actual_amount REAL,
      actual_date TEXT,
      confirmed_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT,
      is_emergency_halt INTEGER DEFAULT 0,
      halt_reason TEXT
    );

    -- Routing rules
    CREATE TABLE IF NOT EXISTS routing_rules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      priority INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'account', 'payment_type', 'amount_range', 'payee', 'department', 'combined'
      )),
      account_id TEXT REFERENCES accounts(id),
      payment_type TEXT,
      min_amount REAL,
      max_amount REAL,
      department TEXT,
      payee_pattern TEXT,
      num_approvers INTEGER NOT NULL CHECK (num_approvers BETWEEN 1 AND 4),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Approval chains
    CREATE TABLE IF NOT EXISTS approval_chains (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      rule_id TEXT NOT NULL REFERENCES routing_rules(id) ON DELETE CASCADE,
      step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
      approver_role TEXT,
      specific_approver_id TEXT REFERENCES users(id),
      escalation_hours INTEGER DEFAULT 24,
      escalation_role TEXT,
      escalation_user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(rule_id, step)
    );

    -- Audit log
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id),
      user_email TEXT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      request_id TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    -- Access requests
    CREATE TABLE IF NOT EXISTS access_requests (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT NOT NULL,
      requested_role TEXT NOT NULL,
      admin_id TEXT NOT NULL REFERENCES users(id),
      workday_data TEXT,
      manager_email TEXT,
      manager_name TEXT,
      approval_token TEXT UNIQUE,
      denial_token TEXT UNIQUE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
      manager_response_at TEXT,
      denial_reason TEXT,
      notes TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Payment templates
    CREATE TABLE IF NOT EXISTS payment_templates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      payee_id TEXT REFERENCES saved_payees(id),
      payee_name TEXT,
      payment_type TEXT NOT NULL,
      account_id TEXT REFERENCES accounts(id),
      default_amount REAL,
      currency TEXT DEFAULT 'USD',
      default_justification TEXT,
      is_shared INTEGER DEFAULT 0,
      usage_count INTEGER DEFAULT 0,
      last_used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Bank holidays
    CREATE TABLE IF NOT EXISTS bank_holidays (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      country TEXT DEFAULT 'USA',
      year INTEGER NOT NULL,
      is_federal INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, country)
    );

    -- FX rates
    CREATE TABLE IF NOT EXISTS fx_rates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      source TEXT DEFAULT 'manual',
      fetched_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      UNIQUE(base_currency, target_currency)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT REFERENCES users(id),
      payment_id TEXT REFERENCES payments(id),
      type TEXT NOT NULL,
      channel TEXT CHECK (channel IN ('email', 'slack', 'in_app')),
      recipient_email TEXT,
      recipient_slack_id TEXT,
      subject TEXT,
      body TEXT,
      template_name TEXT,
      template_data TEXT,
      sent_at TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- System settings
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      category TEXT,
      updated_by TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- IP Allowlist
    CREATE TABLE IF NOT EXISTS ip_allowlist (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      cidr TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Documents (for user guide and other editable content)
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Document versions (audit trail for document changes)
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      document_id TEXT NOT NULL REFERENCES documents(id),
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Groups
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      override_approval_flow INTEGER DEFAULT 0,
      approval_trigger_mode TEXT DEFAULT 'flat' CHECK (approval_trigger_mode IN ('flat', 'amount_threshold')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Group approval tiers (amount ranges or single "All Payments" tier for flat mode)
    CREATE TABLE IF NOT EXISTS group_approval_tiers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      min_amount REAL,
      max_amount REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_gat_group ON group_approval_tiers(group_id);

    -- Group approval steps (1-2 steps per tier)
    CREATE TABLE IF NOT EXISTS group_approval_steps (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tier_id TEXT NOT NULL REFERENCES group_approval_tiers(id) ON DELETE CASCADE,
      step INTEGER NOT NULL CHECK (step IN (1, 2)),
      approver_mode TEXT NOT NULL CHECK (approver_mode IN ('role', 'specific_user')),
      approver_role TEXT,
      specific_approver_id TEXT REFERENCES users(id),
      escalation_hours INTEGER DEFAULT 24,
      UNIQUE(tier_id, step)
    );
    CREATE INDEX IF NOT EXISTS idx_gas_tier ON group_approval_steps(tier_id);

    -- Group members
    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      added_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_gm_user ON group_members(user_id);

    -- Group account access (which accounts a group can pay from/to)
    CREATE TABLE IF NOT EXISTS group_accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      direction TEXT NOT NULL CHECK (direction IN ('from', 'to', 'both')),
      funding_type TEXT NOT NULL DEFAULT 'both' CHECK (funding_type IN ('internal', 'external', 'both')),
      added_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, account_id, direction)
    );
    CREATE INDEX IF NOT EXISTS idx_ga_group ON group_accounts(group_id);
    CREATE INDEX IF NOT EXISTS idx_ga_account ON group_accounts(account_id);

    -- User-account access restrictions (legacy per-user)
    CREATE TABLE IF NOT EXISTS user_account_access (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      account_id TEXT NOT NULL REFERENCES accounts(id),
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, account_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_uaa_user ON user_account_access(user_id);
    CREATE INDEX IF NOT EXISTS idx_uaa_account ON user_account_access(account_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_requester ON payments(requester_id);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_approvals_payment ON payment_approvals(payment_id);
    CREATE INDEX IF NOT EXISTS idx_approvals_approver ON payment_approvals(approver_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

    -- Trigger for auto-generating reference numbers
    CREATE TRIGGER IF NOT EXISTS generate_payment_reference
    AFTER INSERT ON payments
    WHEN NEW.reference_number IS NULL
    BEGIN
      UPDATE payments
      SET reference_number = 'PAY-' || strftime('%Y%m%d', 'now') || '-' ||
        substr('000000' || (SELECT COUNT(*) + 1 FROM payments WHERE date(created_at) = date('now')), -6)
      WHERE id = NEW.id;
    END;
  `);

  // Safe ALTER TABLE for existing databases that lack the new columns
  try { db.exec(`ALTER TABLE groups ADD COLUMN override_approval_flow INTEGER DEFAULT 0`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE groups ADD COLUMN approval_trigger_mode TEXT DEFAULT 'flat'`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE groups ADD COLUMN routing_mode TEXT DEFAULT 'approval_chain'`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE groups ADD COLUMN approval_chain_option TEXT DEFAULT 'one_approver'`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE group_approval_steps ADD COLUMN approver_pool TEXT DEFAULT 'group_or_treasury'`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE payment_approvals ADD COLUMN approver_pool TEXT`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE payment_approvals ADD COLUMN group_id TEXT`); } catch (_) { /* column already exists */ }

  // Account access override columns (group-based access model)
  try { db.exec(`ALTER TABLE user_account_access ADD COLUMN override_reason TEXT`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_account_access ADD COLUMN override_by TEXT`); } catch (_) { /* column already exists */ }
  try { db.exec(`ALTER TABLE user_account_access ADD COLUMN override_at TEXT`); } catch (_) { /* column already exists */ }

  // Account access audit log
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_access_audit_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_account_ids TEXT,
      new_account_ids TEXT,
      group_pool_account_ids TEXT,
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_aaal_user ON account_access_audit_log(user_id)`);

  // Group routing change log
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_routing_change_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      changed_by TEXT NOT NULL REFERENCES users(id),
      changed_by_email TEXT,
      change_type TEXT NOT NULL,
      old_config TEXT,
      new_config TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_pa_group ON payment_approvals(group_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_grcl_group ON group_routing_change_log(group_id)`);

  // End-of-day report snapshots
  db.exec(`
    CREATE TABLE IF NOT EXISTS eod_reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      report_date TEXT NOT NULL UNIQUE,
      generated_at TEXT NOT NULL,
      generated_by TEXT,
      pending_count INTEGER NOT NULL DEFAULT 0,
      pending_amount REAL NOT NULL DEFAULT 0,
      executed_count INTEGER NOT NULL DEFAULT 0,
      executed_amount REAL NOT NULL DEFAULT 0,
      rejected_count INTEGER NOT NULL DEFAULT 0,
      cancelled_count INTEGER NOT NULL DEFAULT 0,
      pipeline_data TEXT,
      payments_data TEXT,
      html_body TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_eod_date ON eod_reports(report_date)`);

  // Migrate bank_holidays: remove old UNIQUE(date) constraint, add UNIQUE(date, country)
  try {
    const bhInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='bank_holidays'`).get() as { sql: string } | undefined;
    if (bhInfo && bhInfo.sql.includes('date TEXT NOT NULL UNIQUE') && !bhInfo.sql.includes('UNIQUE(date, country)')) {
      logger.info('Migrating bank_holidays table for multi-country support...');
      db.exec(`DROP TABLE bank_holidays`);
      db.exec(`
        CREATE TABLE bank_holidays (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          date TEXT NOT NULL,
          name TEXT NOT NULL,
          country TEXT DEFAULT 'USA',
          year INTEGER NOT NULL,
          is_federal INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(date, country)
        )
      `);
    }
  } catch (_) { /* table may not exist yet */ }

  // ── Role migration: old 6-role system → new 4-role system ──
  // SQLite CHECK constraints prevent direct UPDATE when old roles exist,
  // so we recreate the table if old role values are found.
  try {
    const oldRoleRow = db.prepare(
      `SELECT COUNT(*) as cnt FROM users WHERE role IN ('ap_staff','ap_manager','sr_ap_manager','treasury','cfo')`
    ).get() as { cnt: number } | undefined;

    if (oldRoleRow && oldRoleRow.cnt > 0) {
      logger.info(`Migrating ${oldRoleRow.cnt} users from old role system to new role system`);

      // Disable FK checks during table swap
      db.pragma('foreign_keys = OFF');

      // 1. Create temp table with new CHECK constraint
      db.exec(`DROP TABLE IF EXISTS users_new`);

      // Get current table SQL and replace the CHECK constraint
      const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`).get() as { sql: string };
      const newSql = tableInfo.sql
        .replace('users', 'users_new')
        .replace(
          /CHECK\s*\(role\s+IN\s*\([^)]+\)\)/i,
          `CHECK (role IN ('staff', 'manager', 'sr_manager', 'admin'))`
        );
      db.exec(newSql);

      // 2. Copy data with role mapping
      db.exec(`
        INSERT INTO users_new SELECT
          id, email, name,
          CASE role
            WHEN 'ap_staff' THEN 'staff'
            WHEN 'ap_manager' THEN 'manager'
            WHEN 'sr_ap_manager' THEN 'sr_manager'
            WHEN 'treasury' THEN 'admin'
            WHEN 'cfo' THEN 'admin'
            ELSE role
          END,
          status, workday_id, title, department, cost_center,
          manager_name, manager_email, pe_partner_name, pe_partner_email,
          payment_limit, last_login_at, created_at, updated_at
        FROM users
      `);

      // 3. Swap tables
      db.exec(`DROP TABLE users`);
      db.exec(`ALTER TABLE users_new RENAME TO users`);

      // Re-enable FK checks
      db.pragma('foreign_keys = ON');

      // 4. Also update approval chain roles
      try {
        db.exec(`UPDATE approval_chains SET approver_role = 'manager' WHERE approver_role = 'ap_manager'`);
        db.exec(`UPDATE approval_chains SET approver_role = 'sr_manager' WHERE approver_role = 'sr_ap_manager'`);
        db.exec(`UPDATE approval_chains SET approver_role = 'admin' WHERE approver_role = 'treasury'`);
        db.exec(`UPDATE approval_chains SET approver_role = 'admin' WHERE approver_role = 'cfo'`);
        db.exec(`UPDATE approval_chains SET approver_role = 'staff' WHERE approver_role = 'ap_staff'`);
      } catch (_) { /* approval_chains may not have old values */ }

      logger.info('Role migration completed successfully');
    }
  } catch (err) {
    logger.warn('Role migration check skipped or already done', { error: (err as Error).message });
  }

  // ── Seed bank holidays (US federal + Canadian federal) for 2025-2026 ──
  seedBankHolidays();

  logger.info('SQLite schema initialized');
}

function seedBankHolidays() {
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM bank_holidays').get() as { cnt: number };
  if (existing.cnt > 0) return; // already seeded

  logger.info('Seeding US and Canadian federal holidays for 2025-2026...');

  const holidays: { date: string; name: string; country: string; year: number }[] = [
    // ── 2025 US Federal Holidays ──
    { date: '2025-01-01', name: "New Year's Day", country: 'USA', year: 2025 },
    { date: '2025-01-20', name: 'Martin Luther King Jr. Day', country: 'USA', year: 2025 },
    { date: '2025-02-17', name: "Presidents' Day", country: 'USA', year: 2025 },
    { date: '2025-05-26', name: 'Memorial Day', country: 'USA', year: 2025 },
    { date: '2025-06-19', name: 'Juneteenth National Independence Day', country: 'USA', year: 2025 },
    { date: '2025-07-04', name: 'Independence Day', country: 'USA', year: 2025 },
    { date: '2025-09-01', name: 'Labor Day', country: 'USA', year: 2025 },
    { date: '2025-10-13', name: 'Columbus Day', country: 'USA', year: 2025 },
    { date: '2025-11-11', name: 'Veterans Day', country: 'USA', year: 2025 },
    { date: '2025-11-27', name: 'Thanksgiving Day', country: 'USA', year: 2025 },
    { date: '2025-12-25', name: 'Christmas Day', country: 'USA', year: 2025 },

    // ── 2026 US Federal Holidays ──
    { date: '2026-01-01', name: "New Year's Day", country: 'USA', year: 2026 },
    { date: '2026-01-19', name: 'Martin Luther King Jr. Day', country: 'USA', year: 2026 },
    { date: '2026-02-16', name: "Presidents' Day", country: 'USA', year: 2026 },
    { date: '2026-05-25', name: 'Memorial Day', country: 'USA', year: 2026 },
    { date: '2026-06-19', name: 'Juneteenth National Independence Day', country: 'USA', year: 2026 },
    { date: '2026-07-03', name: 'Independence Day (Observed)', country: 'USA', year: 2026 }, // Jul 4 is Saturday
    { date: '2026-09-07', name: 'Labor Day', country: 'USA', year: 2026 },
    { date: '2026-10-12', name: 'Columbus Day', country: 'USA', year: 2026 },
    { date: '2026-11-11', name: 'Veterans Day', country: 'USA', year: 2026 },
    { date: '2026-11-26', name: 'Thanksgiving Day', country: 'USA', year: 2026 },
    { date: '2026-12-25', name: 'Christmas Day', country: 'USA', year: 2026 },

    // ── 2025 Canadian Federal Holidays ──
    { date: '2025-01-01', name: "New Year's Day", country: 'CAN', year: 2025 },
    { date: '2025-02-17', name: 'Family Day', country: 'CAN', year: 2025 },
    { date: '2025-04-18', name: 'Good Friday', country: 'CAN', year: 2025 },
    { date: '2025-05-19', name: 'Victoria Day', country: 'CAN', year: 2025 },
    { date: '2025-07-01', name: 'Canada Day', country: 'CAN', year: 2025 },
    { date: '2025-08-04', name: 'Civic Holiday', country: 'CAN', year: 2025 },
    { date: '2025-09-01', name: 'Labour Day', country: 'CAN', year: 2025 },
    { date: '2025-09-30', name: 'National Day for Truth and Reconciliation', country: 'CAN', year: 2025 },
    { date: '2025-10-13', name: 'Thanksgiving Day', country: 'CAN', year: 2025 },
    { date: '2025-11-11', name: 'Remembrance Day', country: 'CAN', year: 2025 },
    { date: '2025-12-25', name: 'Christmas Day', country: 'CAN', year: 2025 },
    { date: '2025-12-26', name: 'Boxing Day', country: 'CAN', year: 2025 },

    // ── 2026 Canadian Federal Holidays ──
    { date: '2026-01-01', name: "New Year's Day", country: 'CAN', year: 2026 },
    { date: '2026-02-16', name: 'Family Day', country: 'CAN', year: 2026 },
    { date: '2026-04-03', name: 'Good Friday', country: 'CAN', year: 2026 },
    { date: '2026-05-18', name: 'Victoria Day', country: 'CAN', year: 2026 },
    { date: '2026-07-01', name: 'Canada Day', country: 'CAN', year: 2026 },
    { date: '2026-08-03', name: 'Civic Holiday', country: 'CAN', year: 2026 },
    { date: '2026-09-07', name: 'Labour Day', country: 'CAN', year: 2026 },
    { date: '2026-09-30', name: 'National Day for Truth and Reconciliation', country: 'CAN', year: 2026 },
    { date: '2026-10-12', name: 'Thanksgiving Day', country: 'CAN', year: 2026 },
    { date: '2026-11-11', name: 'Remembrance Day', country: 'CAN', year: 2026 },
    { date: '2026-12-25', name: 'Christmas Day', country: 'CAN', year: 2026 },
    { date: '2026-12-28', name: 'Boxing Day (Observed)', country: 'CAN', year: 2026 }, // Dec 26 is Saturday
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO bank_holidays (date, name, country, year, is_federal) VALUES (?, ?, ?, ?, 1)`
  );
  for (const h of holidays) {
    stmt.run(h.date, h.name, h.country, h.year);
  }

  logger.info(`Seeded ${holidays.length} bank holidays`);
}

// Seed initial data
export function seedData() {
  logger.info('Seeding initial data...');

  // Check if admin user exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('john.murphy@gusto.com');

  if (!adminExists) {
    // Create admin user - John Murphy
    db.prepare(`
      INSERT INTO users (id, email, name, role, status, department, title)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'admin-001',
      'john.murphy@gusto.com',
      'John Murphy',
      'admin',
      'active',
      'IT',
      'System Administrator'
    );

    // Create team users
    const teamUsers = [
      ['user-001', 'sarah.chen@gusto.com', 'Sarah Chen', 'staff', 'active', 'Accounts Payable', 'AP Specialist', 50000],
      ['user-002', 'james.park@gusto.com', 'James Park', 'manager', 'active', 'Accounts Payable', 'AP Manager', 250000],
      ['user-003', 'maria.rodriguez@gusto.com', 'Maria Rodriguez', 'sr_manager', 'active', 'Accounts Payable', 'Senior AP Manager', 500000],
      ['user-004', 'linda.kim@gusto.com', 'Linda Kim', 'admin', 'active', 'Treasury', 'Treasury Manager', null],
      ['user-005', 'diego.torres@gusto.com', 'Diego Torres', 'admin', 'active', 'Treasury', 'CFO / Administrator', null],
      ['user-006', 'ming.huey@gusto.com', 'Ming Huey', 'admin', 'active', 'Treasury', 'Treasury Manager', null],
    ];

    const insertUser = db.prepare(`
      INSERT INTO users (id, email, name, role, status, department, title, payment_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of teamUsers) {
      insertUser.run(...user);
    }

    // Create bank accounts (with mock encrypted values)
    const accounts = [
      ['acct-001', 'Main Operating', 'Chase Bank', 'encrypted:****1234', 'encrypted:****5678', 'operating', 'USD', 1000000, 1, 100000],
      ['acct-002', 'Payroll Account', 'Chase Bank', 'encrypted:****2345', 'encrypted:****6789', 'payroll', 'USD', 500000, 1, 50000],
      ['acct-003', 'Wire Transfer', 'Bank of America', 'encrypted:****3456', 'encrypted:****7890', 'checking', 'USD', 2000000, 1, 0],
      ['acct-004', 'International', 'Citibank', 'encrypted:****4567', 'encrypted:****8901', 'checking', 'EUR', 1000000, 1, 50000],
    ];

    const insertAccount = db.prepare(`
      INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const account of accounts) {
      insertAccount.run(...account);
    }

    // Create routing rules
    const rules = [
      ['rule-001', 1, 'Small Payments (Under $10K)', 'Single approval for payments under $10,000', 'amount_range', null, null, 0, 9999.99, 1],
      ['rule-002', 2, 'Medium Payments ($10K-$50K)', 'Two approvals for payments $10,000 - $50,000', 'amount_range', null, null, 10000, 49999.99, 2],
      ['rule-003', 3, 'Large Payments ($50K-$250K)', 'Three approvals for payments $50,000 - $250,000', 'amount_range', null, null, 50000, 249999.99, 3],
      ['rule-004', 4, 'Executive Payments ($250K+)', 'Four approvals including CFO for payments over $250,000', 'amount_range', null, null, 250000, null, 4],
      ['rule-005', 5, 'Wire Transfers', 'All wire transfers require treasury approval', 'payment_type', null, 'wire', null, null, 2],
      ['rule-006', 6, 'International Payments', 'International account payments', 'account', 'acct-004', null, null, null, 3],
    ];

    const insertRule = db.prepare(`
      INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, num_approvers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const rule of rules) {
      insertRule.run(...rule);
    }

    // Create approval chains
    const chains = [
      ['rule-001', 1, 'manager'],
      ['rule-002', 1, 'manager'],
      ['rule-002', 2, 'sr_manager'],
      ['rule-003', 1, 'manager'],
      ['rule-003', 2, 'sr_manager'],
      ['rule-003', 3, 'admin'],
      ['rule-004', 1, 'manager'],
      ['rule-004', 2, 'sr_manager'],
      ['rule-004', 3, 'admin'],
      ['rule-004', 4, 'admin'],
      ['rule-005', 1, 'manager'],
      ['rule-005', 2, 'admin'],
      ['rule-006', 1, 'manager'],
      ['rule-006', 2, 'sr_manager'],
      ['rule-006', 3, 'admin'],
    ];

    const insertChain = db.prepare(`
      INSERT INTO approval_chains (rule_id, step, approver_role)
      VALUES (?, ?, ?)
    `);

    for (const chain of chains) {
      insertChain.run(...chain);
    }

    // Add some FX rates
    const fxRates = [
      ['EUR', 'USD', 1.08],
      ['GBP', 'USD', 1.26],
      ['CAD', 'USD', 0.74],
      ['AUD', 'USD', 0.65],
      ['JPY', 'USD', 0.0067],
      ['SGD', 'USD', 0.74],
    ];

    const insertFx = db.prepare(`
      INSERT OR REPLACE INTO fx_rates (base_currency, target_currency, rate)
      VALUES (?, ?, ?)
    `);

    for (const fx of fxRates) {
      insertFx.run(...fx);
    }

    // Create default groups
    const groups = [
      ['grp-treasury', 'Treasury', 'treasury', 'Treasury team — portal administrators with full access'],
      ['grp-payroll', 'Payroll', 'payroll', 'Payroll team — manages payroll-related payments'],
      ['grp-ap', 'Accounts Payable', 'accounts-payable', 'AP team — handles vendor and bill payments'],
      ['grp-accounting', 'Accounting', 'accounting', 'Accounting team — general ledger and reconciliation'],
      ['grp-payops', 'Payment Ops / Platform Accounting', 'payment-ops', 'Payment operations and platform accounting team'],
      ['grp-other', 'Other', 'other', 'Users not assigned to a specific department group'],
    ];

    const insertGroup = db.prepare(`
      INSERT INTO groups (id, name, slug, description) VALUES (?, ?, ?, ?)
    `);
    for (const group of groups) {
      insertGroup.run(...group);
    }

    // Assign seed users to groups
    const groupMembers = [
      ['grp-treasury', 'user-004'],  // Linda Kim → Treasury
      ['grp-treasury', 'user-006'],  // Ming Huey → Treasury
      ['grp-treasury', 'admin-001'], // John Murphy → Treasury
      ['grp-ap', 'user-001'],        // Sarah Chen → AP
      ['grp-ap', 'user-002'],        // James Park → AP
      ['grp-ap', 'user-003'],        // Maria Rodriguez → AP
    ];

    const insertGroupMember = db.prepare(`
      INSERT INTO group_members (group_id, user_id) VALUES (?, ?)
    `);
    for (const gm of groupMembers) {
      insertGroupMember.run(...gm);
    }

    // Assign accounts to groups
    const groupAccounts = [
      ['grp-treasury', 'acct-001', 'both', 'both'],   // Treasury → Main Operating (all)
      ['grp-treasury', 'acct-002', 'both', 'both'],   // Treasury → Payroll (all)
      ['grp-treasury', 'acct-003', 'both', 'both'],   // Treasury → Wire Transfer (all)
      ['grp-treasury', 'acct-004', 'both', 'both'],   // Treasury → International (all)
      ['grp-payroll', 'acct-002', 'from', 'internal'], // Payroll → Payroll Account (from, internal)
      ['grp-ap', 'acct-001', 'from', 'external'],     // AP → Main Operating (from, external)
      ['grp-ap', 'acct-003', 'from', 'external'],     // AP → Wire Transfer (from, external)
    ];

    const insertGroupAccount = db.prepare(`
      INSERT INTO group_accounts (group_id, account_id, direction, funding_type) VALUES (?, ?, ?, ?)
    `);
    for (const ga of groupAccounts) {
      insertGroupAccount.run(...ga);
    }

    // Seed user guide document
    const userGuideContent = `# Gusto Treasury Payment Tool
## User Guide
**Version:** 1.0 | **Last Updated:** ${new Date().toLocaleDateString()} | **Maintained by:** Treasury Admin

---

## 1. What Is This System?

The Gusto Treasury Payment Tool is an internal application that manages the full lifecycle of payment requests — from submission through multi-level approval to treasury execution. It replaces manual email-based payment workflows and provides a complete audit trail for SOX compliance.

---

## 2. User Roles

| Role | What You Can Do | Payment Limit |
|---|---|---|
| **AP Staff** | Submit payment requests only | Up to $50,000 |
| **AP Manager** | Submit payments + approve Level 1 | Up to $250,000 |
| **Sr. AP Manager** | Submit + approve Level 1 and 2 | Up to $500,000 |
| **Treasury** | Approve all levels + execute payments | Unlimited |
| **CFO** | Final approver + read-only dashboard | Unlimited |
| **Administrator** | Full system configuration | Unlimited |

---

## 3. How to Submit a Payment Request *(AP Staff / AP Manager)*

1. Log in at treasury.gusto.com
2. Click **"New Payment"** in the left sidebar
3. **Step 1 — Select Source Account:** Choose which Gusto bank account the payment comes from
4. **Step 2 — Payee & Amount:**
   - Select a saved payee or enter a new one
   - Enter the payment amount (USD or foreign currency)
   - The system will flag if a similar payment was made recently
5. **Step 3 — Settlement Details:** Enter bank routing number, account number, and beneficiary details based on payment type (ACH, Wire, Check, or Internal Transfer)
6. **Step 4 — Description:** Write a clear business justification (minimum 20 characters). Include invoice number, PO number, or contract reference
7. **Step 5 — Review Routing:** The system automatically shows you who will approve your payment based on the amount and account
8. Click **"Submit for Approval"**

**Tips:**
- Use **Payment Templates** for recurring vendors — saves time and reduces errors
- Attach the invoice or PO when possible — it speeds up approvals
- Check the **bank holiday calendar** before selecting an execution date

---

## 4. How Approval Routing Works

Payments are automatically routed based on amount:

| Amount | Approvers Required |
|---|---|
| Under $25,000 | 1 — AP Manager |
| $25,000 – $99,999 | 2 — AP Manager → Treasury |
| $100,000 – $499,999 | 3 — AP Manager → Sr. AP Manager → Treasury |
| $500,000 and above | 4 — AP Manager → Sr. AP Manager → Treasury → CFO |
| Payroll Account (any amount) | 2 — Treasury → CFO |
| Internal Transfer (any amount) | 1 — Treasury Manager |

Each approver is notified by email in sequence. The next approver is only notified after the previous one approves.

---

## 5. How to Approve a Payment *(AP Manager / Sr. AP Manager / Treasury / CFO)*

1. You will receive an email notification when a payment needs your approval
2. Click the link in the email OR log in and go to **"Pending Approvals"**
3. Review the payment details, justification, and any attached documents
4. Choose one of three actions:
   - ✅ **Approve** — forwards to the next approver in the chain
   - ↩ **Return for More Info** — sends back to requester with your comment
   - ❌ **Reject** — terminates the request with a reason
5. Add a comment if needed — all comments are visible to subsequent approvers

**Important:** If you do not take action within 24 hours, the request will be escalated to your manager automatically.

---

## 6. How to Execute Payments *(Treasury only)*

1. Go to **"Execution Queue"** in the left sidebar
2. Review all fully approved payments — routing numbers and account numbers are displayed for bank portal entry
3. Log into your bank portal (JPMorgan ACCESS, Wells Fargo CEO, etc.) and submit the payment
4. Return to the Treasury Tool and click **"Mark as Executed"**
5. Enter the **bank reference number** from your bank portal
6. A second treasury staff member must confirm the execution (dual control)
7. Payment status changes to **"Executed"** and the requester is notified

---

## 7. Tracking Your Payments

- Go to **"My Requests"** to see all payments you have submitted
- Click **"Track"** on any payment to see the full approval timeline
- You will receive email notifications at every stage change

---

## 7a. Selecting a Payment Account

When creating a payment, you will only see bank accounts that have been assigned to your role by the Treasury Administrator.

**What You'll See:**
- Account nickname (e.g., "Operating Account — JPMorgan")
- Bank name
- Last 4 digits of the account number (e.g., ••••1234)
- Daily payment limit for the account

**Important Notes:**
- Full account numbers are never displayed to users for security reasons
- Only Treasury and CFO roles have access to all payment accounts
- AP Staff typically see Operating and Vendor accounts only
- AP Managers may have access to additional accounts based on their responsibilities

**Account Access by Role:**

| Role | Default Account Access |
|---|---|
| **AP Staff** | Operating, Vendor Payments |
| **AP Manager** | Operating, Vendor Payments, Contractor |
| **Sr. AP Manager** | All except Payroll |
| **Treasury** | All accounts |
| **CFO** | All accounts (read-only) |

**Missing an Account?**
If you need access to an account that isn't showing in your dropdown, contact your Treasury Administrator at treasury-admin@gusto.com. They can update your account permissions.

---

## 8. Payment Templates

Save time on recurring payments:
1. Fill out a payment form completely
2. Click **"Save as Template"** at the top of the form
3. Give it a name (e.g., "Monthly AWS Invoice")
4. Next time — select it from the template dropdown and only update the amount/date

---

## 9. Foreign Currency Payments

1. Select the currency from the dropdown on the payment form
2. Enter either the foreign amount OR the USD equivalent — the system converts automatically
3. The USD equivalent is used for approval routing and limits
4. The actual exchange rate is locked at execution time by Treasury
5. A buffer of 0.5% is applied to the indicative rate

---

## 10. Security & Compliance

- **All actions are logged** in an immutable audit trail — nothing can be deleted or edited
- **Account numbers are masked** (shown as ••••1234) in all emails and logs
- **Session locks automatically** after 30 minutes of inactivity
- **2FA is required** on every login
- **Dual control** is required for all wire transfers and batch executions
- This system is SOX compliant — your approvals carry legal weight

---

## 11. Common Questions

**Q: My payment has been sitting at the same approval step for a while — what do I do?**
A: If no action is taken within 24 hours, the system escalates automatically. You can also contact the approver directly or reach out to treasury-admin@gusto.com.

**Q: I made a mistake on a submitted payment — can I edit it?**
A: You cannot edit a submitted payment. Click "Return for More Info" if you are an approver, or ask an approver to return it to you so you can resubmit with corrections.

**Q: Can I see payments submitted by others?**
A: AP Staff can only see their own payments. AP Managers and above can see all payments in their account scope.

**Q: What happens if I select a bank holiday as the execution date?**
A: The system will automatically flag the date and suggest the next valid business day.

**Q: Who do I contact if I can't log in?**
A: Contact treasury-admin@gusto.com or your IT help desk.

---

## 12. Getting Help

| Issue | Contact |
|---|---|
| Can't log in / access issues | treasury-admin@gusto.com |
| Payment stuck in approval | Your AP Manager or treasury-admin@gusto.com |
| Incorrect payment details | Return the payment and resubmit |
| System errors or bugs | IT Help Desk |
| Questions about limits or roles | Treasury Admin |

---

*This guide is automatically updated when system changes are made. The version in the platform is always the most current.*

*Gusto Treasury Team · Internal Use Only · Do not distribute outside Gusto*
`;

    db.prepare(`
      INSERT INTO documents (id, slug, title, content, version, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'doc-user-guide',
      'user-guide',
      'User Guide',
      userGuideContent,
      1,
      'admin-001'
    );

    // Also insert the first version into document_versions
    db.prepare(`
      INSERT INTO document_versions (document_id, version, title, content, updated_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'doc-user-guide',
      1,
      'User Guide',
      userGuideContent,
      'admin-001'
    );

    logger.info('Demo data seeded successfully');
  } else {
    logger.info('Data already exists, skipping seed');
  }
}

// Query helper that matches the pg interface
export function query<T = any>(
  text: string,
  params?: any[]
): { rows: T[]; rowCount: number } {
  try {
    // Convert PostgreSQL-style $1, $2 params to SQLite ? params
    // Important: $N are positional by number, but SQLite ? are sequential by appearance.
    // We must reorder the params array to match the order $N appears in the SQL text.
    let sqliteQuery = text;
    let orderedParams = params;
    if (params && params.length > 0) {
      const reordered: any[] = [];
      sqliteQuery = text.replace(/\$(\d+)/g, (_match, num) => {
        reordered.push(params[parseInt(num, 10) - 1]);
        return '?';
      });
      orderedParams = reordered;
    }

    // Determine if the query returns rows (SELECT, or INSERT/UPDATE/DELETE with RETURNING)
    const trimmed = sqliteQuery.trim().toUpperCase();
    const returnsRows = trimmed.startsWith('SELECT') || /\bRETURNING\b/i.test(sqliteQuery);

    if (returnsRows) {
      const stmt = db.prepare(sqliteQuery);
      const rows = orderedParams ? stmt.all(...orderedParams) : stmt.all();
      return { rows: rows as T[], rowCount: rows.length };
    } else {
      const stmt = db.prepare(sqliteQuery);
      const result = orderedParams ? stmt.run(...orderedParams) : stmt.run();
      return { rows: [] as T[], rowCount: result.changes };
    }
  } catch (error) {
    logger.error('SQLite query error', { text: text.substring(0, 100), error: (error as Error).message });
    throw error;
  }
}

// Transaction helper that matches the pg pool transaction interface
// The callback receives a client with a query() method, same as PostgreSQL pool.connect()
export async function transaction<T = void>(
  callback: (client: { query: typeof query }) => Promise<T>
): Promise<T> {
  db.exec('BEGIN');
  try {
    const result = await callback({ query });
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Health check
export function healthCheck(): boolean {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

// Shutdown
export function shutdown(): void {
  logger.info('Closing SQLite database...');
  db.close();
  logger.info('SQLite database closed');
}
