-- Gusto Treasury Portal — Database Export
-- Generated: 2026-03-27T20:53:20.413Z
-- Use this script to recreate the database on a local dev machine
-- Run: sqlite3 treasury.db < scripts/db-export.sql

PRAGMA foreign_keys = OFF;

-- Table: access_requests
DROP TABLE IF EXISTS access_requests;
CREATE TABLE access_requests (
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

-- Table: account_access_audit_log
DROP TABLE IF EXISTS account_access_audit_log;
CREATE TABLE account_access_audit_log (
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
    );

-- Table: accounts
DROP TABLE IF EXISTS accounts;
CREATE TABLE accounts (
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
    , sort_order INTEGER DEFAULT 100);

INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-001', 'Main Operating', 'Chase Bank', 'encrypted:****1234', 'encrypted:****5678', 'operating', 'USD', 1000000, 1, 100000, 'above_threshold', 1, '2026-03-16 15:38:15', '2026-03-16 15:38:15', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-002', 'Payroll Account', 'Chase Bank', 'encrypted:****2345', 'encrypted:****6789', 'payroll', 'USD', 500000, 1, 50000, 'above_threshold', 1, '2026-03-16 15:38:15', '2026-03-16 15:38:15', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-003', 'Wire Transfer', 'Bank of America', 'encrypted:****3456', 'encrypted:****7890', 'checking', 'USD', 2000000, 1, 0, 'above_threshold', 1, '2026-03-16 15:38:15', '2026-03-16 15:38:15', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-004', 'International', 'Citibank', 'encrypted:****4567', 'encrypted:****8901', 'checking', 'EUR', 1000000, 1, 50000, 'above_threshold', 1, '2026-03-16 15:38:15', '2026-03-16 15:38:15', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-jpm-9811', 'JPM Corporate Master -9811', 'JPMorgan Chase', 'encrypted:****9811', 'encrypted:****0001', 'operating', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-16 15:38:15', '2026-03-16 15:38:15', 1);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-9329', 'Chase AP -9329 (Gusto)', 'JPMorgan Chase', 'encrypted:****9329', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-9829', 'Chase Wire In -9829 (Gusto)', 'JPMorgan Chase', 'encrypted:****9829', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-8961', 'Chase ZPI -8961 (ZPI)', 'JPMorgan Chase', 'encrypted:****8961', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-9392', 'Chase Operating -9392 (Ardius)', 'JPMorgan Chase', 'encrypted:****9392', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-3962', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'JPMorgan Chase', 'encrypted:****3962', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0566', 'Chase Internal Payroll Checking -0566 (Gusto)', 'JPMorgan Chase', 'encrypted:****0566', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-7908', 'Chase Customer Deposits -7908 (Gusto)', 'JPMorgan Chase', 'encrypted:****7908', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-9378', 'Chase Billings -9378 (Gusto)', 'JPMorgan Chase', 'encrypted:****9378', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0226', 'Chase Deposits -0226 (Gusto)', 'JPMorgan Chase', 'encrypted:****0226', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-6826', 'JPMC MMF -6826', 'JPMorgan Chase', 'encrypted:****6826', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0497', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'PNC', 'encrypted:****0497', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-7987', 'SVB Cigna -7987 (Gusto)', 'Silicon Valley Bank', 'encrypted:****7987', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0446', 'PNC Corporate -0446 (Gusto)', 'PNC', 'encrypted:****0446', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-5947', 'Garanti BBVA Turkey USD -5947', 'Garanti BBVA', 'encrypted:****5947', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0269', 'Chase Tax Payment -0269 (Gusto)', 'JPMorgan Chase', 'encrypted:****0269', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-2155', 'PNC Customer Master -2155 (Gusto)', 'PNC', 'encrypted:****2155', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-2378', 'Gusto Inc -2378 (JPM)', 'JPMorgan Chase', 'encrypted:****2378', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-5119', 'Chase 3rd Party Processors -5119', 'JPMorgan Chase', 'encrypted:****5119', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-9803', 'Chase Recovery Ops -9803 (Gusto)', 'JPMorgan Chase', 'encrypted:****9803', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-5843', 'GH Program -5843', 'JPMorgan Chase', 'encrypted:****5843', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-6428', 'Gusto Inc -6428 (PNC)', 'PNC', 'encrypted:****6428', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-0673', 'Instant Payroll -0673 (NBKC)', 'NBKC', 'encrypted:****0673', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-8375', 'Chase Gusto Platform Mexico -8375', 'JPMorgan Chase', 'encrypted:****8375', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_threshold, dual_control_mode, is_active, created_at, updated_at, sort_order) VALUES ('acct-1602', 'Chase Checking -1602 (Gusto Canada ULC)', 'JPMorgan Chase', 'encrypted:****1602', 'encrypted:****0000', 'checking', 'USD', 50000000, 1, 0, 'above_threshold', 1, '2026-03-17 14:21:56', '2026-03-17 14:21:56', 100);

-- Table: approval_chains
DROP TABLE IF EXISTS approval_chains;
CREATE TABLE approval_chains (
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

INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('cf50602226126bb7306de290a630803e', 'rule-001', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('e0803e084695fa335e9da0852c56754b', 'rule-002', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('22f7a7a72a80cbce6de94ccab7aad38b', 'rule-002', 2, 'sr_manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('d486c9abfb168e66aa5769d78e4fb3c6', 'rule-003', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('66d364148d2aecf59590d061d730f165', 'rule-003', 2, 'sr_manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('6e2ba939720a006ecc828ab54954d62f', 'rule-003', 3, 'admin', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('a81ab338ed6442dee2afd255f5b5afba', 'rule-004', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('f3b434ab0a9e0c1c3d65a2a17eff2055', 'rule-004', 2, 'sr_manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('8f1f1045c43dc8e13429edeff1c8d91e', 'rule-004', 3, 'admin', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('d8b6e5011d7465421ef1b38385c53963', 'rule-004', 4, 'admin', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('1d854446e277069f67ab1556eb61131b', 'rule-005', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('1185d005582d1d4c4d42a9a5af271d88', 'rule-005', 2, 'admin', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('efef3cd2dc3b2d05becf19948c058927', 'rule-006', 1, 'manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('b3c2a3b8d39b2d16e74422d321d6dd1d', 'rule-006', 2, 'sr_manager', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');
INSERT INTO approval_chains (id, rule_id, step, approver_role, specific_approver_id, escalation_hours, escalation_role, escalation_user_id, created_at) VALUES ('3776402e88b2352739a9627e5971f1c0', 'rule-006', 3, 'admin', NULL, 24, NULL, NULL, '2026-03-18 17:11:17');

-- Table: approval_comments
DROP TABLE IF EXISTS approval_comments;
CREATE TABLE approval_comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL REFERENCES payments(id),
      approval_id TEXT REFERENCES payment_approvals(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      comment TEXT NOT NULL,
      is_internal INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

-- Table: audit_log
DROP TABLE IF EXISTS audit_log;
CREATE TABLE audit_log (
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

INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ffd49e1b26bfdaa1c382df963a379a3f', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773853888210-mcgw8apb4mo', NULL, '2026-03-18 17:11:28');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('7c6c3c9e27899ffab37d231dae7b7829', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773853977970-xo7mdxu8zxo', NULL, '2026-03-18 17:12:58');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('1b04e16c1b7d40d44ece7d59b79faae7', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773854726367-c94e7g1cxif', NULL, '2026-03-18 17:25:26');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('24ffd66b14a7456a2e19be2949d1ec0f', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773855912267-asys6nrdj2s', NULL, '2026-03-18 17:45:12');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('01007798db58475e6d161c01519bfe67', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773866674470-oi4eg4l1vqn', NULL, '2026-03-18 20:44:34');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('cae7e2235fac9466c8f0fbcf3db452d9', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773867184662-s06b2038spb', NULL, '2026-03-18 20:53:04');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a09a039dd28458ea0d97830029dd9a70', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773869860424-xgq65m4yfz', NULL, '2026-03-18 21:37:40');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('98850ce0b84aba65de40a8630400ed07', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773870044338-ez073engqlk', NULL, '2026-03-18 21:40:44');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('f04e0827d05abb206a50c245623fd92c', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773870131949-jqq2h4af29s', NULL, '2026-03-18 21:42:11');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('53914e21ace8469b63041460b43fe75f', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773870193993-j3s38ijp9id', NULL, '2026-03-18 21:43:14');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('3331d3f8d9c87b047eb2564429810f64', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773870406327-7tqdgw0uo6c', NULL, '2026-03-18 21:46:46');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('d4a5175f47c6a4db40734307d42687c0', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773870525197-0wgaj9lzbsqq', NULL, '2026-03-18 21:48:45');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a7d58cb2af470710497170ac44567ad3', 'admin-001', 'john.murphy@gusto.com', 'PAYMENT_CREATED', 'payments', '62153b5fb0346b3c48e35d1d8eafa5c7', NULL, '{"referenceNumber":null,"initiatorName":"John Murphy","initiatorGroup":"Treasury","payeeName":"test today","amount":13147.62,"currency":"USD","paymentType":"ach","originationAccountId":"acct-6428","destinationAccountId":"acct-9803","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-18 21:51:16');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ffb49527dbc8bd10f03499fb44483847', 'admin-001', 'john.murphy@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '62153b5fb0346b3c48e35d1d8eafa5c7', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Payment Ops / Platform Accounting (1 approver)","groupId":"grp-payops","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-18 21:51:16');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('c0b91befaf219689a438d2771f28db54', 'admin-001', 'john.murphy@gusto.com', 'PAYMENT_CREATED', 'payments', '5c9d233d1fd1b7924e68c80c64b7e8d5', NULL, '{"referenceNumber":null,"initiatorName":"John Murphy","initiatorGroup":"Treasury","payeeName":"johnny murphy","amount":37.42,"currency":"USD","paymentType":"ach","originationAccountId":"acct-0566","destinationAccountId":null,"fundingType":"external"}', NULL, NULL, NULL, NULL, '2026-03-18 21:52:40');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('c57e7c9cfb8ff7665fb5f72668ba8cd7', 'admin-001', 'john.murphy@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '5c9d233d1fd1b7924e68c80c64b7e8d5', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Payroll (1 approver)","groupId":"grp-payroll","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-18 21:52:40');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('e51927ec51bc3684df30b8b029b15280', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1773870525197-0wgaj9lzbsqq', NULL, '2026-03-18 21:53:29');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ce338da579fde514569378be3afafa31', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773871766782-strnxlqv4b', NULL, '2026-03-18 22:09:26');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('2341a23b9bd58a2eb12d7b8f816ef20c', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1773871766782-strnxlqv4b', NULL, '2026-03-18 22:36:57');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6cf65b60b8dcb55d832700dad2d6a0f2', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-nahla-wardeh-1773873426856-t672wndnb1o', NULL, '2026-03-18 22:37:06');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6a4ebb7e8bbaa2a7da28ab8e5929e443', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'PAYMENT_CREATED', 'payments', '92d04f8d263ff0f6fd06ab9e0d582e52', NULL, '{"referenceNumber":null,"initiatorName":"Nahla Wardeh","initiatorGroup":"Other","payeeName":"tax testing ","amount":47365,"currency":"USD","paymentType":"ach","originationAccountId":"acct-8961","destinationAccountId":"acct-8961","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-18 22:37:54');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6f1726ff0c0ca213b81a72e4baafb850', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '92d04f8d263ff0f6fd06ab9e0d582e52', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Accounts Payable (1 approver)","groupId":"grp-ap","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-18 22:37:54');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('5b489ed73eb9fbb4d0122a13b2e0e2b4', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-nahla-wardeh-1773873426856-t672wndnb1o', NULL, '2026-03-18 22:37:58');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('aba820ccfae025e267af6da34cef4281', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773873483530-umxbciz4ohk', NULL, '2026-03-18 22:38:03');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('155da8b2da075bc467a17aa0436007e3', 'admin-001', 'john.murphy@gusto.com', 'ACCOUNT_UPDATED', 'group_accounts', 'grp-other', NULL, '{"accounts":[{"accountId":"acct-9329","direction":"both","fundingType":"both"},{"accountId":"acct-0566","direction":"both","fundingType":"both"},{"accountId":"acct-8961","direction":"both","fundingType":"both"},{"accountId":"acct-jpm-9811","direction":"both","fundingType":"both"},{"accountId":"acct-0269","direction":"both","fundingType":"both"}]}', NULL, NULL, NULL, NULL, '2026-03-18 22:39:15');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('851be8266a473c6462d6ee5c21f53334', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1773873483530-umxbciz4ohk', NULL, '2026-03-18 22:39:21');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('4cca4019d94797a3a3db269bf825fae1', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-nahla-wardeh-1773873571223-o13k34a3ss', NULL, '2026-03-18 22:39:31');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a1179b0bed1ea6d1141015ba0972f187', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773874720860-5pnqevi98ci', NULL, '2026-03-18 22:58:40');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('d20d91c8b95611cd714f547db59780c0', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773874722963-7e3hy47mf17', NULL, '2026-03-18 22:58:42');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('b717b367d88c9466b4561b530a3ff2b9', 'admin-001', 'john.murphy@gusto.com', 'ACCOUNT_UPDATED', 'group_accounts', 'grp-other', NULL, '{"accounts":[{"accountId":"acct-9329","direction":"both","fundingType":"both"},{"accountId":"acct-8961","direction":"both","fundingType":"both"},{"accountId":"acct-0566","direction":"both","fundingType":"both"}]}', NULL, NULL, NULL, NULL, '2026-03-18 23:14:53');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('87c592ffdd0dd3db53a9f667e5f43932', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-nahla-wardeh-1773875899320-jr1g26akhdn', NULL, '2026-03-18 23:18:19');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6d01962352a20ae15ab2e0b09c3c3b96', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'PAYMENT_CREATED', 'payments', '4850162874f172b52457f26196b054ea', NULL, '{"referenceNumber":null,"initiatorName":"Nahla Wardeh","initiatorGroup":"Other","payeeName":"new payee","amount":12,"currency":"USD","paymentType":"ach","originationAccountId":"acct-0566","destinationAccountId":"acct-9329","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-18 23:18:56');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('7caddd3e8c7a1fea08fbdfb1169c39cb', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '4850162874f172b52457f26196b054ea', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Accounts Payable (1 approver)","groupId":"grp-ap","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-18 23:18:56');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('d811d93484d0057d6569145d1cdf0f51', 'user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-nahla-wardeh-1773875899320-jr1g26akhdn', NULL, '2026-03-18 23:18:59');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6fade63c7cb281e0b12a0d7afa4d9229', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773875947252-cn9n1xkvps6', NULL, '2026-03-18 23:19:07');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('876f1f6576936a8232b5bffbf27fbd45', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773921840002-gvbfgka4r7g', NULL, '2026-03-19 12:04:00');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('b087311b07a94b4fc88cfd9ee86f4dc2', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773924570244-5aa6xyg865q', NULL, '2026-03-19 12:49:30');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('cb76648888532960bfe0eababede8bc5', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773927056360-389w3dyfp3v', NULL, '2026-03-19 13:30:56');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('13b48b17e697dc6f86168007b09108a1', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773927964814-trv6jwjc1bc', NULL, '2026-03-19 13:46:04');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('538237103c6e475dc824f42965b92300', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773928065134-5beklss32j7', NULL, '2026-03-19 13:47:45');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('2da69b5ac2ae7f2dc6ce3a988da4a28c', 'user-colin-robbins', 'colin.robbins@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-colin-robbins-1773931298323-j47n291ex5s', NULL, '2026-03-19 14:41:38');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('7fb055d200e1df30676871012458295d', 'user-colin-robbins', 'colin.robbins@gusto.com', 'PAYMENT_CREATED', 'payments', 'a6cdcb7198b11a51474a6309f4a83437', NULL, '{"referenceNumber":null,"initiatorName":"Colin Robbins","initiatorGroup":"Payroll","payeeName":"gusto","amount":47.23,"currency":"USD","paymentType":"internal","originationAccountId":"acct-0566","destinationAccountId":"acct-jpm-9811","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-19 14:42:16');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6afca2be9276c37d200211b72fab3ad4', 'user-colin-robbins', 'colin.robbins@gusto.com', 'PAYMENT_SUBMITTED', 'payments', 'a6cdcb7198b11a51474a6309f4a83437', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Payroll (1 approver)","groupId":"grp-payroll","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-19 14:42:16');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('1fa0073588cbb037b682c5396c46ac36', 'user-colin-robbins', 'colin.robbins@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-colin-robbins-1773931298323-j47n291ex5s', NULL, '2026-03-19 14:42:22');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('22cb2c5d198d8c4efb9c4c9c4df8cdb4', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-kc-deatsch-1773931359790-ny6yx0gkqw', NULL, '2026-03-19 14:42:39');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a6436d521ebc845bbe9ae5c1b7f35f56', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_APPROVED', 'payment_approvals', '50c5e739509074379e8c791fe00028e6', NULL, '{"paymentId":"a6cdcb7198b11a51474a6309f4a83437","approverName":"KC Deatsch","approverGroup":"Accounting, Payroll","approvalSequence":"Step 1 of 1","step":1}', '127.0.0.1', NULL, NULL, NULL, '2026-03-19 14:42:53');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('5b577b201dffa4c1d1d544614554d5e5', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_REJECTED', 'payment_approvals', '7fb3c712058f99bec8090a1b37926116', NULL, '{"paymentId":"9d55262eceed4a4be77cb7afa25b054c","rejectorName":"KC Deatsch","reason":"need more info","step":1}', '127.0.0.1', NULL, NULL, NULL, '2026-03-19 14:42:59');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('bde7964e2a9c953c564c57f4bfc57430', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-kc-deatsch-1773931359790-ny6yx0gkqw', NULL, '2026-03-19 14:45:26');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ababc5aaab80ca755402c3ab4cedfc2a', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773931533316-i66qz91wja', NULL, '2026-03-19 14:45:33');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('c471aafbc44f7f097221579d480ec617', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773945918199-m2zhj0q2lvl', NULL, '2026-03-19 18:45:18');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('84cdb8a928279c727e664214e7b521ab', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773946398694-4w7iuao1t9e', NULL, '2026-03-19 18:53:18');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a42cf55c0b044d85e6b9747a4b26a1fe', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773946558495-4nki3lg8fzx', NULL, '2026-03-19 18:55:58');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('fe697fb9f8f5c9d051670e6a7ee52303', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773946626745-lflt0a4cix', NULL, '2026-03-19 18:57:06');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('d1132b0a1197d1dd8370c7aaf0668b98', 'admin-001', 'john.murphy@gusto.com', 'USER_CREATED', 'users', '5b5e0165d458765c2f4dda8b2a9d6d50', NULL, '{"id":"5b5e0165d458765c2f4dda8b2a9d6d50","email":"will.ott@gusto.com","name":"Will Ott","role":"sr_manager","status":"active","workday_id":null,"title":"Employee","department":null,"cost_center":null,"manager_name":null,"manager_email":null,"pe_partner_name":null,"pe_partner_email":null,"payment_limit":500000,"last_login_at":null,"created_at":"2026-03-19 18:57:54","updated_at":"2026-03-19 18:57:54","groupIds":["grp-accounting"]}', NULL, NULL, NULL, NULL, '2026-03-19 18:57:54');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('8b1b4cc7952eda8943c843259ff20ae3', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1773946626745-lflt0a4cix', NULL, '2026-03-19 18:58:24');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('8e711b6d4d801a26ca9877ce4e5b5d0a', '5b5e0165d458765c2f4dda8b2a9d6d50', 'will.ott@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, '5b5e0165d458765c2f4dda8b2a9d6d50-1773946712174-k2p0tscxgc', NULL, '2026-03-19 18:58:32');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a3bbbd2c1c2b2426de4ff73e96a24388', '5b5e0165d458765c2f4dda8b2a9d6d50', 'will.ott@gusto.com', 'PAYMENT_CREATED', 'payments', '40cb5c98f71f685c6701261c88de28e8', NULL, '{"referenceNumber":null,"initiatorName":"Will Ott","initiatorGroup":"Accounting","payeeName":"gusto","amount":12.32,"currency":"USD","paymentType":"ach","originationAccountId":"acct-0226","destinationAccountId":"acct-2155","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-19 18:59:12');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('dbca1c71f246ffd3bf684c6f20d3396f', '5b5e0165d458765c2f4dda8b2a9d6d50', 'will.ott@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '40cb5c98f71f685c6701261c88de28e8', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Accounting (1 approver)","groupId":"grp-accounting","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-19 18:59:12');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('4189956491b933ce1072dfe812994258', '5b5e0165d458765c2f4dda8b2a9d6d50', 'will.ott@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, '5b5e0165d458765c2f4dda8b2a9d6d50-1773946712174-k2p0tscxgc', NULL, '2026-03-19 18:59:17');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('add659aa7adf4566f8070b2cfe29d64b', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1773946767910-ivmz5qo5b', NULL, '2026-03-19 18:59:27');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('bed5287b5329cb1b6e230c25eeb43f51', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774008247620-5s0jorwqtg9', NULL, '2026-03-20 12:04:07');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('f6287b8d0944f886a4ee8bed5884c203', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774010022354-eo227959z66', NULL, '2026-03-20 12:33:42');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('afca944633ab4e57c02ad629c2bbebdc', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774010846190-4atkfeox22m', NULL, '2026-03-20 12:47:26');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('8a80f32dd19ac9866dacf1dadfce72c9', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774010863485-d1w0a6w6zna', NULL, '2026-03-20 12:47:43');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ded614360cea31bcea6f350223238d93', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774010864074-sd3f2mewwh', NULL, '2026-03-20 12:47:44');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('fcf3b19ea7f5ba6c30c0c53eb7d6edc9', 'admin-001', 'john.murphy@gusto.com', 'EXECUTION_CONFIRMED', 'execution_confirmations', 'a6cdcb7198b11a51474a6309f4a83437', NULL, '{"executedBy":"John Murphy","executedByUserId":"admin-001","bankReference":"TEST-REF-123456","actualAmount":47.23,"paymentId":"a6cdcb7198b11a51474a6309f4a83437"}', '127.0.0.1', NULL, NULL, NULL, '2026-03-20 12:48:09');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('9fa11fe4aecd577e4faf80dbebb2ff43', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774011305824-pqqivkl6dgq', NULL, '2026-03-20 12:55:05');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('7740d67ec981b99742b7696872da1cb0', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774011353555-iq75p3jds', NULL, '2026-03-20 12:55:53');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('192825feaa6945ab2717091287fcd6fd', 'admin-001', 'john.murphy@gusto.com', 'EXECUTION_CONFIRMED', 'execution_confirmations', 'ff38c3c317ee2ac8d926be6d1b3dbe3a', NULL, '{"executedBy":"John Murphy","executedByUserId":"admin-001","bankReference":"WIRE-REF-987654","actualAmount":13.13,"paymentId":"ff38c3c317ee2ac8d926be6d1b3dbe3a"}', '127.0.0.1', NULL, NULL, NULL, '2026-03-20 12:55:54');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('f69b95926c612e450e8b778bf2ecb1fc', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774033991483-ki3nj3t755f', NULL, '2026-03-20 19:13:11');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('9e83340d23d751c39226fd4d4a7267ed', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1774033991483-ki3nj3t755f', NULL, '2026-03-20 19:36:19');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('825a0143f6d156cf7ea7936f164fa2f5', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774035389856-x28wh7dxpxi', NULL, '2026-03-20 19:36:29');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('c115444f29275ef45c1d8619a26a2358', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1774035389856-x28wh7dxpxi', NULL, '2026-03-20 19:39:20');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('75ea7c05dd8521779e44f520e68b9900', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-kc-deatsch-1774035572420-wfxlq1ty33e', NULL, '2026-03-20 19:39:32');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('1cb76ef138ad0d2479f8289b0a110fbb', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_CREATED', 'payments', '017e5ad3286d88aeb9e14c0276453f5c', NULL, '{"referenceNumber":null,"initiatorName":"KC Deatsch","initiatorGroup":"Accounting, Payroll","payeeName":"bobby and ming","amount":38.42,"currency":"USD","paymentType":"ach","originationAccountId":"acct-0497","destinationAccountId":"acct-8375","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-20 19:40:48');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('eed0fb89d68a8155ddb065f0fc3a293f', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '017e5ad3286d88aeb9e14c0276453f5c', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Payroll (1 approver)","groupId":"grp-payroll","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-20 19:40:48');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('a2838768c131a25ecef64dd3f4771c45', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-kc-deatsch-1774035572420-wfxlq1ty33e', NULL, '2026-03-20 19:40:50');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('4463b43aa97aec4a0b8d1a34f0904db5', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774035657278-naheyt0nfcc', NULL, '2026-03-20 19:40:57');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('5fa015769e66acf77d5cf17d732e4354', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774275624002-5rei1txqszc', NULL, '2026-03-23 14:20:24');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('f5a87e282004845013b0db49bc5d9b39', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774279615060-63petfm76ks', NULL, '2026-03-23 15:26:55');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('6b8b8edf006bcdc6dd18f9e6e8d0043a', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774279933447-3gheg3zrkxa', NULL, '2026-03-23 15:32:13');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('30f264d825bee58ab70c02df949b917f', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'admin-001-1774279933447-3gheg3zrkxa', NULL, '2026-03-23 15:34:34');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('337a887ffb3498c83bdc6d9901cac43d', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774280083230-wgz9aoq36n', NULL, '2026-03-23 15:34:43');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('805db79c646e48f53e910ca381fef7f7', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774280264547-mu6do6khtio', NULL, '2026-03-23 15:37:44');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('27204393887e932db69dbb1be00e7ec4', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774280322967-j8y08uhaw2k', NULL, '2026-03-23 15:38:42');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('b5c0d5a258e2fce50f026a2e2d93721e', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774280396662-18pm1l9mur4', NULL, '2026-03-23 15:39:56');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('ed815e23671f62b2961194be23ee57dd', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774281685350-nbft3sgrh9q', NULL, '2026-03-23 16:01:25');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('88350222bf874295627700c13661de8e', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774294114829-suq77o36m4g', NULL, '2026-03-23 19:28:34');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('39d1e7996ca81ccebc6ebb97fa7b4aef', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'user-kc-deatsch-1774318482228-xv3yxdex33', NULL, '2026-03-24 02:14:42');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('2302fc1a3e48c09c804c2ef51093749a', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_CREATED', 'payments', '015a110328cb06840b258ce45b5f35a1', NULL, '{"referenceNumber":null,"initiatorName":"KC Deatsch","initiatorGroup":"Accounting, Payroll","payeeName":"new person","amount":3333.33,"currency":"USD","paymentType":"ach","originationAccountId":"acct-7987","destinationAccountId":"acct-0269","fundingType":"internal"}', NULL, NULL, NULL, NULL, '2026-03-24 02:15:20');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('66fbb70984c1bd0adb84b3aaf8e3a1cd', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'PAYMENT_SUBMITTED', 'payments', '015a110328cb06840b258ce45b5f35a1', NULL, '{"status":"pending_approval","resubmittedAfterReturn":false,"approvalRule":"Accounting (1 approver)","groupId":"grp-accounting","totalApprovalSteps":1}', NULL, NULL, NULL, NULL, '2026-03-24 02:15:20');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('c28b0f19207a485bf8cede0ba1c4e909', 'user-kc-deatsch', 'kc.deatsch@gusto.com', 'USER_LOGOUT', NULL, NULL, NULL, NULL, NULL, NULL, 'user-kc-deatsch-1774318482228-xv3yxdex33', NULL, '2026-03-24 02:15:23');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('8e34df46595bf4338ca34b81d16a0ae7', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774318532632-79dvhhcabii', NULL, '2026-03-24 02:15:32');
INSERT INTO audit_log (id, user_id, user_email, action, table_name, record_id, old_values, new_values, ip_address, user_agent, session_id, request_id, timestamp) VALUES ('5587eedcb9464ed691af5bde2d35521d', 'admin-001', 'john.murphy@gusto.com', 'USER_LOGIN', NULL, NULL, NULL, NULL, '127.0.0.1', NULL, 'admin-001-1774643629683-utzlr1glkbm', NULL, '2026-03-27 20:33:49');

-- Table: bank_confirmations
DROP TABLE IF EXISTS bank_confirmations;
CREATE TABLE bank_confirmations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT,
      account_id TEXT,
      bank_name TEXT NOT NULL,
      confirmation_type TEXT NOT NULL,
      confirmation_reference TEXT,
      confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_by_user_id TEXT NOT NULL,
      confirmed_by_name TEXT NOT NULL,
      confirmation_notes TEXT,
      amount REAL,
      currency TEXT DEFAULT 'USD',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

-- Table: bank_holidays
DROP TABLE IF EXISTS bank_holidays;
CREATE TABLE bank_holidays (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      country TEXT DEFAULT 'USA',
      year INTEGER NOT NULL,
      is_federal INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, country)
    );

INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('c6ca8e32be15e32339ce5bee6f5fcd08', '2025-01-01', 'New Year''s Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('90ab77132b173c0cfec41b2f5500982f', '2025-01-20', 'Martin Luther King Jr. Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('23c066ca5a70e398f3d3c3917bcadcd8', '2025-02-17', 'Presidents'' Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('9d9bcec48e841a800a34933c4404f954', '2025-05-26', 'Memorial Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('16e847cfd43d0b0719d1d73b52dc20eb', '2025-06-19', 'Juneteenth National Independence Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('a5b6fa17f43b97d1b73a0628dcb19e4c', '2025-07-04', 'Independence Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('14d79a55eec4925a7f321f25174b5a4a', '2025-09-01', 'Labor Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('48c50115dc0913711fba4afe4eeca436', '2025-10-13', 'Columbus Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('3d69c86b7721f068828d64c46832d9a8', '2025-11-11', 'Veterans Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('ff5398ff8bd058273d10e6706553e368', '2025-11-27', 'Thanksgiving Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('a06d706507cf03931d3ff15fd99a5a9e', '2025-12-25', 'Christmas Day', 'USA', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('84e295d7264257f9620b7b9ba5a99fec', '2026-01-01', 'New Year''s Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('f8be7d7e8d8fef27c5a2e561cd664a63', '2026-01-19', 'Martin Luther King Jr. Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('c763a739f84c5e14cd9134f3550158e0', '2026-02-16', 'Presidents'' Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('5327c622fb93075c4debe95ae5489460', '2026-05-25', 'Memorial Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('a611ad62c1d9eff71a95a88707e3423e', '2026-06-19', 'Juneteenth National Independence Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('dbe6db7edd61bb30ffb78127acd30c6d', '2026-07-03', 'Independence Day (Observed)', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('1cea5016ee8aed51e9cce4ea042401f6', '2026-09-07', 'Labor Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('ca54ea7d8d068a86e9aed01960f5e815', '2026-10-12', 'Columbus Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('f2aaa55bb47ab143326a40fa034c8f83', '2026-11-11', 'Veterans Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('dd2967df47f52c5d1117f12577e0c24a', '2026-11-26', 'Thanksgiving Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('9ce634f45601fd9ac81aaa90ce26c605', '2026-12-25', 'Christmas Day', 'USA', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('9f106acafbb5d3773e642f34dfb87dbc', '2025-01-01', 'New Year''s Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('333905b066314ed61e49a73eae6f0128', '2025-02-17', 'Family Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('4427d837f693d646837b7df66b5b306a', '2025-04-18', 'Good Friday', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('f77f9ac248e155bdd0ece5c1eba139f2', '2025-05-19', 'Victoria Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('869e474284aa0bf5f54728023e96546b', '2025-07-01', 'Canada Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('d99236c924b4a9b4cf642170af41216d', '2025-08-04', 'Civic Holiday', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('79a6be0aabfae014da35fe1894c5ed7a', '2025-09-01', 'Labour Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('2c96d41e9660dc4c321555c6d573fb7d', '2025-09-30', 'National Day for Truth and Reconciliation', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('ba4d3d1c3cfc45647350d48762344e5b', '2025-10-13', 'Thanksgiving Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('b7ef6bcaf6df9f18709d9ba380d9a989', '2025-11-11', 'Remembrance Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('4be4c02809dbc63a964b1a857b7e0f95', '2025-12-25', 'Christmas Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('835249ad0536d1c26ba29257b12e60aa', '2025-12-26', 'Boxing Day', 'CAN', 2025, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('dc3b2d588578b434f53fa27d261b9ce3', '2026-01-01', 'New Year''s Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('4a5b210562081b9160c37f122ba27835', '2026-02-16', 'Family Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('89ea3012739e2b6b602485bcdcd57853', '2026-04-03', 'Good Friday', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('86b191b28484a692ada71f8994169982', '2026-05-18', 'Victoria Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('d50f727d440d22dd9aecb3003a6765eb', '2026-07-01', 'Canada Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('edb2dacae828f5e2abc02ecf21f843af', '2026-08-03', 'Civic Holiday', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('1f85a811c6b7c577bce410e494a3bb20', '2026-09-07', 'Labour Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('1b28578154478c3903195a61a2f920a2', '2026-09-30', 'National Day for Truth and Reconciliation', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('d4a9721fd628b0aea16b5a8b4b832738', '2026-10-12', 'Thanksgiving Day', 'CAN', 2026, 1, '2026-03-18 17:11:16');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('f919e974f4a4a2c5bbc9ad7b0236564d', '2026-11-11', 'Remembrance Day', 'CAN', 2026, 1, '2026-03-18 17:11:17');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('226e335841ea1954d0aa9112c27ebb3d', '2026-12-25', 'Christmas Day', 'CAN', 2026, 1, '2026-03-18 17:11:17');
INSERT INTO bank_holidays (id, date, name, country, year, is_federal, created_at) VALUES ('e84a8e2d936a8e77000f397ba16717b9', '2026-12-28', 'Boxing Day (Observed)', 'CAN', 2026, 1, '2026-03-18 17:11:17');

-- Table: cash_balance_snapshots
DROP TABLE IF EXISTS cash_balance_snapshots;
CREATE TABLE cash_balance_snapshots (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_name TEXT NOT NULL,
      account_type TEXT NOT NULL CHECK(account_type IN ('corporate','customer')),
      balance_date DATE NOT NULL,
      balance REAL,
      currency TEXT DEFAULT 'USD',
      bank TEXT,
      account_number_last4 TEXT,
      source TEXT DEFAULT 'treasury_flash_gsheet',
      ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(account_name, balance_date)
    );

INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3348ac717a25b3583872f46245caa03c', 'JPM Corporate Master -9811', 'corporate', '2026-02-23', 243052784.47, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0bb5de02ec3842a83bf8391c9cd73d35', 'JPM Corporate Master -9811', 'corporate', '2026-02-24', 240116038.33, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7be93b2796ee7d153515616f8af586e6', 'JPM Corporate Master -9811', 'corporate', '2026-02-25', 238966877.63, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('06098eb6055c3df75466ab27329a9c96', 'JPM Corporate Master -9811', 'corporate', '2026-02-26', 235552051.34, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2b1942c99e07f1df427704a784719ea6', 'JPM Corporate Master -9811', 'corporate', '2026-02-27', 242792657.65, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('dfbf86bb2699bb09389dbc75a066732e', 'JPM Corporate Master -9811', 'corporate', '2026-03-02', 243176360.46, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('12f37e36bf14dc11c5a66dc3a327b218', 'JPM Corporate Master -9811', 'corporate', '2026-03-03', 243761565.27, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cf0414907a87f0391b1cee61b58f682e', 'JPM Corporate Master -9811', 'corporate', '2026-03-04', 240671863.3, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cc5af0b610cf4258270d99b5a71fd721', 'JPM Corporate Master -9811', 'corporate', '2026-03-05', 235906441.34, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fe442987316579f65a77fb4d3b4f40ab', 'JPM Corporate Master -9811', 'corporate', '2026-03-06', 240989698.51, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ecb289891d3898ccbf2425ab12f7d74a', 'JPM Corporate Master -9811', 'corporate', '2026-03-09', 246689932.88, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('21f136f0e7cd5fee74d5b33da1a66a6a', 'JPM Corporate Master -9811', 'corporate', '2026-03-10', 245886278.52, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('97a620da02fad84d8382333057d6cf27', 'JPM Corporate Master -9811', 'corporate', '2026-03-11', 242429142.8, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c0434e619ba2a11b79706193bcc6bdec', 'JPM Corporate Master -9811', 'corporate', '2026-03-12', 239344437.94, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c7a57cfea9bc3b8ba149e8f6bc312791', 'JPM Corporate Master -9811', 'corporate', '2026-03-13', 235785860.9, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2351eb3a3bc83c2667c8d766de58e389', 'JPM Corporate Master -9811', 'corporate', '2026-03-16', 234369848.95, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6d4579def367996f95e67d6ed2e52451', 'JPM Corporate Master -9811', 'corporate', '2026-03-17', 230186604.55, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('69c4b4244f805217e024db83b0e595c8', 'JPM Corporate Master -9811', 'corporate', '2026-03-18', 235734501.79, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('743ee7824f24b68178a12fe5b19a2083', 'JPM Corporate Master -9811', 'corporate', '2026-03-19', 237116308.18, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('700e0915a19867060ae5969fafeb41cb', 'JPM Corporate Master -9811', 'corporate', '2026-03-20', 242461802.71, 'USD', 'JPM', '9811', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e2f37d3aa81de8f0d3842d8a7b997023', 'JPMC MMF -6826', 'corporate', '2026-02-23', 179037683.01, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ec7af90f6a78d364ea979a6fcb02050f', 'JPMC MMF -6826', 'corporate', '2026-02-24', 176742850.81, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bb068c8dc47f3c166e7328ce47f0208c', 'JPMC MMF -6826', 'corporate', '2026-02-25', 179417730.4, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('95d30ee25ceacd2d584ad362cb1ec6e9', 'JPMC MMF -6826', 'corporate', '2026-02-26', 179246542.14, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f73dd752f1cf48aee417b59a420d779a', 'JPMC MMF -6826', 'corporate', '2026-02-27', 179140272.88, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fc9a5a7c50449ac0222da432d0f1d1da', 'JPMC MMF -6826', 'corporate', '2026-03-02', 178902277.78, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e2fa6d714d8917aa9a7600e15fcdc7e1', 'JPMC MMF -6826', 'corporate', '2026-03-03', 177284967.22, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1ae4e0c22ff317d8cf6e9681eab13edc', 'JPMC MMF -6826', 'corporate', '2026-03-04', 174396288.98, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('511c4ba04f7c274385f53e014e8f00ee', 'JPMC MMF -6826', 'corporate', '2026-03-05', 171865866.83, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2b877fe1b98b652cf66a65fdfe453722', 'JPMC MMF -6826', 'corporate', '2026-03-06', 175877222.2, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('06da8566c137ea0027ed411795774ac8', 'JPMC MMF -6826', 'corporate', '2026-03-09', 178981545.69, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9bfd7cce555e2b73f780600d4e92b446', 'JPMC MMF -6826', 'corporate', '2026-03-10', 180935618.1, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3335686c0b662d0d2dc1a23dd44b289a', 'JPMC MMF -6826', 'corporate', '2026-03-11', 181300968.93, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('81c9047ca30bef5928e53504fa402c76', 'JPMC MMF -6826', 'corporate', '2026-03-12', 182915549.89, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6d53213a1e58065555f01e6d0715db74', 'JPMC MMF -6826', 'corporate', '2026-03-13', 183424729.75, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1b604278cdd1970809668a06e59e78c6', 'JPMC MMF -6826', 'corporate', '2026-03-16', 182072829.4, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('06029d130f6b489a6dc085858a119b18', 'JPMC MMF -6826', 'corporate', '2026-03-17', 181059649.56, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bfa93b4fa81fde12db91a4dd8f73eff6', 'JPMC MMF -6826', 'corporate', '2026-03-18', 179444570.5, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5552b22d15cd7bfd6551d1216335dddb', 'JPMC MMF -6826', 'corporate', '2026-03-19', 178539368.12, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c5f498bbdbcc3ae5c8ec99a996d69f3d', 'JPMC MMF -6826', 'corporate', '2026-03-20', 179598755.36, 'USD', 'JPM', '6826', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a944c5f93933aa540c0ad2092015fcfe', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-02-23', 49734161.38, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d131cf47d3ff4ce734f3f17d693372e6', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-02-24', 48358778.43, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('66bcfddaab57796d301c3a53a7848219', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-02-25', 48506771.65, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('998f845999b70f8f534c6d729f690cdc', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-02-26', 48057120.38, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d265b2e33597f15ac2ae535b9d287c03', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-02-27', 47013621.88, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('45e5f33d666d422159a29ba4085c9c5c', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-02', 45475215.42, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('16da984ea0130765d0dbbe692ab49e29', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-03', 48404636.56, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('46bda38f78bbd40a4184265b8c0700e5', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-04', 48979861.43, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c21370167f183c18da1687bb346ebbe5', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-05', 47358999.62, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('da729d646fb40710555714572fcc2832', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-06', 50131754.97, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b9b1c39bed1c92726492ae7390167275', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-09', 50008436.28, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('719c848c75c2b965c7a2f2cc58835abb', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-10', 51150912.34, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2a0bc0fdab7c6570603ecf1075897cbc', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-11', 49769765.56, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2634508609f4b4b72a75823bf49cc7d5', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-12', 50197313.23, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2027b5fcb553a5dbd37c0ef343955963', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-13', 52696193.73, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3ddd45b80bc9a21480786c85df6da304', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-16', 51175594.55, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('24b0ce0c63be8094594b12365a03d7e3', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-17', 52120383.47, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5b20bfc9427661da0b4b15142d1f9f82', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-18', 51637460.03, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c8bc9f596f24595ec184e66d9b9c1264', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-19', 51388087.57, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('02b54d673f315b7f5b6cddb095b93088', 'Chase Corporate Operating -3962 (Gusto Capital LLC)', 'corporate', '2026-03-20', 52605336.01, 'USD', 'Chase', '3962', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7131db93c49272ad21435131ded0e384', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-02-23', 38889304.13, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('71ecc183ae008e0622cc3c4cf9b44066', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-02-24', 37699027.45, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0588991c8e68699f7860bb1831f0b226', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-02-25', 36442378.38, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8e47fc11fe7c8559023813946d438e66', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-02-26', 35596683.05, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5b95906020b25d98eab083cf2037b722', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-02-27', 36213038.58, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('091c53a21b9922c43cdb219e4290b5fd', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-02', 36064324.62, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8761c3ed668fe0a35a23fedcb34c5ddd', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-03', 35572224.66, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('929dd54f59bb9f810e20d960c3210bc7', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-04', 35833400.83, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8f79ba4f38cbec05a286a1e208f19db8', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-05', 36107949.2, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c9e9d491082ff991b3813ec75272c928', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-06', 35212405.01, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b53a9ae4bb5d5491fe52b26d420ede16', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-09', 36814291.41, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f742d7a8565c1d5550f401851df47cc1', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-10', 36518607.14, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6a70c48cb4adce9f426ae769f59d0c34', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-11', 37400888.04, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6676341f4a7b29a3f80ea658363d3ad3', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-12', 36818785.27, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cef65602fdc4dfcb103e3b0edba13e06', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-13', 37392296.03, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('73ac898277065d76b4442154d9b53873', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-16', 38588842, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c428c9ef1b39c73854dc2cccafc072ff', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-17', 38437972.2, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('db2e0b887c54ca341ead046b89142a14', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-18', 38232268.22, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('18c97e7f9708775a1c239d76f93fe20c', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-19', 39362072.79, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('04f1969d5e463cdc5ba1a05ddd2043db', 'Gusto Inc -2378 (JPM)', 'corporate', '2026-03-20', 39136409.07, 'USD', NULL, '2378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4c730437f32cb42a10a8aa7cc0873af4', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-02-23', 29564519.35, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c32d7110b3de97e676a6a6bf7f2209f1', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-02-24', 30208108.11, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9b1bc03199ecf550cb881ee6e064994a', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-02-25', 30535195.43, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f8bbda5a96e8a52cc280ff9dd9a5e197', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-02-26', 30449656.64, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('77c0e03e41ab8b33068cef0d3291b23a', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-02-27', 30925223.97, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8ba672e44fd08020ab9c9bd36c3377ec', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-02', 30746776.35, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ab8fcd6a89b0d6222a0e3f13266288b8', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-03', 30126867.85, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7df968ed6531213cf9e7a1b27ae7d004', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-04', 29642934.01, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('488b27d056530e44c5b2f1573bdcb85c', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-05', 29141480.4, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ea629c58b2435301a4584c3ac54eaed6', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-06', 28967701.91, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9c0e783ba586a87777ab5b4f56aac1a2', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-09', 29057937.55, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bdea0f6423f8b8497fe579174bf206a5', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-10', 29315134.28, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fe551b6e7ac9f0e953a18b5fb543a4f9', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-11', 28336731.88, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d596bff17ab288f31589e0297ebda4ad', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-12', 28332053.52, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('67b0dd69e5ef551f41194854af3ae115', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-13', 28259050.68, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('76af373fce12212b14ed64c523c45ab4', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-16', 27276643.82, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0a2ad1a4982cc0f78c1c84c2617c9064', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-17', 27811514.62, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bf49c9406af12386bfcec96ace38cf53', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-18', 27651067.92, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('05852e3ecf5bc84096594b278243fbf4', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-19', 27626986.24, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('63d5567f17824963b8b5438edac50000', 'PNC Corporate -0446 (Gusto)', 'corporate', '2026-03-20', 28609298.19, 'USD', 'PNC', '0446', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0341adac9eb0ae46ab57fa80560614e9', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-02-23', 21316135.98, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('55b636db6518dd8ab231ab73238a8f8d', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-02-24', 21278759.75, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6795c3462f1030227c9c9f3d2119b5b8', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-02-25', 21046364.02, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('afc6371ac617c654e2db6add03536eb7', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-02-26', 20982136.12, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('42b61d5eb539d7367cf69e03c42f23e7', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-02-27', 21333682.81, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('99c9c58a50a2b2a2f801be14a55a0602', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-02', 21917764.12, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0a1fbb1bb6340082b96d4e1034eb0b2d', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-03', 21353156.25, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e4f5a25600ee2991f1df176810427ca9', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-04', 21391639.29, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ccb525874c10b1cc81ea640a8a85f89f', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-05', 21834529.19, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4da1a218b78ec76044e8950ce4c2684b', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-06', 21889926.5, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('496febb7bf38abadd1a44278ef184b66', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-09', 21456601.94, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('93a9908a80487805e8ebab7b5f367f75', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-10', 21392518.41, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d06c870d5465133356cd5415a7832aae', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-11', 21012285.97, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('524b0a2c4a243c2f2d2e28e8db2a6635', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-12', 21482215.78, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d55a0e943111f19db8822c6dfd31b788', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-13', 21405317.85, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a5695f313cbcc8088e233634e7ae5eb5', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-16', 20961375.58, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1849032429e62b9e9af07f44a7b606e5', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-17', 21181220.29, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('52013ed97f5d7e6c141878bbc439a6d9', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-18', 21069050.98, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d8465e22e51a4c6231701e0ba6bedec7', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-19', 20869431.96, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('91e6bf4bdc4e3820b7f7dce1b7927083', 'Gusto Inc -6428 (PNC)', 'corporate', '2026-03-20', 20847608.96, 'USD', NULL, '6428', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('10f1f3c92625ed7fa33dbcff5d1d119a', 'Chase AP -9329 (Gusto)', 'corporate', '2026-02-23', 14639398.79, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c55663c28d72a59fd44627ef97d3c4e6', 'Chase AP -9329 (Gusto)', 'corporate', '2026-02-24', 14341635.27, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2ee529b764c1aca4650ae36280249c30', 'Chase AP -9329 (Gusto)', 'corporate', '2026-02-25', 15230416.66, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('47c4a42e257a790a926936ea91f64074', 'Chase AP -9329 (Gusto)', 'corporate', '2026-02-26', 14728962.48, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('18452474c8923a7f5ae9edf050eb1474', 'Chase AP -9329 (Gusto)', 'corporate', '2026-02-27', 15041739.78, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f13bb78af9b3a1899c1a981378e3eb88', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-02', 15080839.91, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fa958c8179b32e431a06bef4119ebd4c', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-03', 15559892.27, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('93daaf9cc18c2507a7538974a4e59847', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-04', 14911866.49, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a28f8bf8f1f711dc88506f795ad548f0', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-05', 14707798.88, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('deb2a4a5000f526938bded23648a93af', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-06', 14301254.38, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c375cb1ac019d34a3c83eba8dd5e9144', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-09', 14060862.13, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1c4bcceed77ea0554777b406eea9d1cd', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-10', 13630094.9, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('902cb35354d0ba44bb8fe35c7db92dae', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-11', 14536361.55, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f64eb48446cff128bb8d768aa6de28ac', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-12', 14973307.72, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9ab398a0eee18bd5086bf60a1c7a1150', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-13', 15142586.72, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ac1750c875d644f06d7767c573f884dd', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-16', 15177238.38, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9675bd41ae4d9375547ef0b113910cf3', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-17', 15161920.21, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('38a385533e1b4a13dbe99ca33eff7b87', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-18', 14945747.08, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('65340773719435bc652f35a6b67bd36e', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-19', 14631843.56, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1d0eb5be23febb1bb1b3ae3885b154f3', 'Chase AP -9329 (Gusto)', 'corporate', '2026-03-20', 14507758.78, 'USD', 'Chase', '9329', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a52245ac51fbabe304c9ccbf9ea8ca6a', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-02-23', 11836033.76, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('14fc267d65ca229f716c84582691c069', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-02-24', 11629334.98, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4b7c7dd678e9b99a52987ed1ec53b176', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-02-25', 11007569.58, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b39d7bff06c0d8da5d8f6c647c508336', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-02-26', 11555832.56, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0ed21a3a23a046da9aa4b557167989f8', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-02-27', 11478391.54, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d50b44b985edc4222840bdbbe5494386', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-02', 10695850.74, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bb95c749dae4fcd0d466291ea2e02eaa', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-03', 10600559.68, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a9a67b958cbf8fc53500a6dd5f74b425', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-04', 10845703.22, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8217f81035c8ab536fbe4552a49da5eb', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-05', 10450735.3, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ba7f88cb9b3be07fdfc29b1c8530497b', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-06', 11306846.16, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ef4b003949e7d6a4ec039dbf28ec3107', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-09', 12153420.33, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('681538e4913ff2b6b9a5792e3fa58f05', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-10', 13008174.01, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('547f7f17084111acf3eddd5455c3910c', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-11', 13473117.18, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1d4fd0afeaa9196070ba3ec998cc7870', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-12', 12889313.62, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4863e3605bc0d1411a967a1f3a369235', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-13', 12858092.41, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('aa274fec8233e67bbbd2a503dff9f18c', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-16', 12271659.9, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b9d0e28600ab1c1f83b3b7ed90beb940', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-17', 12947473.72, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('80362b0bed1719163e5ef9d6ce419ed5', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-18', 13450439.19, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8a161bb5b3b685a15f0b2208dd7f9729', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-19', 14210821.55, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c7f6310ed268dd0b2f7b6783c6c18b6e', 'Chase Wire In -9829 (Gusto)', 'corporate', '2026-03-20', 13751612.93, 'USD', 'Chase', '9829', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('73bb77c8930947559d51a58732732aa1', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-02-23', 9211752.14, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2a7abe439dbc0539a89654ae2f35816d', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-02-24', 8865312.27, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7014c17946487a958854120cbf07542e', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-02-25', 8989732.06, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('68c3d2f68283d98d663882a0e767dbe0', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-02-26', 9349602.22, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1995ad848e0ad3251852a32e31186ef1', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-02-27', 9657093.69, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('dea2328c906edc5bc52f55ab732648d2', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-02', 9271928.65, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ff64fa32e4057bc912eafac049d5f37f', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-03', 9112267.95, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2aab88e5863deb2b931cc2653bb05694', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-04', 8711199.52, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0f981375b30ff0522f45e67c42596af1', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-05', 8743654.17, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9684aa6569ac41dcae46456ef86fb2c4', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-06', 8484593.87, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4eb4374036e219a96729e23be03e0b2c', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-09', 8510264.77, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('57a4ac16b376fe07eecb72bc43ae92c4', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-10', 8259974.86, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('742328f9d7f0c85a0404026acd172af4', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-11', 8533410.31, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2b10ea362be1a38c35ef3f488aab0cb7', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-12', 8354434.19, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4a7fc95f6122e892521b0102481c23da', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-13', 8167039.25, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('926a0954cc5798b4d7f30c09067cb4eb', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-16', 8093162.25, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0935df735ca4e6d79b2a81779e30e2c7', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-17', 8346016.42, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2e633f42f2f9d947a7005d2942ecfc61', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-18', 8314303.17, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d009b46b571ca542d6540aa5f466121d', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-19', 8711042.83, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('39123416c8b83a177537e7a71c2db3f4', 'Chase Billings -9378 (Gusto)', 'corporate', '2026-03-20', 8768683.43, 'USD', 'Chase', '9378', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('92e73d518e29bef278fa9edc482d4910', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-02-23', 151809190.87, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('42ff1aa17dfe38ee9d3c6c11db435ce4', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-02-24', 151032735.96, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cad539966cbc5df3c8db620196009e82', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-02-25', 149908910.79, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7b06bc4ded9a772d11371b3b80c0bcfa', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-02-26', 144007827.88, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cd3344eec9a11916d6d241cbbc21073e', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-02-27', 147412950.32, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('10b30cc43364a494e964f38c88a2e022', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-02', 142620866.21, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7438a5bcd861c5eb0d87e24c2f5ecd66', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-03', 143796828.41, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4e8d99d1a2d62935bc1dd220b7f82a3a', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-04', 145303786.08, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d6e11b6cbd2fdb24646f1dcc220572ba', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-05', 143240543.43, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6d53792c13b874566d568663cbc20048', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-06', 141970500.71, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('474ab20af525c1e5c07b9c44f2ecebae', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-09', 138646840.93, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c3f41b06803f2e3fa9ddf7c10080f6b8', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-10', 143402827.4, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e9af8de6b7b27a9be0c80809958faef7', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-11', 143322733.84, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fbc8501d1128eeb345a7f0cd1b9bec80', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-12', 145440164.06, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0d6720bce1d539c0956cbf397cd97055', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-13', 145514602.38, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b79f9d74a3dca53201a97a2c7cdaa31e', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-16', 139681705.82, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1fffb0e5f8a6e5724cadb29699f53a6f', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-17', 141913346.45, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e5dcd2aeaa137bb238643765b65823a7', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-18', 144499105.24, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c2822a283fdf99dba51ad164db97d63c', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-19', 140008678.23, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a0ae34d42c4a47311f483a64c1d7d753', 'Chase Internal Payroll Checking -0566 (Gusto)', 'corporate', '2026-03-20', 144447356.95, 'USD', 'Chase', '0566', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ee1599d653f97178acf42fa716dde1c7', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-02-23', 3994929.67, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5da079063e4c6e233a895cf4fc0487a9', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-02-24', 4087451.04, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e283d0947b4cd74b07f2d866bdbcb9d0', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-02-25', 4238940.15, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1b92bdf48e6f7a9ec8e8bef34cf79e9f', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-02-26', 4245815.41, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c7774de964c781f34f3d2ef59f941c82', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-02-27', 4102892.14, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fde0ea6576051d094eb8a9afb6e7aca7', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-02', 4156772.39, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6f28e157732225609d42c79149e9f474', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-03', 4125200.08, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b371d01c818c9539ff05bde45224800f', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-04', 4132263.85, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0e7263fa536b983edb36bf77c968578c', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-05', 4098840.07, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c5a1c2c41d8d2ad04ff8efa16ec2e4f2', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-06', 4072905.31, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9239434a7c547bf1ece8760a796d8f92', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-09', 4190193.44, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9dfeff68c3456434b3c8b0580cb9ca98', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-10', 4295861.93, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b6b33ef15449a2282d19fb50e44b9555', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-11', 4411648.46, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('28183634e1cc8b7f5767464a4294c307', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-12', 4406578.85, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('60498ea418c4dcb69d74530a835a8701', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-13', 4250549.56, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('905e7c6b4733f4620c807dc248e192f9', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-16', 4315948.94, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('13ceff618af1243425f0868d89ab2c5e', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-17', 4232008.28, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d579682a9229411cc86a9a2b7fc794c6', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-18', 4263794.29, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b77c885d23b2587e4dc91000689e514a', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-19', 4113222.37, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7e716a642bb77d59a0c29be3e9c94fb8', 'Chase Operating -9392 (Ardius)', 'corporate', '2026-03-20', 4112366.56, 'USD', 'Chase', '9392', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('651d258a29d1158532a50e8cb8c64294', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-02-23', 3148284.29, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8099abfbcd2539c6a0f7d9d9649f0a39', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-02-24', 3207703.34, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('27ac669729f6539033a25027a2e4b7b0', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-02-25', 3274422.38, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('324b509c992b9ab5d2cc6b700c222612', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-02-26', 3248842.52, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('87509e21ae3c004fd6687b359aad02d9', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-02-27', 3230695.19, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1d1eb33b1d7cda7a5772e53ac777a50c', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-02', 3282361.82, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cac28e7d8cf04f335e995fd1c32502b4', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-03', 3184609.27, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('aa1a014253cef823a6b4274807249c92', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-04', 3098628.41, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1bc1c29bfb6b4b5d3aaa4aac3d66d67e', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-05', 3095548.93, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('af9edad9fd0196e13cca1c8f88f67f4c', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-06', 3104040.88, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('10127550a40accbb6d130792cfce33bc', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-09', 3087810.58, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('27f09255210a6a9de8cf02773a5d14c7', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-10', 3096461.42, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('add5d7ee79f326ab1fa2b42d787874ad', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-11', 3124395.73, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('04948754e22dd616acae0977011c7ed7', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-12', 3135951.35, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8c4f9ddcc5bc4b668a8c5f90a8e08704', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-13', 3152611.44, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('846d5a7b739993a958d9fbde794f288c', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-16', 3085351.19, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('efa718e0dffa3f89263605bdd0f0ed9a', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-17', 3132795.1, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5446007341f14bab2131f47e15ebcf04', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-18', 3180695.46, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('309618d3fe0bd9e28f2450206ae49508', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-19', 3251479.64, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('922ff8e5579bdab5234d570bab3643b2', 'Chase Checking -1602 (Gusto Canada ULC)', 'corporate', '2026-03-20', 3225112.46, 'USD', 'Chase', '1602', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('65303738082424ed15e0c476ede74464', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-02-23', 2824205.1, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8f4527716ee19c1f7d0b03a95b25f19c', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-02-24', 2939963.92, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5cd067662ca6198e9258143ed2ba06b1', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-02-25', 2901915, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c2622d4de359b3fbcc352d54cdc90334', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-02-26', 2849028.65, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2ec1ee8ab06ca4f4ab36d0b66e95d662', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-02-27', 2967783.72, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bdf457f822e26213fece14dd451bc7bf', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-02', 3025822.28, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9bbb509c99a68142fe78ad44ed112bde', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-03', 2971450.4, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('35f7958c04d5689a00da03473f6d260c', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-04', 2905674.19, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2a39c10753fdd1339259000ab940519f', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-05', 2787023.25, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('db43e73c392575e7df5314d0aab349d0', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-06', 2896547.76, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e6472e37643a2df922b3167f4856277a', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-09', 2919240.84, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5c1ad2f632498a41386181cd78704543', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-10', 3013746.06, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ec83fa58107ae8ca2b3ceaffe037cd29', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-11', 3053686.16, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ec89fc5724f89ff063ff6651d55248dc', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-12', 3116655.44, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('07e266ecf49a13bf4a31a5c3f791fccf', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-13', 2995941.63, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3a244f46c76da9dcfe212a82b538ec1b', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-16', 2970118.41, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('255b1bcae95564f583073d5c600230f5', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-17', 2841370.06, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1d8e00ee22f21a6a974f2192eaac9444', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-18', 2785800.74, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('249f3b2918df9a8477747efc29060688', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-19', 2724290.81, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('60d3dbb619b88477dd17f1dd2c2cdfe5', 'Chase ZPI -8961 (ZPI)', 'corporate', '2026-03-20', 2713842.71, 'USD', 'Chase', '8961', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d51f6b9d2a5325d03ab471d6df6978c1', 'GH Program -5843', 'corporate', '2026-02-23', 1968175.2, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b714a869999a95bb1f697572952fac7e', 'GH Program -5843', 'corporate', '2026-02-24', 1956385.84, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('71f58aa0c3002c3302822691ab2b97fb', 'GH Program -5843', 'corporate', '2026-02-25', 1996589.35, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('54a4405a8bca18fe9f592246afb7ff27', 'GH Program -5843', 'corporate', '2026-02-26', 2009439.64, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f63a031e67cd86e2cc4db945ab55761a', 'GH Program -5843', 'corporate', '2026-02-27', 2002562.58, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8ff94b570011f9e211ce46c406c05794', 'GH Program -5843', 'corporate', '2026-03-02', 2039578.45, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ef406fa782ad84b16c8cea65805a33cd', 'GH Program -5843', 'corporate', '2026-03-03', 2074308.33, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5afc334c1c96e2461bf8ca6cfb916483', 'GH Program -5843', 'corporate', '2026-03-04', 2029412.79, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('870bf254c5cc72c3635f70a0856a96fa', 'GH Program -5843', 'corporate', '2026-03-05', 1981492.2, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4b2d76534865e1d06cf0ed4c913cb621', 'GH Program -5843', 'corporate', '2026-03-06', 2000544.78, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ebcc55493146b91cfb35113808712e60', 'GH Program -5843', 'corporate', '2026-03-09', 1957906.17, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e1a1d6d2785fee5a8ddaef11de342ed6', 'GH Program -5843', 'corporate', '2026-03-10', 1940314.19, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c378f7f74fc0296309bec057c537333d', 'GH Program -5843', 'corporate', '2026-03-11', 1905087.38, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1842a0832f7f2231ed5fae5347904185', 'GH Program -5843', 'corporate', '2026-03-12', 1926917.67, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0a79db66fb981c5432c94666293e8170', 'GH Program -5843', 'corporate', '2026-03-13', 1875855.23, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4c523176cd46854a9a08d000b25c80d4', 'GH Program -5843', 'corporate', '2026-03-16', 1897879.18, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a171165c326f49f48255069a5ceb0b89', 'GH Program -5843', 'corporate', '2026-03-17', 1884910.56, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('91889b18bcd30b28b0344ba083b77de2', 'GH Program -5843', 'corporate', '2026-03-18', 1838783.36, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('191412ddd3155fe6dbf331fb823eeaa2', 'GH Program -5843', 'corporate', '2026-03-19', 1854724.16, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('dc3670d0c3907da5d23029204a0b9f97', 'GH Program -5843', 'corporate', '2026-03-20', 1848621.15, 'USD', NULL, '5843', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5494dd1df25f4551b50349bbb1b96133', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-02-23', 1387182.33, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9d02b4251dd39fd9b3599ee3bfc99f18', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-02-24', 1358010.73, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('08332de56470b2856de3655a8c94a19f', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-02-25', 1344388.96, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('926574b051d0e31cd87007210c86016b', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-02-26', 1364732.46, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0d883b503fb78369142c68f3dd684547', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-02-27', 1394415.93, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('30f407c35322d4a8938c23db6e20323c', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-02', 1396906.32, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cec9cd2a77d4d6414bc622069037ef20', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-03', 1360013, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f581500236312471a80c40d85d895b94', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-04', 1386002.51, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a4cb12b137e53a985da07d261e41b98a', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-05', 1378606.76, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('580d13cfe4f27c42176dfb79d50f3149', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-06', 1352734.71, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4ba7a01582ab1bc085822a8a30ad5178', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-09', 1331542.53, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('666a3d01b87adab034bc47b5e7e086fc', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-10', 1329853.25, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6008ec605449526240dee792cfe31284', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-11', 1301929.96, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('05169257cc619ed986b458e06235626d', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-12', 1294523.47, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e3d2b4fd5464828c864bd3c862d55882', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-13', 1318977.97, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ae3abe6e4b4c64b43a29e9517e1ded57', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-16', 1304326.63, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1140bbbb19e2bdd9391a55fadcaaab2a', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-17', 1279952.02, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2b52129eff8800ce0729f4324bd970f0', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-18', 1307152.65, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('daf9fcbaa0663f3b16b2efd374e83de9', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-19', 1336056.39, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f0b8dd4762df875e3f1234978529a684', 'SVB Cigna -7987 (Gusto)', 'corporate', '2026-03-20', 1311878.66, 'USD', 'SVB', '7987', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('081ebfacfedbd3e2726ca03f11808f12', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-02-23', 882324.91, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9ec66fdc9a938c3b73e12ebf543e3352', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-02-24', 903728.75, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c336e8355802ee7129066207c8d6b951', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-02-25', 943121.35, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7eedd9f5570263141630d068012e3e98', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-02-26', 914431.26, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e3b567f163caf5af9cb0b3619f8735fb', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-02-27', 929130.41, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1e30cef47bd514c8731f9450f270b99a', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-02', 901669, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('21f54389962c182a55159871bcabba85', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-03', 899179.38, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('63700144f96bbc6bab9b7357a6a34ac9', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-04', 909384.19, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1df8191ef174f40f010f256eed85e074', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-05', 877276.75, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7b70d81cd6c76d7fcf0b2edaa5de3972', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-06', 865548.15, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('abee25d3dbc4614d5a0b3fc0efe00875', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-09', 871826.41, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bce2b3c2cc67d2834fe395bb5fe70a9b', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-10', 878966.18, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('56c049ab92a0ac122533aa7e5ba7992c', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-11', 855161.97, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1e6d51b572d1be4ab7c66288c43d7ae1', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-12', 871134.75, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6f2d6555cea1e3096855a5fa545930c9', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-13', 855185.94, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('70fb67a3564694c290d8ca172e8ff5e1', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-16', 853460.27, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d06be8ec23b6610fcdbd86825e2fbcbe', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-17', 853621.32, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f77af3a835add1ff072a9957b4345019', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-18', 838409.19, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a99c0ee7857e4b07ce5b0bd478e0584f', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-19', 859773.76, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cbe36e7c9eca38809120ec1355bb97b0', 'Chase Gusto Platform Mexico -8375', 'corporate', '2026-03-20', 884218.63, 'USD', 'Chase', '8375', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('12becf575221bd42dddfc2b401f8cdaa', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-02-23', 628108.79, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('eb49a68e806b67f50dd3986920871ebf', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-02-24', 619108.4, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d0d92d98b807d81fa2bb533e1f73aa1f', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-02-25', 603311.65, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('db98cc1f146f92f673fe12ee18f369e8', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-02-26', 602317.15, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3f5ff996a85939e91b022bace4972452', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-02-27', 615327, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('07f91ff10bfa494382c12c0a39401123', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-02', 636236.02, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('45baa7fe35da086bc4314f62e2a78e50', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-03', 649255.49, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2d12a5b079e5847403b83ab8ed09d0f4', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-04', 652040.46, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d95f9f7d4100d78d4560a9b384bb3db0', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-05', 649586.76, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('400ec40cba47930a5b5e5eb567f449b0', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-06', 624536.34, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('71c26a35d31d72df6e200721f785beca', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-09', 643623.29, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('85e04e5bef85d30f5e26d596126139b5', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-10', 643475.3, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5aea0250ea535c18099a263216a57254', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-11', 627635.75, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0145fd6b9fddc7df474863b1ce6a4426', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-12', 637748.28, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e8c2e28d27f7b135b3e6a2b2c9a393f9', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-13', 629848.49, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4478973070125145195950f1be0ca7df', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-16', 626496.18, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5b515d2cc015164df37e2d02c474a830', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-17', 610177.65, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e62e2a556ee07a6cdf7aecd01ad86d8e', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-18', 595159.44, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('29be02cad5c986e82ca7de753a47ea0e', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-19', 589530.44, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9c864d7cc9f04bbe750a9eb75eeb4faf', 'Garanti BBVA Turkey USD -5947', 'corporate', '2026-03-20', 611661.69, 'USD', 'Garanti', '5947', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e06746e435cbf83cc1657990885266ee', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-02-23', 83097284.4, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c83d2447ebea7dec5b72d0d78e853bde', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-02-24', 81229732.51, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f7a1ed874b2ae36806842a8b9f14c0aa', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-02-25', 80584009.75, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f79111f93a41090eb1d45e44d5e26850', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-02-26', 80930653.35, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e1604362d99040a2b342ba7df9fd1e0f', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-02-27', 81853907.22, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('302af7e0eb712f46193ab82dfae17a4f', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-02', 79097365.99, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5e3b67f25d666a134905f1a53e02faff', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-03', 81005120.12, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('42ed2ffcd8f10971e25f48bb3f00eee7', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-04', 82071278.69, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('529ff95aa010176bca641d18498d5a7d', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-05', 79048625.21, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('208787b10a62edbdd1275cb357166cb6', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-06', 76236834.82, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('41bcf8e50b7698bd1c155215166ed381', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-09', 79100619.61, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('404345189271fa839d9ac9d6d8da55dc', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-10', 77781790.79, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bff88bffeb68d7bc7fe2eb72245ea300', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-11', 80746993.82, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0016325862050e7c68db95ca26f1a795', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-12', 84167479.59, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ccb75df44182c053f1b72fac0c25507d', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-13', 86799568.01, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('17c3fd6757e0a47c86aa261f2d8a2185', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-16', 84744666.89, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('8e8854accf75a51b09dc40fe9b72d81a', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-17', 82637095.88, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('686ac47448daa540ec8629c326158602', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-18', 80205127.02, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1030581ce185606d0c8365899745269e', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-19', 80499004.14, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('448d33d7555fd8e16b30163d170fdfbb', 'Chase Tax Payment -0269 (Gusto)', 'corporate', '2026-03-20', 82574917.49, 'USD', 'Chase', '0269', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c96fcb48b6e422101ee10b63c0ab0f72', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-02-23', 8698291.15, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('861b63a36ca4e1b060ca88b2286adff8', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-02-24', 8478653.58, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d639881b86f7bbb41d3be3adfe005a8a', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-02-25', 8344151.35, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('aa8bb415d933bdbd9bf281da3044fa92', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-02-26', 8280869.72, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('09528f07944ca45ba236dc87c66064e8', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-02-27', 8385512.84, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b41444b106c86809c556fc4906937e0d', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-02', 8530729.56, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('32d151a85bd7302f7a8e38fcb02f18ed', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-03', 8584468.94, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b0820151387d3dd9b6bc17894584279e', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-04', 8700931.91, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('91a745e01f06632a88424e59d4bb3b10', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-05', 8574879.01, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('183818582f8c85692a2a861893af9f8f', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-06', 8622566.04, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f0bc5098ff3d314ea7352fc1dd2ad940', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-09', 8755476.75, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e402d8cbf9d97713cd04b523ec061988', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-10', 8512865.87, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e2beff19127025b61a3dfc492e56436e', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-11', 8462280.8, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cbf4f8e8077e2824a7165acdf6fbefaa', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-12', 8401556.77, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('53c7968d3fe7b04e82f16ed01aa28914', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-13', 8585969.31, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('836ec905ac27ba3d5c48277e59d8e135', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-16', 8617293.35, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('82d90d04919bec6c84e6d945e2c9a993', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-17', 8499432.3, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('913ac342316f9f169dfb112a04e49c97', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-18', 8417653.59, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5107e15cdd836ee67f3b949d17160768', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-19', 8640087.27, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f0d7a002b1bb69fd2128f8121a96f1b4', 'Chase Recovery Ops -9803 (Gusto)', 'corporate', '2026-03-20', 8732339.16, 'USD', 'Chase', '9803', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c7697f487de59fb8fea5af8695b01a21', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-02-23', 33488588.55, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9a8f834d47e2595aa2c60894af3efbe3', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-02-24', 32278240.88, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9d6a6d7f6a991489595627466dd7c282', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-02-25', 31607935.65, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a8dbb41a60d5574ea25ace955026d724', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-02-26', 33016618.83, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e4c907d02197db7336670c6f97331227', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-02-27', 34010527.91, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cd4c4fa8a6960ff1352d0809a41d8d13', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-02', 33520690.99, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('eb14c59239a6ca7f5fbfe66111b645c4', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-03', 32123799.56, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d7bd2a910356b1076ebd3fe11dfe6e98', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-04', 30882566.02, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d61da20a7467cdad882e0ede6628784e', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-05', 30402137.39, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3969d8925ef90c592d3c72f218c04bb9', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-06', 30126687.92, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('40a47fa786e3c119e1fa06692dbe17b0', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-09', 30957077.94, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e49d94a7896809e77e6f8a105959e575', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-10', 32650816.74, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('79219696d126ec53f8df56e014663936', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-11', 32614713.45, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('a892ff21787085c875fb887ad1c22788', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-12', 32692861.52, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('33402c67a5574803a719593156e1dbb5', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-13', 33807189, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9fa7eeb8149f3775b5ad7957bb1d824b', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-16', 32570746.25, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c6cc2ffe94cc95256e45e80d5f8d2ed5', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-17', 34262955.18, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1b19e45be79a8f5507006cb8c62f709c', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-18', 33495389.65, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7f69116ebb6b2a31f280ef92f6befdd3', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-19', 34770769.23, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9aea04a2ec68d2cb3869a73af93617b6', 'Instant Payroll -0673 (NBKC)', 'corporate', '2026-03-20', 34999612.62, 'USD', NULL, '0673', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('77bde807e3354d4291830c0438647ec3', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-02-23', 869846724.33, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('67d178f392af8ea1a81b9803a66ebc29', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-02-24', 872605517.68, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fa6a7210d38c89b76973193e4afa31ee', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-02-25', 874174624.69, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b2e3f830527f8380383abadb482e9c04', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-02-26', 864392238.38, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2be694dce7e7db4e9a7b8de9c7c25772', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-02-27', 879158234.92, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('795bca9769bf1ea272099c5d08e1c692', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-02', 893301385.82, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('097ca37daa817be46b15e575d01ff9fd', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-03', 901153854.27, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('348e2b0370e88e7871c2c98b7bebdbc0', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-04', 909434898.34, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c6055b6da342e82827164327de9579f4', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-05', 908122007.97, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9fdc83d181bae104c6483069c85c497c', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-06', 899555080.88, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d842cc08cc0fe8084f2e27a28134eae7', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-09', 889635100.66, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('02e8874fff746ca4414ff44a28117a64', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-10', 875868656.5, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ab77974d09bae260fb11566c6dc969bf', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-11', 893008594.95, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('d2473123a079195513f77e81e87a0a1f', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-12', 883104349.47, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f75d8e112575901575ff6460359553ea', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-13', 897205798.27, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('34e24fd65995b61927c42581d52f5af3', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-16', 908615436.55, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c59cafcefe952533b2841b2f2543be2f', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-17', 908809550.67, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('653bba47690ca6701a4cf2ca26ff3149', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-18', 917248895.62, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bf274184fb7d363e8304214baea951a5', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-19', 903246452.95, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0463adab7ef6787a771c419e141d3934', 'PNC Customer Master -2155 (Gusto)', 'customer', '2026-03-20', 908727038.5, 'USD', 'PNC', '2155', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('caf6e884a9517c6ff641fd323f626577', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-02-23', 417757550.95, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c03341626090ee20a85079cc3cc6551c', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-02-24', 428817203.37, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c605dbdb317b1a1765466a1b3657e4d7', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-02-25', 418229586.19, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4e2ba2e1ed36e22a7dcde85203c72061', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-02-26', 428638598.83, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('264b04e7cf11abe2fe9f8b5e87ee2cb8', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-02-27', 436755654.08, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('94444467d3aa18892b12b8c73b3f514f', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-02', 441920758.8, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ebb0db29625bc2c7611ef231f5f80be7', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-03', 445951578.52, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ba52b74469d2b1c6977031c51046c750', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-04', 454082771.05, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('238ff2c299734bc2df1676428e0b511b', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-05', 445125458.78, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c07117be3075e1456b01917174403f4d', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-06', 440138952.38, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('57e74fd8a0ccaba9733a8aada5fb5f63', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-09', 430710760.63, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c65dc5eed0bc873fc1fc389bdd79fc29', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-10', 421478238.28, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('685440cf00c5188650b99e17a44a7864', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-11', 420542844, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('faa6564500a19263bb7bc5f7586cb2b0', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-12', 428912104.87, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('301a6088c9637ed2c0f5fb73d0e5f877', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-13', 433986246.73, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6ed02b4f993a514fddc6f86e065d151f', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-16', 423984541.9, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c521ee53297bea465a5c0c6e18a6c542', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-17', 416618104.76, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('54d89a11a04ed793def03230b8577d73', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-18', 425586953.49, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b2513a74b3e5071ad51b358f704774f0', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-19', 419237651.91, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('528808d4f1a2129ee5333d021219c7e9', 'Chase Customer Deposits -7908 (Gusto)', 'customer', '2026-03-20', 416475018.24, 'USD', 'Chase', '7908', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9467949bd648a14423a5a21a1c2ae54e', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-02-23', 307469079.14, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6d25d672f801aa692212a8dec8ec7cc6', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-02-24', 307794950.36, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('1754214eb9a617636fe89eb2f07b8557', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-02-25', 303614272.42, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e88d63db04edb4781b661a2dc4984670', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-02-26', 302051985.96, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0add9db626038efe4416568a640e9fbc', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-02-27', 308405850.21, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('46bd143882ed0dc2b969a1d3688a3683', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-02', 308214482.45, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9a7bdc3464e8fea4115cda5e3526a46a', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-03', 305267629.93, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cc4516aa75a1af497a5da7c0f388cde0', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-04', 307191251.49, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c665faa7cd45e0c72231fcf2a87f0ed0', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-05', 310645443.78, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('6bbb0a742b6a6779cae626ee04bb4e37', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-06', 310887129.76, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c073873a938fdde566a95b9c7836f310', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-09', 312852070.61, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4b250bb10e0c9423484e820646d721bc', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-10', 310446768.52, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b9ef5afaf0dc0bed632ecfb0a8f01246', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-11', 311844923.64, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0158ba1f4dc10ffc02dd567206c76677', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-12', 310657377.64, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2e90b9d4d2a255c3b2ad3b1942692bef', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-13', 315029279.75, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('c02edc835ae9ee13eabcd159eb3e7f36', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-16', 315659776.47, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('fcfe70e3a037105eabd33f9ef06c4135', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-17', 314442615.14, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7015607f4cc2b8be8c09efc3804da96a', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-18', 317514232.7, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('98ef04fbef27b5268bc3e49109b88758', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-19', 315942405.64, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('db678c33b1154d02eb7b7ece73f4a9e1', 'Chase Deposits -0226 (Gusto)', 'customer', '2026-03-20', 320581719.93, 'USD', 'Chase', '0226', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7edcccf36fdbcd1d5fb44eff6fed85ed', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-02-23', 178194654.06, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('955919c0209f43722efc0890a2beaea4', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-02-24', 182920838.63, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0e39d932be7d9603fe38943debf17564', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-02-25', 179767937.03, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('da459ec1d66e902789cf617d607454ad', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-02-26', 185147618.01, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2494ff6960a8b647a7446dd963a40e80', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-02-27', 182942774.56, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2e025589ecd313ccb49c8103bae034b0', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-02', 177606268.39, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0c57d24680789d8eb0081101e4198017', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-03', 176867779.88, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9736a3c09ac073ae3e3d44c095857e40', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-04', 181059884.09, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('56478994041742099a790cd6f5f7ccee', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-05', 187167078.51, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('5bad663b3ab21cef6438724049be0140', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-06', 184534238.56, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('811caa9d70d409b9a7ad5e1fe30646c1', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-09', 189328649.46, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bfab8fa4ba76b164cc3be2d16a4794da', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-10', 185634574.71, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('58d0054d23abc4f07673847e4b7b8c0e', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-11', 186218061.2, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('13633f8afc89e6106503509c1364630f', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-12', 190163441.16, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bdf0e6d9105149ae70a395ed608edf58', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-13', 188603533.22, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('253aa057d07774f1e1246a84e861e4f3', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-16', 191506090.27, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('53c9b9f57e3795e8cae6868408f8b08a', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-17', 192150106.91, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('240b711daf0ff39eeac77bf8f85f8387', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-18', 185328791.3, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('cd6369317ecec97fedac53e80516d1dd', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-19', 187229139.22, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('14d51e2304c5adb7474361b0a7b98c0b', 'PNC Customer ACH/OB Wires -0497 (Gusto)', 'customer', '2026-03-20', 191273371.79, 'USD', 'PNC', '0497', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f560f089f880680b6884e5f642e88f66', 'Chase 3rd Party Processors -5119', 'customer', '2026-02-23', 42168208.49, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0de6c095c3a87fef57cb241e8d54247b', 'Chase 3rd Party Processors -5119', 'customer', '2026-02-24', 41237934.5, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('33b416bb6fdbff33a5d59fb5e8954c60', 'Chase 3rd Party Processors -5119', 'customer', '2026-02-25', 41755131.63, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('48b35f2c951748d0931624bf5ce3dafc', 'Chase 3rd Party Processors -5119', 'customer', '2026-02-26', 41684262.47, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3b93cfbde0aaee68d7edac63d06f33a3', 'Chase 3rd Party Processors -5119', 'customer', '2026-02-27', 41787663.77, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ac5c8958473590b0883b31d989cf4c16', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-02', 42438536.78, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2856b4d8cdc98d099dfbe4a71f1f8571', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-03', 43767817.26, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('e6f0bead954ca4e2bebe8912712926eb', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-04', 42688820.57, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('bed8fff8a7d24097967b9aabff9248c6', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-05', 41429054.94, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('0a08d66b3237c55fc9f38f47ca9f90d6', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-06', 42161991.71, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('b557c611a1f32081846d629d9c4b0fdc', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-09', 42882750.67, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('59616614d86153d3b1d6990b1a35bfe7', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-10', 42545791.54, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f6c6bbfaa82ff1986ae3e9b406ade951', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-11', 42026102.51, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('2236e6f0bed3863d2c7293e4e74c0435', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-12', 41961832.56, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('f6183177b9f884f6b444d6b5eeab9ab9', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-13', 42883130.86, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('7abdb391014d1afb1fa67ff75a0e0159', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-16', 43531335.3, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('9bbbf49864f421d69d9c959b4b4c6071', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-17', 44796321.32, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('ba62b866c0526d899fbad0a6cf545a42', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-18', 43683837.65, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('3a3892771466aa1dc0741b26e4827bf4', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-19', 43875726.11, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');
INSERT INTO cash_balance_snapshots (id, account_name, account_type, balance_date, balance, currency, bank, account_number_last4, source, ingested_at) VALUES ('4107dcdab8e09021455567667854d3da', 'Chase 3rd Party Processors -5119', 'customer', '2026-03-20', 44735431.81, 'USD', 'Chase', '5119', 'treasury_flash_gsheet', '2026-03-23 15:51:45');

-- Table: corp_forecast_snapshots
DROP TABLE IF EXISTS corp_forecast_snapshots;
CREATE TABLE corp_forecast_snapshots (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_name TEXT NOT NULL,
      forecast_date DATE NOT NULL,
      forecast_amount REAL,
      actual_amount REAL,
      min_balance REAL,
      responsible_person TEXT,
      source TEXT DEFAULT 'corp_forecast_gsheet',
      ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(account_name, forecast_date)
    );

-- Table: document_versions
DROP TABLE IF EXISTS document_versions;
CREATE TABLE document_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      document_id TEXT NOT NULL REFERENCES documents(id),
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now'))
    );

INSERT INTO document_versions (id, document_id, version, title, content, updated_by, updated_at) VALUES ('06bc97a56de92b1435de690e88ab43fd', 'doc-user-guide', 1, 'User Guide', '# Gusto Treasury Payment Tool
## User Guide
**Version:** 1.0 | **Last Updated:** 3/18/2026 | **Maintained by:** Treasury Admin

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

**What You''ll See:**
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
If you need access to an account that isn''t showing in your dropdown, contact your Treasury Administrator at treasury-admin@gusto.com. They can update your account permissions.

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

**Q: Who do I contact if I can''t log in?**
A: Contact treasury-admin@gusto.com or your IT help desk.

---

## 12. Getting Help

| Issue | Contact |
|---|---|
| Can''t log in / access issues | treasury-admin@gusto.com |
| Payment stuck in approval | Your AP Manager or treasury-admin@gusto.com |
| Incorrect payment details | Return the payment and resubmit |
| System errors or bugs | IT Help Desk |
| Questions about limits or roles | Treasury Admin |

---

*This guide is automatically updated when system changes are made. The version in the platform is always the most current.*

*Gusto Treasury Team · Internal Use Only · Do not distribute outside Gusto*
', 'admin-001', '2026-03-18 17:11:17');

-- Table: documents
DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      updated_by TEXT REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

INSERT INTO documents (id, slug, title, content, version, updated_by, updated_at, created_at) VALUES ('doc-user-guide', 'user-guide', 'User Guide', '# Gusto Treasury Payment Tool
## User Guide
**Version:** 1.0 | **Last Updated:** 3/18/2026 | **Maintained by:** Treasury Admin

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

**What You''ll See:**
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
If you need access to an account that isn''t showing in your dropdown, contact your Treasury Administrator at treasury-admin@gusto.com. They can update your account permissions.

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

**Q: Who do I contact if I can''t log in?**
A: Contact treasury-admin@gusto.com or your IT help desk.

---

## 12. Getting Help

| Issue | Contact |
|---|---|
| Can''t log in / access issues | treasury-admin@gusto.com |
| Payment stuck in approval | Your AP Manager or treasury-admin@gusto.com |
| Incorrect payment details | Return the payment and resubmit |
| System errors or bugs | IT Help Desk |
| Questions about limits or roles | Treasury Admin |

---

*This guide is automatically updated when system changes are made. The version in the platform is always the most current.*

*Gusto Treasury Team · Internal Use Only · Do not distribute outside Gusto*
', 1, 'admin-001', '2026-03-18 17:11:17', '2026-03-18 17:11:17');

-- Table: eod_reports
DROP TABLE IF EXISTS eod_reports;
CREATE TABLE eod_reports (
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
    );

INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('0b65607e5027bf205330d68ab79026aa', '2026-03-18', '2026-03-18T22:56:07.816Z', NULL, 10, 50000075269.8181, 0, 0, 0, 0, '[{"status":"executed","count":1,"total":44.44},{"status":"pending_approval","count":9,"total":50000075256.6881},{"status":"ready_to_execute","count":1,"total":13.13},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000002","payee_name":"gusto","amount":13.13,"currency":"USD","usd_equivalent":13.13,"payment_type":"wire","status":"ready_to_execute","requester_name":"Colin Robbins","submitted_at":"2026-03-17 17:48:23","executed_at":null},{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260317-000010","payee_name":"gusto test","amount":47,"currency":"USD","usd_equivalent":47,"payment_type":"ach","status":"pending_approval","requester_name":"Colin Robbins","submitted_at":"2026-03-17 20:20:37","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-18</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        10 pending ($50,000,075,269.82) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$44.44</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">9</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,256.69</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Ready to Execute</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (10)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Ready to Execute</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:48:23</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000010</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto test</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:20:37</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-18 22:56:07');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('7f603e7909c6805d5cb8b1d269ad1612', '2026-03-17', '2026-03-18T17:17:57.150Z', NULL, 7, 50000014719.7781, 1, 44.44, 1, 0, '[{"status":"executed","count":1,"total":44.44},{"status":"pending_approval","count":6,"total":50000014706.6481},{"status":"ready_to_execute","count":1,"total":13.13},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000002","payee_name":"gusto","amount":13.13,"currency":"USD","usd_equivalent":13.13,"payment_type":"wire","status":"ready_to_execute","requester_name":"Colin Robbins","submitted_at":"2026-03-17 17:48:23","executed_at":null},{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260317-000010","payee_name":"gusto test","amount":47,"currency":"USD","usd_equivalent":47,"payment_type":"ach","status":"pending_approval","requester_name":"Colin Robbins","submitted_at":"2026-03-17 20:20:37","executed_at":null},{"reference_number":"PAY-20260317-000007","payee_name":"test","amount":44.44,"currency":"USD","usd_equivalent":44.44,"payment_type":"wire","status":"executed","requester_name":"KC Deatsch","submitted_at":"2026-03-17 19:54:06","executed_at":"2026-03-17 19:55:45"}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-17</h2>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
        <strong>Retroactive report:</strong> This report was auto-generated on server startup to cover a missed scheduled run.
        Pending payment counts are best-effort reconstructions.
      </div>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        7 pending ($50,000,014,719.78) |
        1 executed today ($44.44) |
        1 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$44.44</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,014,706.65</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Ready to Execute</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (7)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Ready to Execute</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:48:23</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000010</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto test</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:20:37</td>
      </tr>
    </tbody>
        </table>
      

      
        <h3 style="color:#047857;">Executed Today (1)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000007</td>
        <td style="padding:8px;border:1px solid #ddd;">test</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$44.44</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">Completed</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:54:06</td>
      </tr>
    </tbody>
        </table>
      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-18 17:17:57');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('b93c8078353a4878591ce3d35d4cf2eb', '2026-03-19', '2026-03-19T18:55:18.046Z', NULL, 11, 50000075282.0481, 0, 0, 1, 0, '[{"status":"executed","count":1,"total":44.44},{"status":"pending_approval","count":9,"total":50000075221.6881},{"status":"ready_to_execute","count":2,"total":60.36},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000002","payee_name":"gusto","amount":13.13,"currency":"USD","usd_equivalent":13.13,"payment_type":"wire","status":"ready_to_execute","requester_name":"Colin Robbins","submitted_at":"2026-03-17 17:48:23","executed_at":null},{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000002","payee_name":"gusto","amount":47.23,"currency":"USD","usd_equivalent":47.23,"payment_type":"internal","status":"ready_to_execute","requester_name":"Colin Robbins","submitted_at":"2026-03-19 14:42:16","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-19</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        11 pending ($50,000,075,282.05) |
        0 executed today ($0.00) |
        1 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$44.44</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">9</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,221.69</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Ready to Execute</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$60.36</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (11)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Ready to Execute</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:48:23</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.23</td>
        <td style="padding:8px;border:1px solid #ddd;">INTERNAL</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Ready to Execute</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:16</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-19 18:55:18');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('2339404ca3e375ddfbe1f749d25aa003', '2026-03-20', '2026-03-20T22:00:00.913Z', NULL, 11, 50000075272.4281, 2, 60.36, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":11,"total":50000075272.4281},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null},{"reference_number":"PAY-20260319-000002","payee_name":"gusto","amount":47.23,"currency":"USD","usd_equivalent":47.23,"payment_type":"internal","status":"executed","requester_name":"Colin Robbins","submitted_at":"2026-03-19 14:42:16","executed_at":"2026-03-20 12:48:09"},{"reference_number":"PAY-20260317-000002","payee_name":"gusto","amount":13.13,"currency":"USD","usd_equivalent":13.13,"payment_type":"wire","status":"executed","requester_name":"Colin Robbins","submitted_at":"2026-03-17 17:48:23","executed_at":"2026-03-20 12:55:54"}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-20</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        11 pending ($50,000,075,272.43) |
        2 executed today ($60.36) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">11</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,272.43</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (11)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    </tbody>
        </table>
      

      
        <h3 style="color:#047857;">Executed Today (2)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.23</td>
        <td style="padding:8px;border:1px solid #ddd;">INTERNAL</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">Completed</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">Completed</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:48:23</td>
      </tr>
    </tbody>
        </table>
      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-20 22:00:00');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('ea7747e6853b0f8667aa5c4ca9bee60e', '2026-03-21', '2026-03-21T22:00:00.849Z', NULL, 11, 50000075272.4281, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":11,"total":50000075272.4281},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-21</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        11 pending ($50,000,075,272.43) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">11</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,272.43</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (11)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-21 22:00:00');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('7aa74a25af7a8993766c07a4ac4e1dab', '2026-03-22', '2026-03-23T14:26:53.755Z', NULL, 11, 50000075272.4281, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":11,"total":50000075272.4281},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-22</h2>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
        <strong>Retroactive report:</strong> This report was auto-generated on server startup to cover a missed scheduled run.
        Pending payment counts are best-effort reconstructions.
      </div>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        11 pending ($50,000,075,272.43) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">11</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,272.43</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (11)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-23 14:26:53');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('011ee2fdd341543ce68f6a1977cd0a5b', '2026-03-23', '2026-03-23T22:00:00.869Z', NULL, 11, 50000075272.4281, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":11,"total":50000075272.4281},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-23</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        11 pending ($50,000,075,272.43) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">11</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,075,272.43</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (11)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-23 22:00:00');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('785fa7a09aaa0f4adaf8b258fe4d05ac', '2026-03-24', '2026-03-24T22:00:00.843Z', NULL, 12, 50000078605.7581, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":12,"total":50000078605.7581},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null},{"reference_number":"PAY-20260324-000002","payee_name":"new person","amount":3333.33,"currency":"USD","usd_equivalent":3333.33,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-24 02:15:20","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-24</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        12 pending ($50,000,078,605.76) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,078,605.76</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (12)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">new person</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-24 22:00:00');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('2585889733211f9b818b4ef2c54e24fd', '2026-03-25', '2026-03-27T20:32:57.333Z', NULL, 12, 50000078605.7581, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":12,"total":50000078605.7581},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null},{"reference_number":"PAY-20260324-000002","payee_name":"new person","amount":3333.33,"currency":"USD","usd_equivalent":3333.33,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-24 02:15:20","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-25</h2>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
        <strong>Retroactive report:</strong> This report was auto-generated on server startup to cover a missed scheduled run.
        Pending payment counts are best-effort reconstructions.
      </div>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        12 pending ($50,000,078,605.76) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,078,605.76</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (12)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">new person</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-27 20:32:57');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('aa93ca51451d0d58b452861e52da1675', '2026-03-26', '2026-03-27T20:32:57.336Z', NULL, 12, 50000078605.7581, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":12,"total":50000078605.7581},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null},{"reference_number":"PAY-20260324-000002","payee_name":"new person","amount":3333.33,"currency":"USD","usd_equivalent":3333.33,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-24 02:15:20","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-26</h2>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
        <strong>Retroactive report:</strong> This report was auto-generated on server startup to cover a missed scheduled run.
        Pending payment counts are best-effort reconstructions.
      </div>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        12 pending ($50,000,078,605.76) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,078,605.76</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (12)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">new person</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-27 20:32:57');
INSERT INTO eod_reports (id, report_date, generated_at, generated_by, pending_count, pending_amount, executed_count, executed_amount, rejected_count, cancelled_count, pipeline_data, payments_data, html_body, created_at) VALUES ('af80fd64fe03c828e31b672a191ba2a6', '2026-03-27', '2026-03-27T20:32:57.352Z', NULL, 12, 50000078605.7581, 0, 0, 0, 0, '[{"status":"executed","count":3,"total":104.8},{"status":"pending_approval","count":12,"total":50000078605.7581},{"status":"returned","count":1,"total":55.16}]', '[{"reference_number":"PAY-20260317-000004","payee_name":"bills car shop","amount":14.1733,"currency":"USD","usd_equivalent":14.1733,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 17:52:46","executed_at":null},{"reference_number":"PAY-20260317-000005","payee_name":"fund a gusto account","amount":333.3348,"currency":"USD","usd_equivalent":333.3348,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:55:10","executed_at":null},{"reference_number":"PAY-20260317-000006","payee_name":"toys r us","amount":1312.13,"currency":"USD","usd_equivalent":1312.13,"payment_type":"ach","status":"pending_approval","requester_name":"Rachele Russo","submitted_at":"2026-03-17 17:57:13","executed_at":null},{"reference_number":"PAY-20260317-000008","payee_name":"gusto","amount":50000000000,"currency":"USD","usd_equivalent":50000000000,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-17 20:16:10","executed_at":null},{"reference_number":"PAY-20260317-000009","payee_name":"gusto","amount":13000.01,"currency":"USD","usd_equivalent":13000.01,"payment_type":"wire","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-17 20:18:36","executed_at":null},{"reference_number":"PAY-20260318-000002","payee_name":"test today","amount":13147.62,"currency":"USD","usd_equivalent":13147.62,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:51:16","executed_at":null},{"reference_number":"PAY-20260318-000003","payee_name":"johnny murphy","amount":37.42,"currency":"USD","usd_equivalent":37.42,"payment_type":"ach","status":"pending_approval","requester_name":"John Murphy","submitted_at":"2026-03-18 21:52:40","executed_at":null},{"reference_number":"PAY-20260318-000004","payee_name":"tax testing ","amount":47365,"currency":"USD","usd_equivalent":47365,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 22:37:54","executed_at":null},{"reference_number":"PAY-20260318-000005","payee_name":"new payee","amount":12,"currency":"USD","usd_equivalent":12,"payment_type":"ach","status":"pending_approval","requester_name":"Nahla Wardeh","submitted_at":"2026-03-18 23:18:56","executed_at":null},{"reference_number":"PAY-20260319-000003","payee_name":"gusto","amount":12.32,"currency":"USD","usd_equivalent":12.32,"payment_type":"ach","status":"pending_approval","requester_name":"Will Ott","submitted_at":"2026-03-19 18:59:12","executed_at":null},{"reference_number":"PAY-20260320-000002","payee_name":"bobby and ming","amount":38.42,"currency":"USD","usd_equivalent":38.42,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-20 19:40:48","executed_at":null},{"reference_number":"PAY-20260324-000002","payee_name":"new person","amount":3333.33,"currency":"USD","usd_equivalent":3333.33,"payment_type":"ach","status":"pending_approval","requester_name":"KC Deatsch","submitted_at":"2026-03-24 02:15:20","executed_at":null}]', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">End of Day Report — 2026-03-27</h2>
      

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        12 pending ($50,000,078,605.76) |
        0 executed today ($0.00) |
        0 rejected | 0 cancelled
      </div>

      <h3 style="color:#1e40af;">Payment Pipeline</h3>
      <table style="border-collapse:collapse;width:50%;font-size:13px;margin-bottom:24px;">
        <thead>
          <tr style="background:#dbeafe;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:center;">Count</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Total (USD)</th>
          </tr>
        </thead>
        <tbody>
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Completed</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$104.80</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">Pending Approval</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,078,605.76</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">returned</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$55.16</td>
    </tr>
  </tbody>
      </table>

      
        <h3 style="color:#b45309;">Pending Payments (12)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
        <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
        <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">test today</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
        <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
        <td style="padding:8px;border:1px solid #ddd;">new payee</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
        <td style="padding:8px;border:1px solid #ddd;">gusto</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
        <td style="padding:8px;border:1px solid #ddd;">new person</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
        <td style="padding:8px;border:1px solid #ddd;">ACH</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#d97706;font-weight:600;">Pending Approval</span></td>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      </tr>
    </tbody>
        </table>
      

      <p style="color:#666;">No payments executed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal at 6:00 PM ET.
      </p>
    </div>
  ', '2026-03-27 20:32:57');

-- Table: execution_confirmations
DROP TABLE IF EXISTS execution_confirmations;
CREATE TABLE execution_confirmations (
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

INSERT INTO execution_confirmations (id, payment_id, confirmer_id, confirmation_type, bank_reference, actual_amount, actual_date, confirmed_at, ip_address, user_agent, is_emergency_halt, halt_reason) VALUES ('3c5ae428367c68d343be7c9698c2ccb1', 'a6cdcb7198b11a51474a6309f4a83437', 'admin-001', 'primary', 'TEST-REF-123456', 47.23, '2026-03-20', '2026-03-20 12:48:09', '127.0.0.1', 'curl/8.18.0', 0, NULL);
INSERT INTO execution_confirmations (id, payment_id, confirmer_id, confirmation_type, bank_reference, actual_amount, actual_date, confirmed_at, ip_address, user_agent, is_emergency_halt, halt_reason) VALUES ('3e81772d84058994c9ca0edb450fa3f4', 'ff38c3c317ee2ac8d926be6d1b3dbe3a', 'admin-001', 'primary', 'WIRE-REF-987654', 13.13, '2026-03-20', '2026-03-20 12:55:54', '127.0.0.1', 'curl/8.18.0', 0, NULL);

-- Table: fx_rates
DROP TABLE IF EXISTS fx_rates;
CREATE TABLE fx_rates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      base_currency TEXT NOT NULL,
      target_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      source TEXT DEFAULT 'manual',
      fetched_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      UNIQUE(base_currency, target_currency)
    );

INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('7ad5330175560881e82b08a2213b8213', 'EUR', 'USD', 1.08, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('44d152ec1f841b2d16cfc266508e4072', 'GBP', 'USD', 1.26, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('87efd5ab19560bbfa954012f26c74ab8', 'CAD', 'USD', 0.74, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('54ff0d9cd56b8360b9bd1aac1c4da224', 'AUD', 'USD', 0.65, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('b408e4eae391851c6c1ee41acc872af7', 'JPY', 'USD', 0.0067, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('56f63a360ff4d810ba10e99971915dbc', 'SGD', 'USD', 0.74, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('dd646e49c2d92e4445d3d2a92cb7a3ed', 'MXN', 'USD', 0.058, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('129bff55f2d9c082f76821fb43ea6360', 'TRY', 'USD', 0.031, 'manual', '2026-03-18 17:11:17', NULL);
INSERT INTO fx_rates (id, base_currency, target_currency, rate, source, fetched_at, expires_at) VALUES ('9caf3d9962c58d84fc25250177dd1940', 'ILS', 'USD', 0.28, 'manual', '2026-03-18 17:11:17', NULL);

-- Table: group_accounts
DROP TABLE IF EXISTS group_accounts;
CREATE TABLE group_accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      direction TEXT NOT NULL CHECK (direction IN ('from', 'to', 'both')),
      funding_type TEXT NOT NULL DEFAULT 'both' CHECK (funding_type IN ('internal', 'external', 'both')),
      added_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, account_id, direction)
    );

INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('c628c0c6aca343120cd36fec5d4015d7', 'grp-treasury', 'acct-001', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b7765c0592638547504af92b823f17ce', 'grp-treasury', 'acct-002', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('945055c71aaa2a1fbdba154507fb0ca6', 'grp-treasury', 'acct-003', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('000cdb68cfe655fa6e41f63aeaef276f', 'grp-treasury', 'acct-004', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('4b7380c83bf81124837f356ff11745d2', 'grp-treasury', 'acct-jpm-9811', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('6d79954bd1ad862098b5d40bc2448b5c', 'grp-treasury', 'acct-9329', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('17fb83da67eb7a25d297a56b5926c6ee', 'grp-treasury', 'acct-9829', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('59a54b5216ae56c72f44b951dd4bc028', 'grp-treasury', 'acct-8961', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('7e8f60dc9faa0699f403e19c0cd6b469', 'grp-treasury', 'acct-9392', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('16b20f9b7c5114dd91c1798520e34332', 'grp-treasury', 'acct-3962', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('a70779a85c6ea86b55f07ef0ab9890a4', 'grp-treasury', 'acct-0566', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b93ac35924a80fc612e2326380394d25', 'grp-treasury', 'acct-7908', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('0bf60fbb58a8330411c12e5e5ff22c49', 'grp-treasury', 'acct-9378', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('274801a1b1122912d90bfc6a1f37ef27', 'grp-treasury', 'acct-0226', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('ee4cf5b92aa11cc68b17acfd7d9201b5', 'grp-treasury', 'acct-6826', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('3aadc6fb7372e53a53280079d5385651', 'grp-treasury', 'acct-0497', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('3ca0fa3098d874fb4911f8a2d1fc696f', 'grp-treasury', 'acct-7987', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('a8d4d0463c8ceada86f9b11daf9d1320', 'grp-treasury', 'acct-0446', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('a0a99006b42eb6e99a74788692a7c45a', 'grp-treasury', 'acct-5947', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('6eb210021858e06df636ddd9b9f1543b', 'grp-treasury', 'acct-0269', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('3ff1e29a72440f0b6ad850fdaee89ae1', 'grp-treasury', 'acct-2155', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('407a00f0311494fa4806e4effcb53cd4', 'grp-treasury', 'acct-2378', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('3200ec50de4f52f8541cd08928ac8f2e', 'grp-treasury', 'acct-5119', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('97128987f4ddfb2d9ec5516b377012ab', 'grp-treasury', 'acct-9803', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('9b9e92ea7665b8910298789b2bc2a941', 'grp-treasury', 'acct-5843', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('9fcc693360c07785b777db54c7e2af3c', 'grp-treasury', 'acct-6428', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('f51c7934ff60017726c950da1324367b', 'grp-treasury', 'acct-0673', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('e5dbc3a6599829744799802cbc9e5b00', 'grp-treasury', 'acct-8375', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('10fe8835bd4b63051dcd82516a7916c9', 'grp-treasury', 'acct-1602', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('9a8d4cdc22a4b2c2bc485020fcecf28b', 'grp-ap', 'acct-jpm-9811', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('ade43f8e9d2b0c78e58b214407da4ef9', 'grp-ap', 'acct-9329', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('a74998b63427642bff8c1d0f362ae1c1', 'grp-ap', 'acct-9829', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('afa0b53af1fe5716972b886dd1b39afc', 'grp-ap', 'acct-8961', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('e1ba590b779c803d66d6b4b6c589fc41', 'grp-ap', 'acct-9392', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('be1d27ad54a55ada23321623f4149358', 'grp-ap', 'acct-3962', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('45f4d91ad2739688a2ea95f4322c98f3', 'grp-ap', 'acct-0566', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('df54775ec13b3a7df766e5e4af71d894', 'grp-ap', 'acct-7908', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('ab3c50e5dc70a8ffe5474325060a704a', 'grp-ap', 'acct-9378', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('cab2b193fe7766d90e99aaab0b40b87c', 'grp-ap', 'acct-0226', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('95fa94d7d37d72439fd6b6bc8a6606b2', 'grp-ap', 'acct-6826', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('38e5227e702aaf5cdf1c667ec82142ea', 'grp-accounting', 'acct-jpm-9811', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('060ee2cc542d8490752146dc307857f8', 'grp-accounting', 'acct-0497', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('d663c63860daf8553d77833a807f8e35', 'grp-accounting', 'acct-7987', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b1ef69976d531939fbaf77d4bdfaeeac', 'grp-accounting', 'acct-0226', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('d8a4448ec864fcef27dab8343b3e68b2', 'grp-accounting', 'acct-9378', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b2f8a2fdd45e8dd4ed1510d5597431b0', 'grp-accounting', 'acct-8961', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('d8e082fb3a9aaaa4e4625022c1153c2c', 'grp-accounting', 'acct-7908', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('f6ff70cf326d842b7b0e6381758074f5', 'grp-accounting', 'acct-0446', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('0187be8fb6d43be34d546e8aa5a7a574', 'grp-accounting', 'acct-5947', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('6d66c1125943058e7a1413b8fe8d0b33', 'grp-accounting', 'acct-0269', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('20501113d45c91f8a1d3bca6138a06fe', 'grp-accounting', 'acct-2155', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('d554898fc2a50d71b6285e8345daaf6d', 'grp-payops', 'acct-jpm-9811', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('82fca8cee41ab80d9f033eb29835c183', 'grp-payops', 'acct-7908', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('366d8de0172cf8931f2a97bb5bbda1bc', 'grp-payops', 'acct-8961', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b3dae66f5ab293b5af779d81c911626e', 'grp-payops', 'acct-0226', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b91d540458eaf85498ce3a062e2698c1', 'grp-payops', 'acct-2378', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('29b33f841e0721de2a20675da08a633b', 'grp-payops', 'acct-5119', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('7ce7f85640639749cb76538132aaf7ff', 'grp-payops', 'acct-9803', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('8e08b271f2e5fed50a3a77ad83d292e6', 'grp-payops', 'acct-9829', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('16f3f45965f3ace597f63ad7ffc57318', 'grp-payops', 'acct-5843', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('09877185a54b64cdad9cdd697885e7d5', 'grp-payops', 'acct-6428', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('09b2a4dcaddaa1a3327a736b39cf09f9', 'grp-payops', 'acct-0673', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('0fa7f25e3c7a1555b28324dd19ac16bd', 'grp-payroll', 'acct-jpm-9811', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('e6427cf86e5923093df7043b4445c27d', 'grp-payroll', 'acct-0566', 'both', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('e9e6621741e4fd40296f76b561d6717d', 'grp-payroll', 'acct-8961', 'from', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('5e5c8f1a784f477f3f70d0d55c786eeb', 'grp-payroll', 'acct-0269', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('76dbfc7c574575d20b426595873aa42f', 'grp-payroll', 'acct-8375', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('1c15e51890bf2ec5beb647189aac1932', 'grp-payroll', 'acct-1602', 'to', 'both', 'admin-001', '2026-03-17 14:21:56');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('721a44d2a279297a4c56761e635503a7', 'grp-other', 'acct-9329', 'both', 'both', 'admin-001', '2026-03-18 23:14:53');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('3384760fc4248b2fad5ce023d29e1d4b', 'grp-other', 'acct-8961', 'both', 'both', 'admin-001', '2026-03-18 23:14:53');
INSERT INTO group_accounts (id, group_id, account_id, direction, funding_type, added_by, created_at) VALUES ('b5e3f21aacd676045220577edaa57e04', 'grp-other', 'acct-0566', 'both', 'both', 'admin-001', '2026-03-18 23:14:53');

-- Table: group_approval_steps
DROP TABLE IF EXISTS group_approval_steps;
CREATE TABLE group_approval_steps (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      tier_id TEXT NOT NULL REFERENCES group_approval_tiers(id) ON DELETE CASCADE,
      step INTEGER NOT NULL CHECK (step IN (1, 2)),
      approver_mode TEXT NOT NULL CHECK (approver_mode IN ('role', 'specific_user')),
      approver_role TEXT,
      specific_approver_id TEXT REFERENCES users(id),
      escalation_hours INTEGER DEFAULT 24, approver_pool TEXT DEFAULT 'group_or_treasury',
      UNIQUE(tier_id, step)
    );

-- Table: group_approval_tiers
DROP TABLE IF EXISTS group_approval_tiers;
CREATE TABLE group_approval_tiers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      min_amount REAL,
      max_amount REAL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

-- Table: group_members
DROP TABLE IF EXISTS group_members;
CREATE TABLE group_members (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      added_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')), role TEXT DEFAULT 'initiator_approver' CHECK (role IN ('requestor_only', 'initiator_approver')), is_supervisor INTEGER DEFAULT 0,
      UNIQUE(group_id, user_id)
    );

INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('ac1431874028bcd9c701ffe28036d27d', 'grp-treasury', 'user-006', NULL, '2026-03-16 15:38:15', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('6d2a02f89426131a5c9a933cabdb2736', 'grp-treasury', 'admin-001', NULL, '2026-03-16 15:38:15', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('673f46bf34e58da09912a0375f62602c', 'grp-treasury', 'user-bobby-cajucom', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('f3dfb1178730925ae9aefb7c54bf6cdd', 'grp-ap', 'user-roselle-ramos', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('f1fe360417cc83f42c4816ff123ffaf6', 'grp-ap', 'user-diana-roig', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('8281b0bbc885633253318caddb735628', 'grp-ap', 'user-syd-ramesh', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('b512829c609070f5b954df31c52affa8', 'grp-accounting', 'user-jecah-cabaling', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('97f0baab1f0e86647ad7d31d9d7eccf3', 'grp-accounting', 'user-haewon-han', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('d57f0183522df9d883c1100b9e30e1f2', 'grp-accounting', 'user-charles-sikazwe', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('d9beace3d0d9f7fdb88c54ddd78d2650', 'grp-accounting', 'user-kc-deatsch', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('9957359084be3e44aa7fc7bc2904cd04', 'grp-accounting', 'user-rachele-russo', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('527d6ba506f561884232718d4f35f4e5', 'grp-payops', 'user-frank-devoe', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('c4b2c8610fe846cc59c13215c5975be7', 'grp-payops', 'user-john-tullis', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('b10c63d89c84959dd88ac71c946e9ea9', 'grp-payops', 'user-amanda-wong', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('7015ac6324cbf00b526df2edb5605d88', 'grp-payroll', 'user-clarice-norman-mclean', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('d199d09d82f9eb994f67e5a4dfde5999', 'grp-payroll', 'user-glydel-arioste', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('377f007497ac0b446f28b7e9ef02b265', 'grp-payroll', 'user-colin-robbins', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('a4dfa1302c5242e07c00511a62bf83bf', 'grp-payroll', 'user-kc-deatsch', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 1);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('f3178f209754f0008835f2a627c1d3e1', 'grp-other', 'user-nahla-wardeh', 'admin-001', '2026-03-17 14:21:56', 'initiator_approver', 0);
INSERT INTO group_members (id, group_id, user_id, added_by, created_at, role, is_supervisor) VALUES ('cbfed60455df1607d1c5d612255fee4b', 'grp-accounting', '5b5e0165d458765c2f4dda8b2a9d6d50', 'admin-001', '2026-03-19 18:57:54', 'initiator_approver', 0);

-- Table: group_routing_change_log
DROP TABLE IF EXISTS group_routing_change_log;
CREATE TABLE group_routing_change_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      changed_by TEXT NOT NULL REFERENCES users(id),
      changed_by_email TEXT,
      change_type TEXT NOT NULL,
      old_config TEXT,
      new_config TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

-- Table: groups
DROP TABLE IF EXISTS groups;
CREATE TABLE groups (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      override_approval_flow INTEGER DEFAULT 0,
      approval_trigger_mode TEXT DEFAULT 'flat' CHECK (approval_trigger_mode IN ('flat', 'amount_threshold')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    , routing_mode TEXT DEFAULT 'approval_chain', approval_chain_option TEXT DEFAULT 'one_approver');

INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-treasury', 'Treasury', 'treasury', 'Treasury team — portal administrators with full access', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');
INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-payroll', 'Payroll', 'payroll', 'Payroll team — manages payroll-related payments', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');
INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-ap', 'Accounts Payable', 'accounts-payable', 'AP team — handles vendor and bill payments', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');
INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-accounting', 'Accounting', 'accounting', 'Accounting team — general ledger and reconciliation', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');
INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-payops', 'Payment Ops / Platform Accounting', 'payment-ops', 'Payment operations and platform accounting team', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');
INSERT INTO groups (id, name, slug, description, override_approval_flow, approval_trigger_mode, created_at, updated_at, routing_mode, approval_chain_option) VALUES ('grp-other', 'Other', 'other', 'Users not assigned to a specific department group', 0, 'flat', '2026-03-16 15:38:15', '2026-03-16 15:38:15', 'approval_chain', 'one_approver');

-- Table: ip_allowlist
DROP TABLE IF EXISTS ip_allowlist;
CREATE TABLE ip_allowlist (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      cidr TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

-- Table: new_account_tracker
DROP TABLE IF EXISTS new_account_tracker;
CREATE TABLE new_account_tracker (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_name TEXT NOT NULL,
      bank TEXT NOT NULL,
      legal_entity TEXT,
      purpose TEXT,
      requesting_team TEXT,
      status TEXT NOT NULL DEFAULT 'In Progress',
      assigned_to TEXT,
      requested_date DATE,
      target_open_date DATE,
      actual_open_date DATE,
      notes TEXT,
      priority TEXT DEFAULT 'Normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO new_account_tracker (id, account_name, bank, legal_entity, purpose, requesting_team, status, assigned_to, requested_date, target_open_date, actual_open_date, notes, priority, created_at, updated_at) VALUES ('nat-001', 'Gusto PEO I LLC Operating', 'JPMorgan Chase', 'Gusto PEO I LLC', 'PEO Operations', 'Treasury', 'KYC In Progress', 'Treasury', NULL, '2026-06-30', NULL, NULL, 'High', '2026-03-18 22:56:02', '2026-03-18 22:56:02');
INSERT INTO new_account_tracker (id, account_name, bank, legal_entity, purpose, requesting_team, status, assigned_to, requested_date, target_open_date, actual_open_date, notes, priority, created_at, updated_at) VALUES ('nat-002', 'Gusto PEO II LLC Operating', 'JPMorgan Chase', 'Gusto PEO II LLC', 'PEO Operations', 'Treasury', 'KYC In Progress', 'Treasury', NULL, '2026-06-30', NULL, NULL, 'High', '2026-03-18 22:56:02', '2026-03-18 22:56:02');
INSERT INTO new_account_tracker (id, account_name, bank, legal_entity, purpose, requesting_team, status, assigned_to, requested_date, target_open_date, actual_open_date, notes, priority, created_at, updated_at) VALUES ('nat-003', 'GustoHR Inc Operating', 'JPMorgan Chase', 'GustoHR Inc', 'HR Operations', 'Treasury', 'Requested', 'Treasury', NULL, '2026-06-30', NULL, NULL, 'Normal', '2026-03-18 22:56:02', '2026-03-18 22:56:02');

-- Table: notification_log
DROP TABLE IF EXISTS notification_log;
CREATE TABLE notification_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      notification_type TEXT NOT NULL,
      recipient_user_id TEXT,
      recipient_name TEXT,
      recipient_email TEXT,
      recipient_slack_id TEXT,
      channel TEXT NOT NULL,
      subject TEXT,
      message_body TEXT,
      payment_id TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivery_status TEXT DEFAULT 'sent',
      error_message TEXT
    );

INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('df0f620ca6e3caf9494b8314d2842f82', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 17:44:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('2c18846b6b7ffeaa82dbba033539c7a5', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 17:44:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('085473337abe74a76653e1182a902e51', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 17:44:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('dd160b46f1dd8a834b2df563520546bc', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 20:53:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('22f163ddbabc683cb926c8dda9f6c622', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 20:53:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('633353c56faeea2e02792b8e9b881b18', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 20:53:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('d6326490bd3117e8d0f8ce04a6e8e089', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:35:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('e86e0592979a904edecf05532a0c609b', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:35:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('40ac621ffb644b78150c10955fc6fe70', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:35:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('88fbade10deb2fb9b01a87bea78842d6', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:41:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('cb84d263f73446a092184132d299d2a1', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:41:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('313ee42e5852c9874a5bdfa3832f4579', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:41:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('6e26243ceb7982a0feb4f63f1d980069', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:43:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('bc9b67d69d00a5e1579970e895ece998', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:43:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('07665daf9676a01738f21ae35665a78d', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:43:02', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('bdf1b70bd35cce1fc0e88a04d22d0eb5', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:46:23', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('2a0ea223ebb29f00106769d90f228c47', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:46:23', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('1d1176532f2239f5c0781e7138975520', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 21:46:23', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('51d5564bbffbfdf6bfaba31d3074a3f6', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('e3518ebfb124e6c0d1fda9bea37c2375', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('eb3a530ae4fea27c88eb266c922aa3a2', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('d2730d1d2cab708177eceb6980ef2db1', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:56:07', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('4094cbd37c02d2368c2c7a79d3f50d2f', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:56:07', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('a41e6b0160aabd8d0294104ed3a17f13', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-18', NULL, NULL, '2026-03-18 22:56:07', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('d94f6e8bf55b3b69a55f5a46b8795ccd', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 12:49:27', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('b21672669cde3a2661847f06d3906dd4', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 12:49:27', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('6523ea2892ee5ba9e1fdb8ca228f9d12', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 12:49:27', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('c0248b2c36cef584c93d51e15b82453b', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:47:33', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('d3d16ab83beb127b399382d5b8f9fb39', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:47:33', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('01f67e1872dbef929590948b3db38589', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:47:33', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('feb148d23798366f5bf283edb49f96fb', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:58:52', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('165d0ffbea1b239f500740896b3c4a58', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:58:52', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('74ebb79dc63463420be4bda397df7235', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 13:58:52', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('b77fad1c4d1dd33f02d0c451a5b65389', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 14:47:37', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('7ebfc3daa097d6c5f1a4a445508b2bf4', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 14:47:37', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('865cb6ad6109ad79bf622d7ce99d2ce0', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 14:47:37', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('6f0401a7a718efe31104f85bfcb336e8', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 16:43:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('8753d2cb7c985196676dee442a029765', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 16:43:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('123664618fa2d26b49c6a44eb4075ecd', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 16:43:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('78bf1351a61ff8b6eb64e0f5ad8b82fe', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 18:55:17', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('269b0657ad5de0236ada67b45dff228c', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 18:55:18', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('3641c612c7e45ca9fca88a3d7cf24aee', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-19', NULL, NULL, '2026-03-19 18:55:18', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('c91b992dc64f78eb661cb80c800bd4c6', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:28:28', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('23484012c55850dbcbc909fadca7b161', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:28:28', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('7b3a8cb685597687e8af37de7e0728a2', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:28:28', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('189a05b903ba50c8dc1361ce04df42c2', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('02ad7c30e6b780ec9880e2c9dad1dc3d', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('bce2f5e39324b0d8c8c01a3caedb882b', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('e741e1de9cd96a22eb75de13f61a373b', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('63b604c7fc3b6dd634e653739c0ce7b2', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('a371a1e4eb13c945853b7ca071ec6330', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 12:55:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('e85de2219a93436f3647b2dc97285796', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('0f30351bdec42d6cf72aa449578b2404', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('172b8252374d90164618cf6be8fa3180', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-20', NULL, NULL, '2026-03-20 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('f5ebd58e4c215ba7212bec113a21b1a9', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-21', NULL, NULL, '2026-03-21 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('bb82361198bc5cb2667396ba41cf2ae3', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-21', NULL, NULL, '2026-03-21 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('1bed2dc36eb7fbd09f876f1c698c7b1a', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-21', NULL, NULL, '2026-03-21 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('cdf65b6b8a1dc9fe2a4591d0f4c6be53', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 14:26:53', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('3db41f01f3ab6ef31f80cd171cff525f', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 14:26:53', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('e740da784845b558c5d3d0fcdebd5080', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 14:26:53', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('ffd60df2e4b500850cef5e44aa9b04ef', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 15:38:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('30eb8cd0cebdc8741a166ec774916108', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 15:38:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('abb80904520cc1fabe7f85393c3e147d', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 15:38:47', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('cd9a792b6f99e7868c6f2c0ba09618d5', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('f23cb30262b763392a740fb91e211a48', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('3466b59b265d669b90c215f8e8413742', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-23', NULL, NULL, '2026-03-23 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('a71d3b806c9c84b0e76dddf9a6fb8be4', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-24', NULL, NULL, '2026-03-24 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('ec3981d8feca8b3f5d6041e9f4827011', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-24', NULL, NULL, '2026-03-24 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('38c141c43f49bb31a4aab7a739781d2d', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-24', NULL, NULL, '2026-03-24 22:00:00', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('6230d76d38428a560144b8c91d66492e', 'eod_report', NULL, NULL, 'john.murphy@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-27', NULL, NULL, '2026-03-27 20:32:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('bfddfdb9842e9644312fc22fe238b20e', 'eod_report', NULL, NULL, 'ming.huey@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-27', NULL, NULL, '2026-03-27 20:32:57', 'failed', NULL);
INSERT INTO notification_log (id, notification_type, recipient_user_id, recipient_name, recipient_email, recipient_slack_id, channel, subject, message_body, payment_id, sent_at, delivery_status, error_message) VALUES ('1cd542d3dd652e98e2a3702654be3506', 'eod_report', NULL, NULL, 'treasury@gusto.com', NULL, 'email', '[Treasury Portal] Daily Payments Summary – 2026-03-27', NULL, NULL, '2026-03-27 20:32:57', 'failed', NULL);

-- Table: notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
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

INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('731e88218ae8d95bcc134dceba004364', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-18', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-18</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000010</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto test</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:20:37</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 9 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,075,256.69
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":9,"pendingTotal":50000075256.6881,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-18 22:56:07');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('2213355ed6303e1dd677ed4d2a4ab9b9', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-18', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-18</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        23 total users — 23 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>1</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (23)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:38:03</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 21:17:18</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 16:23:27</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:39:31</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-18","totalUsers":23,"activeCount":23,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":1,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-18 22:38:03","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 21:17:18","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 16:23:27","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 22:39:31","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-18 22:56:07');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('8b29b23306707f5407517d2244082cba', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-19', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-19</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 9 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,075,221.69
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":9,"pendingTotal":50000075221.6881,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-19 18:55:18');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('9dbc3fc59aee216c3744c6cdf94353f9', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-19', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-19</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        23 total users — 23 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>1</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (23)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:53:18</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-19","totalUsers":23,"activeCount":23,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":1,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-19 18:53:18","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-19 18:55:18');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('5514e2fd918fd3731f89ada5aeffa609', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-20', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-20</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 11 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,075,272.43
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#d1fae5;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Treasury Approved</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Confirmed Sent</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Confirmed By</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47.23</td>
      <td style="padding:8px;border:1px solid #ddd;">INTERNAL</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:16</td>
      <td style="padding:8px;border:1px solid #ddd;">—</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 12:48:09</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13.13</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:48:23</td>
      <td style="padding:8px;border:1px solid #ddd;">—</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 12:55:54</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total completed today:</strong> 2 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $60.36
          </p>
        

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":11,"pendingTotal":50000075272.4281,"completedCount":2,"completedTotal":60.36,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-20 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('c080f7c1f125f6ee7b4260bbc7b82342', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-20', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-20</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:57</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 17:45:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:39:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:06</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-20","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-20 19:40:57","firstLogin":"2026-03-18 17:45:12","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","firstLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","firstLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-20 19:39:32","firstLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","firstLogin":"2026-03-18 22:37:06","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","firstLogin":null,"accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-20 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('53f9a705a2c1ca6579930d7cd3e22e18', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-21', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-21</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:57</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 17:45:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:39:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:06</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-21","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-20 19:40:57","firstLogin":"2026-03-18 17:45:12","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","firstLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","firstLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-20 19:39:32","firstLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","firstLogin":"2026-03-18 22:37:06","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","firstLogin":null,"accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-21 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('cd165197c219585bc4f765d3df24f72d', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-21', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-21</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">2</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">1</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 11 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,075,272.43
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":11,"pendingTotal":50000075272.4281,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-21 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('6796a45f6565686b59fc3f06c974f8c3', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-22', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-22</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-23 14:20:24</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:39:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-22","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-23 14:20:24","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-20 19:39:32","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-22T18:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('859f90e4872d47e12157552fabd126d1', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-23', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-23</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">5</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">5</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 11 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,075,272.43
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":11,"pendingTotal":50000075272.4281,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-23 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('65ef4c953fda30317f9b04049ba9bb5b', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-23', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-23</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-23 19:28:34</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 17:45:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:39:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:06</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-23","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-23 19:28:34","firstLogin":"2026-03-18 17:45:12","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","firstLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","firstLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-20 19:39:32","firstLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","firstLogin":"2026-03-18 22:37:06","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","firstLogin":null,"accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-23 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('6fa76a94c7dc210d821588d79b9f0a6f', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-24', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-24</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 17:45:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:14:42</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:06</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-24","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-24 02:15:32","firstLogin":"2026-03-18 17:45:12","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","firstLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","firstLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-24 02:14:42","firstLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","firstLogin":"2026-03-18 22:37:06","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","firstLogin":null,"accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-24 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('a219bab9ce7280278923bb599f4536d2', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-24', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-24</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">6</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">5</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">5</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">5</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">4</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">new person</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">0</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 12 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,078,605.76
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":12,"pendingTotal":50000078605.7581,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-24 22:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('512f140fb946eaf5bf2bf38748a5b4f5', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-25', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-25</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:14:42</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-25","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-24 02:15:32","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-24 02:14:42","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-25T18:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('2314692a713aa0800293812e043c2fb4', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-26', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-26</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:14:42</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-26","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-24 02:15:32","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-24 02:14:42","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-26T18:00:00');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('ad968e0170b8707e8df43e3faf43040c', NULL, NULL, 'pending_payments_summary', 'email', 'john.murphy@gusto.com, ming.huey@gusto.com, treasury@gusto.com', NULL, '[Treasury Portal] Daily Payments Summary – 2026-03-27', '
    <div style="font-family:Arial,sans-serif;max-width:960px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily Payments Summary — 2026-03-27</h2>

      <!-- Section 1: Pending Payments -->
      <h3 style="color:#b45309;margin-top:24px;">Pending Payments (from 2026-02-25)</h3>
      
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr style="background:#fef3c7;">
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Reference</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payee</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Type</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Funding</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Submitted</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:center;">Days Pending</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Waiting On</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Requester</th>
              </tr>
            </thead>
            <tbody>
              
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">bills car shop</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$14.17</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:52:46</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">10</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">fund a gusto account</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:55:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">10</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000006</td>
      <td style="padding:8px;border:1px solid #ddd;">toys r us</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$1,312.13</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 17:57:13</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">10</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000008</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$50,000,000,000.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:16:10</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">10</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260317-000009</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,000.01</td>
      <td style="padding:8px;border:1px solid #ddd;">WIRE</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-17 20:18:36</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">10</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">test today</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$13,147.62</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:51:16</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">8</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">johnny murphy</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$37.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">external</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 21:52:40</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">8</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000004</td>
      <td style="padding:8px;border:1px solid #ddd;">tax testing </td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$47,365.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:54</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">8</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260318-000005</td>
      <td style="padding:8px;border:1px solid #ddd;">new payee</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.00</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:56</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">8</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260319-000003</td>
      <td style="padding:8px;border:1px solid #ddd;">gusto</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$12.32</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:59:12</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">8</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260320-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">bobby and ming</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$38.42</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-20 19:40:48</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">7</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">PAY-20260324-000002</td>
      <td style="padding:8px;border:1px solid #ddd;">new person</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$3,333.33</td>
      <td style="padding:8px;border:1px solid #ddd;">ACH</td>
      <td style="padding:8px;border:1px solid #ddd;">internal</td>
      <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:20</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">3</td>
      <td style="padding:8px;border:1px solid #ddd;">any</td>
      <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
    </tr>
  
            </tbody>
          </table>
          <p style="margin-top:12px;font-size:13px;color:#333;">
            <strong>Total pending:</strong> 12 payment(s) &nbsp;|&nbsp;
            <strong>Total amount:</strong> $50,000,078,605.76
          </p>
        

      <!-- Section 2: Completed Payments (Today) -->
      <h3 style="color:#047857;margin-top:32px;">Completed Payments (Today)</h3>
      <p style="color:#666;">No payments were completed today.</p>

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:12px;color:#999;">
        This is an automated message from the Gusto Treasury Portal. Do not reply to this email.
      </p>
    </div>
  ', NULL, '{"pendingCount":12,"pendingTotal":50000078605.7581,"completedCount":0,"completedTotal":0,"recipients":["john.murphy@gusto.com","ming.huey@gusto.com","treasury@gusto.com"]}', NULL, 'draft', NULL, 0, '2026-03-27 20:32:57');
INSERT INTO notifications (id, user_id, payment_id, type, channel, recipient_email, recipient_slack_id, subject, body, template_name, template_data, sent_at, status, error_message, retry_count, created_at) VALUES ('8b1edb1abdd46d60188766133a9c0f46', NULL, NULL, 'user_permissions_report', 'in_app', NULL, NULL, '[Treasury Portal] Daily User Permissions Report — 2026-03-27', '
    <div style="font-family:Arial,sans-serif;max-width:1000px;margin:0 auto;">
      <h2 style="color:#1a1a1a;">Daily User Permissions Report — 2026-03-27</h2>

      <div style="margin-bottom:20px;">
        <strong>Summary:</strong>
        24 total users — 24 active, 0 suspended, 0 pending
        <ul style="margin-top:8px;"><li>Administrator: <strong>5</strong></li><li>Senior Manager: <strong>2</strong></li><li>Manager: <strong>16</strong></li><li>Staff: <strong>1</strong></li></ul>
      </div>

      
        <h3 style="color:#047857;">Active Users (24)</h3>
        <table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:24px;">
          <thead>
    <tr style="background:#f3f4f6;">
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Email</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Role</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Department</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Title</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Payment Limit</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Account Access</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Status</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">Last Login</th>
      <th style="padding:8px;border:1px solid #ddd;text-align:left;">First Login</th>
    </tr>
  </thead>
          <tbody>
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Bobby Cajucom</td>
        <td style="padding:8px;border:1px solid #ddd;">bobby.cajucom@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diego Torres</td>
        <td style="padding:8px;border:1px solid #ddd;">diego.torres@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">CFO / Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Murphy</td>
        <td style="padding:8px;border:1px solid #ddd;">john.murphy@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">System Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:15:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 17:45:12</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Linda Kim</td>
        <td style="padding:8px;border:1px solid #ddd;">linda.kim@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Ming Huey</td>
        <td style="padding:8px;border:1px solid #ddd;">ming.huey@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Administrator</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury</td>
        <td style="padding:8px;border:1px solid #ddd;">Treasury Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Maria Rodriguez</td>
        <td style="padding:8px;border:1px solid #ddd;">maria.rodriguez@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Will Ott</td>
        <td style="padding:8px;border:1px solid #ddd;">will.ott@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Senior Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Employee</td>
        <td style="padding:8px;border:1px solid #ddd;">$500,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 18:58:32</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Amanda Wong</td>
        <td style="padding:8px;border:1px solid #ddd;">amanda.wong@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Charles Sikazwe</td>
        <td style="padding:8px;border:1px solid #ddd;">charles.sikazwe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Clarice Norman-McLean</td>
        <td style="padding:8px;border:1px solid #ddd;">clarice.norman-mclean@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Colin Robbins</td>
        <td style="padding:8px;border:1px solid #ddd;">colin.robbins@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:41:38</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Diana Roig</td>
        <td style="padding:8px;border:1px solid #ddd;">diana.roig@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Frank DeVoe</td>
        <td style="padding:8px;border:1px solid #ddd;">frank.devoe@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Glydel Arioste</td>
        <td style="padding:8px;border:1px solid #ddd;">glydel.arioste@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payroll</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Haewon Han</td>
        <td style="padding:8px;border:1px solid #ddd;">haewon.han@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">James Park</td>
        <td style="padding:8px;border:1px solid #ddd;">james.park@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">$250,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Jecah Cabaling</td>
        <td style="padding:8px;border:1px solid #ddd;">jecah.cabaling@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">John Tullis</td>
        <td style="padding:8px;border:1px solid #ddd;">john.tullis@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Payment Ops / Platform Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">KC Deatsch</td>
        <td style="padding:8px;border:1px solid #ddd;">kc.deatsch@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-24 02:14:42</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-19 14:42:39</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Nahla Wardeh</td>
        <td style="padding:8px;border:1px solid #ddd;">nahla.wardeh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Other</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 23:18:19</td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-18 22:37:06</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Rachele Russo</td>
        <td style="padding:8px;border:1px solid #ddd;">rachele.russo@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounting</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">2026-03-17 19:56:25</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Roselle Ramos</td>
        <td style="padding:8px;border:1px solid #ddd;">roselle.ramos@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Syd Ramesh</td>
        <td style="padding:8px;border:1px solid #ddd;">syd.ramesh@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Manager</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">—</td>
        <td style="padding:8px;border:1px solid #ddd;">Unlimited</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Sarah Chen</td>
        <td style="padding:8px;border:1px solid #ddd;">sarah.chen@gusto.com</td>
        <td style="padding:8px;border:1px solid #ddd;">Staff</td>
        <td style="padding:8px;border:1px solid #ddd;">Accounts Payable</td>
        <td style="padding:8px;border:1px solid #ddd;">AP Specialist</td>
        <td style="padding:8px;border:1px solid #ddd;">$50,000</td>
        <td style="padding:8px;border:1px solid #ddd;">All accounts</td>
        <td style="padding:8px;border:1px solid #ddd;"><span style="color:#16a34a;font-weight:600;">active</span></td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
        <td style="padding:8px;border:1px solid #ddd;">Never</td>
      </tr>
    </tbody>
        </table>
      

      

      

      <hr style="margin-top:24px;border:none;border-top:1px solid #eee;" />
      <p style="font-size:11px;color:#999;">
        Auto-generated by the Gusto Treasury Portal. This report is stored daily for compliance and audit purposes.
      </p>
    </div>
  ', NULL, '{"date":"2026-03-27","totalUsers":24,"activeCount":24,"suspendedCount":0,"pendingCount":0,"roleCounts":{"admin":5,"sr_manager":2,"manager":16,"staff":1},"users":[{"name":"Bobby Cajucom","email":"bobby.cajucom@gusto.com","role":"admin","status":"active","department":"Treasury","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Diego Torres","email":"diego.torres@gusto.com","role":"admin","status":"active","department":"Treasury","title":"CFO / Administrator","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Murphy","email":"john.murphy@gusto.com","role":"admin","status":"active","department":"Treasury","title":"System Administrator","paymentLimit":null,"lastLogin":"2026-03-24 02:15:32","firstLogin":"2026-03-18 17:45:12","accountRestrictions":null},{"name":"Linda Kim","email":"linda.kim@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Ming Huey","email":"ming.huey@gusto.com","role":"admin","status":"active","department":"Treasury","title":"Treasury Manager","paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Maria Rodriguez","email":"maria.rodriguez@gusto.com","role":"sr_manager","status":"active","department":"Accounts Payable","title":"Senior AP Manager","paymentLimit":500000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Will Ott","email":"will.ott@gusto.com","role":"sr_manager","status":"active","department":null,"title":"Employee","paymentLimit":500000,"lastLogin":"2026-03-19 18:58:32","firstLogin":"2026-03-19 18:58:32","accountRestrictions":null},{"name":"Amanda Wong","email":"amanda.wong@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Charles Sikazwe","email":"charles.sikazwe@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Clarice Norman-McLean","email":"clarice.norman-mclean@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Colin Robbins","email":"colin.robbins@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":"2026-03-19 14:41:38","firstLogin":"2026-03-19 14:41:38","accountRestrictions":null},{"name":"Diana Roig","email":"diana.roig@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Frank DeVoe","email":"frank.devoe@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Glydel Arioste","email":"glydel.arioste@gusto.com","role":"manager","status":"active","department":"Payroll","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Haewon Han","email":"haewon.han@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"James Park","email":"james.park@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":"AP Manager","paymentLimit":250000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Jecah Cabaling","email":"jecah.cabaling@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"John Tullis","email":"john.tullis@gusto.com","role":"manager","status":"active","department":"Payment Ops / Platform Accounting","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"KC Deatsch","email":"kc.deatsch@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-24 02:14:42","firstLogin":"2026-03-19 14:42:39","accountRestrictions":null},{"name":"Nahla Wardeh","email":"nahla.wardeh@gusto.com","role":"manager","status":"active","department":"Other","title":null,"paymentLimit":null,"lastLogin":"2026-03-18 23:18:19","firstLogin":"2026-03-18 22:37:06","accountRestrictions":null},{"name":"Rachele Russo","email":"rachele.russo@gusto.com","role":"manager","status":"active","department":"Accounting","title":null,"paymentLimit":null,"lastLogin":"2026-03-17 19:56:25","firstLogin":null,"accountRestrictions":null},{"name":"Roselle Ramos","email":"roselle.ramos@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Syd Ramesh","email":"syd.ramesh@gusto.com","role":"manager","status":"active","department":"Accounts Payable","title":null,"paymentLimit":null,"lastLogin":null,"firstLogin":null,"accountRestrictions":null},{"name":"Sarah Chen","email":"sarah.chen@gusto.com","role":"staff","status":"active","department":"Accounts Payable","title":"AP Specialist","paymentLimit":50000,"lastLogin":null,"firstLogin":null,"accountRestrictions":null}]}', NULL, 'generated', NULL, 0, '2026-03-27 20:32:57');

-- Table: payment_approvals
DROP TABLE IF EXISTS payment_approvals;
CREATE TABLE payment_approvals (
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
    , approver_pool TEXT, group_id TEXT);

INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('5391784a3699750f6d1f7a1dc74437a4', 'ff38c3c317ee2ac8d926be6d1b3dbe3a', 'user-kc-deatsch', 'any', 1, 'approved', NULL, '2026-03-17 17:48:23', '2026-03-17 17:53:14', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 17:48:23', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('e20819c07dc77ca7ba424114278dc639', '54cc69217aafcc3c3958e47740d4ced5', 'admin-001', 'any', 1, 'returned', 'not sure i understand this tesl', '2026-03-17 17:50:44', '2026-03-17 20:56:45', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 17:50:44', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('d97df213b331aa7a02d99ed8f55e5bf3', 'be2d7b856949fd50fa5e71e4c53e2ccb', NULL, 'any', 1, 'pending', NULL, '2026-03-17 17:52:46', NULL, NULL, NULL, NULL, NULL, '2026-03-17 17:52:46', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('fc176fd69757cc52e725f474f9fcb2ec', 'c9de0af7bab90e9100a188f3c2b65b51', NULL, 'any', 1, 'pending', NULL, '2026-03-17 17:55:10', NULL, NULL, NULL, NULL, NULL, '2026-03-17 17:55:10', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('de2015583758124666b26dee8baee306', 'b20c3c49c5646c66fb562148f89d7915', NULL, 'any', 1, 'pending', NULL, '2026-03-17 17:57:13', NULL, NULL, NULL, NULL, NULL, '2026-03-17 17:57:13', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('75f1225d4b6263286394e4bba8ed1302', 'e1cedc05242f6b537f5db5da74c40dbc', 'user-rachele-russo', 'any', 1, 'approved', NULL, '2026-03-17 19:54:06', '2026-03-17 19:54:33', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 19:54:06', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('80a446e5fbf55b0ef7b089f491aee052', '97749fdde7918ce14225843d3022f4e2', NULL, 'any', 1, 'pending', NULL, '2026-03-17 20:16:10', NULL, NULL, NULL, NULL, NULL, '2026-03-17 20:16:10', 'group_or_treasury', 'grp-treasury');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('3f8cb5ffc66fa78d5d81c9b7bd2b0ca2', '97749fdde7918ce14225843d3022f4e2', NULL, 'any', 2, 'pending', NULL, '2026-03-17 20:16:10', NULL, NULL, NULL, NULL, NULL, '2026-03-17 20:16:10', 'group_or_treasury', 'grp-treasury');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('d2bf2de54f6728f74f31919f2bc3c669', '9f8757ec0d736a3a666cc1a4bd3210dc', NULL, 'any', 1, 'pending', NULL, '2026-03-17 20:18:36', NULL, NULL, NULL, NULL, NULL, '2026-03-17 20:18:36', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('7fb3c712058f99bec8090a1b37926116', '9d55262eceed4a4be77cb7afa25b054c', 'user-kc-deatsch', 'any', 1, 'rejected', 'need more info', '2026-03-17 20:20:37', '2026-03-19 14:42:59', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 20:20:37', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('acb00503a351759d878760aeea2dd52c', 'ecf299067123c66903fe2a42acfcbc11', 'user-colin-robbins', 'any', 1, 'rejected', 'not sure this is right?
', '2026-03-17 20:39:01', '2026-03-17 20:40:22', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 20:39:01', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('facc32eedb2bb22a51af8cf4a8be2953', '54cc69217aafcc3c3958e47740d4ced5', 'admin-001', 'any', 1, 'returned', 'need more details as reason isn''t clear', '2026-03-17 21:00:20', '2026-03-17 21:13:56', NULL, NULL, '127.0.0.1', NULL, '2026-03-17 21:00:20', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('45dfe22d00aa56ce2a8c9f838785ae83', '62153b5fb0346b3c48e35d1d8eafa5c7', NULL, 'any', 1, 'pending', NULL, '2026-03-18 21:51:16', NULL, NULL, NULL, NULL, NULL, '2026-03-18 21:51:16', 'group_or_treasury', 'grp-payops');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('87ab4ff2bbb1488a2f0035ddbf5a9f77', '5c9d233d1fd1b7924e68c80c64b7e8d5', NULL, 'any', 1, 'pending', NULL, '2026-03-18 21:52:40', NULL, NULL, NULL, NULL, NULL, '2026-03-18 21:52:40', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('19a4a98b574192dabf07e5cf783b766d', '92d04f8d263ff0f6fd06ab9e0d582e52', NULL, 'any', 1, 'pending', NULL, '2026-03-18 22:37:54', NULL, NULL, NULL, NULL, NULL, '2026-03-18 22:37:54', 'group_or_treasury', 'grp-ap');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('31447f45118baf2c7e5639e8cd0b6392', '4850162874f172b52457f26196b054ea', NULL, 'any', 1, 'pending', NULL, '2026-03-18 23:18:56', NULL, NULL, NULL, NULL, NULL, '2026-03-18 23:18:56', 'group_or_treasury', 'grp-ap');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('50c5e739509074379e8c791fe00028e6', 'a6cdcb7198b11a51474a6309f4a83437', 'user-kc-deatsch', 'any', 1, 'approved', NULL, '2026-03-19 14:42:16', '2026-03-19 14:42:53', NULL, NULL, '127.0.0.1', NULL, '2026-03-19 14:42:16', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('87c7aa58bf16ca97404c7fc8a8761051', '40cb5c98f71f685c6701261c88de28e8', NULL, 'any', 1, 'pending', NULL, '2026-03-19 18:59:12', NULL, NULL, NULL, NULL, NULL, '2026-03-19 18:59:12', 'group_or_treasury', 'grp-accounting');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('789cfbd7abbe1edc4e90452400528d29', '017e5ad3286d88aeb9e14c0276453f5c', NULL, 'any', 1, 'pending', NULL, '2026-03-20 19:40:48', NULL, NULL, NULL, NULL, NULL, '2026-03-20 19:40:48', 'group_or_treasury', 'grp-payroll');
INSERT INTO payment_approvals (id, payment_id, approver_id, approver_role, step_number, action, comment, notified_at, actioned_at, escalated_at, escalated_to_id, ip_address, user_agent, created_at, approver_pool, group_id) VALUES ('8725ab376f58ad0add11e83609c7a34d', '015a110328cb06840b258ce45b5f35a1', NULL, 'any', 1, 'pending', NULL, '2026-03-24 02:15:20', NULL, NULL, NULL, NULL, NULL, '2026-03-24 02:15:20', 'group_or_treasury', 'grp-accounting');

-- Table: payment_sla_log
DROP TABLE IF EXISTS payment_sla_log;
CREATE TABLE payment_sla_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL,
      sla_hours INTEGER NOT NULL,
      submitted_at TEXT NOT NULL,
      sla_deadline TEXT NOT NULL,
      escalated_at TEXT,
      resolved_at TEXT,
      resolution_type TEXT
    );

INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('f6b82877cdd5a18b5afebf30a5a1d2f2', '62153b5fb0346b3c48e35d1d8eafa5c7', 8, '2026-03-18T21:51:16.460Z', '2026-03-19 05:51:16', '2026-03-19 12:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('9bbd7121c2f93b220887f2b4aa5b06b3', '5c9d233d1fd1b7924e68c80c64b7e8d5', 24, '2026-03-18T21:52:40.074Z', '2026-03-19 21:52:40', '2026-03-20 12:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('3f3efcf0fcdb8e5edccd9302baa7fdde', '92d04f8d263ff0f6fd06ab9e0d582e52', 8, '2026-03-18T22:37:54.409Z', '2026-03-19 06:37:54', '2026-03-19 12:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('817dd7f6295dc469189357ab7d5cbd44', '4850162874f172b52457f26196b054ea', 24, '2026-03-18T23:18:56.708Z', '2026-03-19 23:18:56', '2026-03-20 12:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('5d0b0eb42b772b71d819bf32b780df52', 'a6cdcb7198b11a51474a6309f4a83437', 24, '2026-03-19T14:42:16.898Z', '2026-03-20 14:42:16', NULL, NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('5300b66ae45a34b1020b3cddc097627d', '40cb5c98f71f685c6701261c88de28e8', 24, '2026-03-19T18:59:12.242Z', '2026-03-20 18:59:12', '2026-03-20 19:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('931a80ee5a916c91997932055252ef5d', '017e5ad3286d88aeb9e14c0276453f5c', 24, '2026-03-20T19:40:48.293Z', '2026-03-21 19:40:48', '2026-03-21 22:00:00', NULL, NULL);
INSERT INTO payment_sla_log (id, payment_id, sla_hours, submitted_at, sla_deadline, escalated_at, resolved_at, resolution_type) VALUES ('e1c4aa2a39296dca193e9eb51fd27a9a', '015a110328cb06840b258ce45b5f35a1', 24, '2026-03-24T02:15:20.158Z', '2026-03-25 02:15:20', '2026-03-25 13:00:00', NULL, NULL);

-- Table: payment_templates
DROP TABLE IF EXISTS payment_templates;
CREATE TABLE payment_templates (
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

-- Table: payments
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
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
    , executed_by_user_id TEXT, executed_by_name TEXT, execution_notes TEXT, bank_reference_number TEXT, sla_hours INTEGER DEFAULT 24, escalated_at TEXT, escalation_reason TEXT, is_escalated INTEGER DEFAULT 0);

INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('ff38c3c317ee2ac8d926be6d1b3dbe3a', 'PAY-20260317-000002', 'user-colin-robbins', NULL, 'gusto', 13.13, 'USD', NULL, 13.13, 'acct-jpm-9811', 'wire', 'internal', 'acct-0566', NULL, NULL, NULL, NULL, NULL, 'executed', 'fund payroll today as a test
', '2026-03-17', '2026-03-20', 'WIRE-REF-987654', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 17:48:23', '2026-03-20 12:55:54', '2026-03-17 17:48:23', '2026-03-20 12:55:54', 'admin-001', 'John Murphy', NULL, 'WIRE-REF-987654', 24, NULL, NULL, 0);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('54cc69217aafcc3c3958e47740d4ced5', 'PAY-20260317-000003', 'user-colin-robbins', NULL, 'mexico payroll', 55.16, 'USD', NULL, 55.16, 'acct-jpm-9811', 'ach', 'internal', 'acct-8375', NULL, NULL, NULL, NULL, NULL, 'returned', 'funding mexico account for tomorrow', '2026-03-18', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 17:50:44', '2026-03-17 21:13:56', '2026-03-17 21:00:20', NULL, NULL, NULL, NULL, NULL, 24, NULL, NULL, 0);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('be2d7b856949fd50fa5e71e4c53e2ccb', 'PAY-20260317-000004', 'user-kc-deatsch', NULL, 'bills car shop', 14.1733, 'USD', NULL, 14.1733, 'acct-0446', 'wire', 'external', NULL, 'bank of america', '42176541', '1234567', '1234 anystreet usa', 'send a wire to this account', 'pending_approval', 'how can we test the system today', '2026-03-17', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 17:52:46', '2026-03-17 17:52:46', '2026-03-17 17:52:46', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 18:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('c9de0af7bab90e9100a188f3c2b65b51', 'PAY-20260317-000005', 'user-rachele-russo', NULL, 'fund a gusto account', 333.3348, 'USD', NULL, 333.3348, 'acct-jpm-9811', 'ach', 'internal', 'acct-7987', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'this is a forward looking test payment', '2026-03-20', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 17:55:10', '2026-03-17 17:55:10', '2026-03-17 17:55:10', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 18:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('b20c3c49c5646c66fb562148f89d7915', 'PAY-20260317-000006', 'user-rachele-russo', NULL, 'toys r us', 1312.13, 'USD', NULL, 1312.13, 'acct-7908', 'ach', 'external', NULL, 'first bank and trust', '434343443', '1234567', '12345 other street name', 'test repeat payment', 'pending_approval', 'testing a reoccuring payment', '2026-03-17', NULL, NULL, NULL, 1, 'weekly', '2026-03-31', NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 17:57:13', '2026-03-17 17:57:13', '2026-03-17 17:57:13', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 18:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('e1cedc05242f6b537f5db5da74c40dbc', 'PAY-20260317-000007', 'user-kc-deatsch', NULL, 'test', 44.44, 'USD', NULL, 44.44, 'acct-jpm-9811', 'wire', 'internal', 'acct-0226', NULL, NULL, NULL, NULL, NULL, 'executed', 'this is testing what happens to a payment', '2026-03-17', '2026-03-17', 'ww12312', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 19:54:06', '2026-03-17 19:55:45', '2026-03-17 19:54:06', '2026-03-17 19:55:45', 'admin-001', 'John Murphy', NULL, 'ww12312', 24, NULL, NULL, 0);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('97749fdde7918ce14225843d3022f4e2', 'PAY-20260317-000008', 'admin-001', NULL, 'gusto', 50000000000, 'USD', NULL, 50000000000, 'acct-0446', 'ach', 'internal', 'acct-jpm-9811', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'testeing the system to see if it works', '2026-03-17', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 2, NULL, 0, NULL, '2026-03-17 20:16:10', '2026-03-17 20:16:10', '2026-03-17 20:16:10', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 20:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('9f8757ec0d736a3a666cc1a4bd3210dc', 'PAY-20260317-000009', 'user-kc-deatsch', NULL, 'gusto', 13000.01, 'USD', NULL, 13000.01, 'acct-jpm-9811', 'wire', 'internal', 'acct-0566', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'testing the system for gaps', '2026-03-17', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 20:18:36', '2026-03-17 20:18:36', '2026-03-17 20:18:36', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 20:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('9d55262eceed4a4be77cb7afa25b054c', 'PAY-20260317-000010', 'user-colin-robbins', NULL, 'gusto test', 47, 'USD', NULL, 47, 'acct-jpm-9811', 'ach', 'internal', 'acct-0566', NULL, NULL, NULL, NULL, NULL, 'rejected', 'we are trying to make this work', '2026-03-17', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 20:20:37', '2026-03-19 14:42:59', '2026-03-17 20:20:37', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-18 20:30:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('ecf299067123c66903fe2a42acfcbc11', 'PAY-20260317-000011', 'user-kc-deatsch', NULL, 'gusto', 22, 'USD', NULL, 22, 'acct-0566', 'ach', 'internal', 'acct-jpm-9811', NULL, NULL, NULL, NULL, NULL, 'rejected', 'testing to see if right approvals are established', '2026-03-17', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-17 20:39:01', '2026-03-17 20:40:22', '2026-03-17 20:39:01', NULL, NULL, NULL, NULL, NULL, 24, NULL, NULL, 0);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('62153b5fb0346b3c48e35d1d8eafa5c7', 'PAY-20260318-000002', 'admin-001', NULL, 'test today', 13147.62, 'USD', NULL, 13147.62, 'acct-6428', 'ach', 'internal', 'acct-9803', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'trying to see what hte system has got!', '2026-03-18', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-18 21:51:16', '2026-03-18 21:51:16', '2026-03-18 21:51:16', NULL, NULL, NULL, NULL, NULL, 8, '2026-03-19 12:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('5c9d233d1fd1b7924e68c80c64b7e8d5', 'PAY-20260318-000003', 'admin-001', NULL, 'johnny murphy', 37.42, 'USD', NULL, 37.42, 'acct-0566', 'ach', 'external', NULL, 'murphy bank and trust again', '3333333', '11213343', 'house of murph', 'send me the money!!!', 'pending_approval', 'trying to have this repeat for two weeks', '2026-03-18', NULL, NULL, NULL, 1, 'weekly', '2026-04-30', NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-18 21:52:40', '2026-03-18 21:52:40', '2026-03-18 21:52:40', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-20 12:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('92d04f8d263ff0f6fd06ab9e0d582e52', 'PAY-20260318-000004', 'user-nahla-wardeh', NULL, 'tax testing ', 47365, 'USD', NULL, 47365, 'acct-8961', 'ach', 'internal', 'acct-8961', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'trying to test a payment to be submitted', '2026-03-19', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-18 22:37:54', '2026-03-18 22:37:54', '2026-03-18 22:37:54', NULL, NULL, NULL, NULL, NULL, 8, '2026-03-19 12:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('4850162874f172b52457f26196b054ea', 'PAY-20260318-000005', 'user-nahla-wardeh', NULL, 'new payee', 12, 'USD', NULL, 12, 'acct-0566', 'ach', 'internal', 'acct-9329', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'another test payments for us', '2026-03-18', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-18 23:18:56', '2026-03-18 23:18:56', '2026-03-18 23:18:56', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-20 12:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('a6cdcb7198b11a51474a6309f4a83437', 'PAY-20260319-000002', 'user-colin-robbins', NULL, 'gusto', 47.23, 'USD', NULL, 47.23, 'acct-0566', 'internal', 'internal', 'acct-jpm-9811', NULL, NULL, NULL, NULL, NULL, 'executed', 'refund related to overfunding!', '2026-03-19', '2026-03-20', 'TEST-REF-123456', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-19 14:42:16', '2026-03-20 12:48:09', '2026-03-19 14:42:16', '2026-03-20 12:48:09', 'admin-001', 'John Murphy', NULL, 'TEST-REF-123456', 24, NULL, NULL, 0);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('40cb5c98f71f685c6701261c88de28e8', 'PAY-20260319-000003', '5b5e0165d458765c2f4dda8b2a9d6d50', NULL, 'gusto', 12.32, 'USD', NULL, 12.32, 'acct-0226', 'ach', 'internal', 'acct-2155', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'testing the system for sure', '2026-03-20', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-19 18:59:12', '2026-03-19 18:59:12', '2026-03-19 18:59:12', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-20 19:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('017e5ad3286d88aeb9e14c0276453f5c', 'PAY-20260320-000002', 'user-kc-deatsch', NULL, 'bobby and ming', 38.42, 'USD', NULL, 38.42, 'acct-0497', 'ach', 'internal', 'acct-8375', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'testing of the beautiful system', '2026-03-20', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-20 19:40:48', '2026-03-20 19:40:48', '2026-03-20 19:40:48', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-21 22:00:00', 'SLA exceeded', 1);
INSERT INTO payments (id, reference_number, requester_id, payee_id, payee_name, amount, currency, fx_rate, usd_equivalent, account_id, payment_type, funding_type, destination_account_id, ext_bank_name, ext_routing_number, ext_bank_account, ext_recipient_address, ext_special_instructions, status, business_justification, requested_date, actual_execution_date, bank_reference, bank_rejection_reason, is_recurring, recurring_frequency, recurring_end_date, parent_recurring_id, template_id, attachment_url, attachment_name, attachment_size, current_approval_step, total_approval_steps, routing_rule_id, is_duplicate_flagged, duplicate_reference_id, created_at, updated_at, submitted_at, executed_at, executed_by_user_id, executed_by_name, execution_notes, bank_reference_number, sla_hours, escalated_at, escalation_reason, is_escalated) VALUES ('015a110328cb06840b258ce45b5f35a1', 'PAY-20260324-000002', 'user-kc-deatsch', NULL, 'new person', 3333.33, 'USD', NULL, 3333.33, 'acct-7987', 'ach', 'internal', 'acct-0269', NULL, NULL, NULL, NULL, NULL, 'pending_approval', 'this is a test this is a test', '2026-03-23', NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 1, NULL, 0, NULL, '2026-03-24 02:15:20', '2026-03-24 02:15:20', '2026-03-24 02:15:20', NULL, NULL, NULL, NULL, NULL, 24, '2026-03-25 13:00:00', 'SLA exceeded', 1);

-- Table: routing_rules
DROP TABLE IF EXISTS routing_rules;
CREATE TABLE routing_rules (
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

INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-001', 1, 'Small Payments (Under $10K)', 'Single approval for payments under $10,000', 'amount_range', NULL, NULL, 0, 9999.99, NULL, NULL, 1, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-002', 2, 'Medium Payments ($10K-$50K)', 'Two approvals for payments $10,000 - $50,000', 'amount_range', NULL, NULL, 10000, 49999.99, NULL, NULL, 2, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-003', 3, 'Large Payments ($50K-$250K)', 'Three approvals for payments $50,000 - $250,000', 'amount_range', NULL, NULL, 50000, 249999.99, NULL, NULL, 3, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-004', 4, 'Executive Payments ($250K+)', 'Four approvals including CFO for payments over $250,000', 'amount_range', NULL, NULL, 250000, NULL, NULL, NULL, 4, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-005', 5, 'Wire Transfers', 'All wire transfers require treasury approval', 'payment_type', NULL, 'wire', NULL, NULL, NULL, NULL, 2, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, department, payee_pattern, num_approvers, is_active, created_at, updated_at) VALUES ('rule-006', 6, 'International Payments', 'International account payments', 'account', 'acct-004', NULL, NULL, NULL, NULL, NULL, 3, 1, '2026-03-18 17:11:17', '2026-03-18 17:11:17');

-- Table: saved_payees
DROP TABLE IF EXISTS saved_payees;
CREATE TABLE saved_payees (
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

-- Table: system_settings
DROP TABLE IF EXISTS system_settings;
CREATE TABLE system_settings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      category TEXT,
      updated_by TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

-- Table: treasury_ingestion_log
DROP TABLE IF EXISTS treasury_ingestion_log;
CREATE TABLE treasury_ingestion_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      module TEXT NOT NULL,
      source TEXT NOT NULL,
      ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      records_ingested INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      error_message TEXT
    );

INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b52b5ed70b08c860c4650350fed8e3c9', 'cash_balances', 'corporate_cash_gsheet', '2026-03-18 22:56:07', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('27280b0f258c6bda3c5b27a2aaa86cfb', 'cash_balances', 'customer_cash_gsheet', '2026-03-18 22:56:07', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('42dea56edc6cc2f65317a569b7d39791', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-18 22:56:07', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('91f0a2f990afb5f3daa54e5d87819681', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 12:04:52', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ecf06f235fbdcfc86ba7a61325d0b163', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 12:04:52', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b769b28cbff721e5d81980f334239e18', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 12:04:52', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('d46b0bd05ecf88529e1aad7a2e97094d', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 12:04:54', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('11844e2d3e23cf0fa1f782a097742294', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 12:04:54', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('57d6e744bd61e930359693a1f86f4e33', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 12:04:54', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('75e4d68e5fe1998149f368c83dca029e', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 12:08:16', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('20634b806399de11e5491ab99ce0b408', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 12:08:16', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('e89438c1d3ef09654e758d22c7b32438', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 12:08:16', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c248374e4d38ebdb087e25c38e33bcc6', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 12:49:27', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ba5348be0dc1f81822c7c6dd597754bb', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 12:49:27', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f3649db8748d4942e741466df437ea84', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 12:49:27', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b4e3fd477c3f9f50801eb8409abe4a0e', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 12:51:14', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('fe03780f210a922b11e55dc83da90c78', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 12:51:14', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('026772d41850aa966e48c3f25eb06b0d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 12:51:14', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f7b393e482dfb8f9ee114b38c0a0932b', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:33:35', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('50f545d1fea6537a95d1cf95633937ae', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:33:35', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ce996a0f9dbbd103af908ea651137e13', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:33:35', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b75f7ff0a92e961f1949f76ed8b798f2', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:33:40', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('02ae80cb4024ba32e24d3508c35bc1fc', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:33:40', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('3b2c15443342423eb1e102ab231ed03b', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:33:40', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f2b50d49c1f23592892342ed7f8ddafa', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:33:41', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('d041e2b6a2483d618de37fcbcf861ef9', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:33:41', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('62ee8b406447da163983de55f266cfe8', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:33:41', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('0c14e4e3ccea55733a28504488afd8c3', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:33:50', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('63343a7f0f6317178fb0a5e1222793ca', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:33:50', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('63ddd167e032e35c6eff6c2b0632233d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:33:50', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1c8d3e8dca2432dc9371521ced0edf75', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:46:05', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c3ca4f50a6439cd25f3a8c27c3d38938', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:46:05', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('a5d59693224c88d31ddf1bd22d9a8046', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:46:05', 0, 'success', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('752014f8c810e31ce5cb18c0c2b11d5f', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:47:33', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('54e761e1349a0cbf3ce8cfdc0c676120', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:47:33', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6ac6dffcc46a1dd330154dba17ec41e7', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:47:33', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('09c7681f3bb1947e19572c056b2b7ea0', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:47:45', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('08c3c7edded06af4826045a63faf6d76', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:47:45', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('8fc1fe51a0c986b7be2dc5bf999cb439', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:47:45', 0, 'no_data', NULL);
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('7227b82c981230b02a756f281b4a1042', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 13:58:52', 0, 'error', 'No Google Sheets credentials found. Set one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to JSON), GOOGLE_SERVICE_ACCOUNT_KEY (JSON string), GOOGLE_SHEETS_API_KEY (API key for public sheets), or configure Application Default Credentials (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('9cb40c9be3f4552940cd5469627a522c', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 13:58:52', 0, 'error', 'No Google Sheets credentials found. Set one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to JSON), GOOGLE_SERVICE_ACCOUNT_KEY (JSON string), GOOGLE_SHEETS_API_KEY (API key for public sheets), or configure Application Default Credentials (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('cb9a9862a373ec198b174495b66cf491', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 13:58:52', 0, 'error', 'No Google Sheets credentials found. Set one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE (path to JSON), GOOGLE_SERVICE_ACCOUNT_KEY (JSON string), GOOGLE_SHEETS_API_KEY (API key for public sheets), or configure Application Default Credentials (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('7c73dc168125a1fdf94fe866a33ed04b', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 14:47:37', 0, 'error', 'No Google Sheets credentials found. Set RUNLAYER_ACCESS_TOKEN for MCP proxy, or one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEETS_API_KEY, or configure ADC (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('0632ecae71387142708294971a917d9d', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 14:47:37', 0, 'error', 'No Google Sheets credentials found. Set RUNLAYER_ACCESS_TOKEN for MCP proxy, or one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEETS_API_KEY, or configure ADC (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5daf4f5fe8d019e65a7b7c8cb99e0ef9', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 14:47:37', 0, 'error', 'No Google Sheets credentials found. Set RUNLAYER_ACCESS_TOKEN for MCP proxy, or one of: GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_SHEETS_API_KEY, or configure ADC (gcloud auth application-default login)');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('539ad706eab8c58d4ce78da535a24ae6', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 16:43:52', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b7a06915ee1ea3f4d85339aeb9ede50d', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 16:43:52', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f7efb1954a7fcfd538f95483c019ba37', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 16:43:52', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('144f9e49a2e7c98ed13ef5a1c23256ac', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 18:55:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('14a2b7b312f94a3e24cfef085378e935', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 18:55:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('d9ff222796c41b1cdf3f139318eff131', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 18:55:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ace876eede7b4bc2d1f6d844e44deb64', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 18:59:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('7ba196d46a8d8cff3f5778d0d5a0d695', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 18:59:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('a80dea1072f049fc3c21c8948b65aae0', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 18:59:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('db1afcfda8b3bb6ee9cfb284a84ac20b', 'cash_balances', 'corporate_cash_gsheet', '2026-03-19 18:59:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b86f09b395c15ffca5a713414b445b9e', 'cash_balances', 'customer_cash_gsheet', '2026-03-19 18:59:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6a2bbca1a8e0a1f049fc70bff94d185e', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-19 18:59:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('9667f586eb1b3fd24892720e3e509ad7', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:04:15', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('da78c8bd2af2a8d35a21e3404a4d2b0f', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:04:15', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b9a1c2bf48b14947f3b66de6b12b3427', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:04:15', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f0c194d10b634dba96b0d60c632a6fc1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:04:16', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2910eaebfbb8847eff2b833ef672a00b', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:04:16', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('874a31b03a6cba1d1f0ea14ee28e8aa6', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:04:16', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('744174e06ff2e954c0bf9fd2e9c9bda1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:04:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('697faea15b5ca3adec459bf0e807dcb0', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:04:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5331501e4d056d87b55fa6df3970094a', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:04:37', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b88ba0375e2d481c35bf56a4a544f982', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:28:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5d7c469fd5186ee92b0568e561b9579a', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:28:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('bd839bc4d8a538682c3499fc4932132d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:28:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('fd9004b8835c361b362e77aa12fa9aff', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:55:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('14c58a74a6fcb776f8c757fe017ea739', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:55:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5929d4d79346bb529235f35085181d88', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:55:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('da8768de730bc2d29fb202bdfb20ec35', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 12:55:59', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6b587a9ab6315928d3a2610a0503bb14', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 12:55:59', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('0a82729aa43e698f9f8bcd1e0207e596', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 12:55:59', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c2706a177d5cf841a54ed19b4bc15270', 'cash_balances', 'corporate_cash_gsheet', '2026-03-20 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5fb6854131447b56e83730739b7eb496', 'cash_balances', 'customer_cash_gsheet', '2026-03-20 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('74fa8130374ebaf583c1f6ab3738da16', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-20 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('70acb1c854dcc7c82c82dd766537843f', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 14:20:31', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('d850c1908e801721df9d1a7e122f7471', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 14:20:31', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('4d73ca5527352472132f3ff5acc2ab83', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 14:20:31', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('0a366dd0570c922a617874ec949a8182', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 14:20:33', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2ea1fa9dab47789f4dc9a714dff76791', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 14:20:33', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ad0a2c8493da5412f78d7a9e1fe30a68', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 14:20:33', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5d30036b6b31451fb0e06ce3e95a53b1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 14:20:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2555baf3b34ea5d2bd6752ecd54a2ea3', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 14:20:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b39b50f6c44ba7f0cedc775105de6e62', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 14:20:34', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1ebc044261e25d783163d0de3933fde1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 14:26:56', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('3be3ce52ddd186df84c89fec585ee1ba', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 14:26:56', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('369cea35c5a15e418e0a3b8c1d2a9ced', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 14:26:56', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('d14546f6b3dfe64c02e7c411924badf8', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:18', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1ec1d058d89bf497492f935107e6a9f6', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:18', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('854a298f0f2d827a82733c7c10697c96', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:18', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('e0be0a7f9e2ebd1e56be93354de0f342', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b9a7fe6911154b6417614ada4d720904', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('048c84c6116f9d4527d47109bbc5924e', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6fb03c20a7269cf0031fa5bbec9e83f1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('eef9d07f36bed23426fb6b3623f67157', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c75d91dd7c30e6656e564c75f9aa760a', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2dc51e8233032ed7762030ec044ca45d', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:22', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('996c0e49c12262d5e9dece1deb5da715', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:22', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1904e9c78526da89f62b5b21644e1a54', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:22', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c2e14af289e05eab5383a415feae0945', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:23', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2af5d1625cfefbeb290f91f538455abd', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:23', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b9470e0c071dd1243909362087b53045', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:23', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('014247e1e80a73e892e1391f9db001e9', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:32:26', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('007932dbf0e3ca9c33a0f1db709fd118', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:32:26', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('dc1c4ab06e12feedaac40738114ef61d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:32:26', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1f6634e75d09d32109a03087b6ad7b1f', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('79d02fb9fb72c42e9b54b9d1a9e33f93', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6d577b4e2b1d6855147bd339f7ba60aa', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:20', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('62e616f3ca3328b95f401d7c591c2de6', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('88381010a64ebbe7857cc210f1197694', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('e65bac0084f7a56be3eb1a49648966b3', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:21', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('93232bf4669b779c326583a6116e546c', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('dd37ebebfd2de5eb3139eb718d129816', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('fbac7fa5f97ccefcec61d35c2c9e8dbd', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('4b038066d9c152623d2332cc9ab374bd', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:28', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('487bee9ba4d405955a042b1c4ed0bb3c', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:28', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b98aa50a80e013ce90fae9740ade3981', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:28', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('10ebd936708d5050fc25c0a48c87b92c', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c1f12091af8fd481befc964e19a272ab', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('81a4ba07b4385a693b613bf701f1a9f7', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('3541648029835b2440886445238cd935', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('880aab2c4e80b71ec961d7387ca4c9a1', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('21058fcf2ffc9fcd8871a63b839bf94d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:34:48', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('cc69decfb2291c7cf713c9f71c4116c1', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:38:49', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('970483c4149756db3e6f712c7ba4ac8f', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:38:49', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('dd3ee2f6f10759250f60c274dff70c3d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:38:49', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('568bc091d915699968c4f0434eca3cbf', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:40:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('dd6cc438f58c9641c6bc20d0ecf6683e', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:40:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c9eed50a3bd430672ad95fdc132694f4', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:40:03', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('468bb3824ce03082d9a69bded2109e47', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:42:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('515ced623e6ce38f44c27d0cb87c2794', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:42:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('06d9e1962a7a2fba3bf07482c1993062', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:42:27', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('bba1bedceae93a88d569d5dd646c4786', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 15:42:29', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('1b656be2cddf1e703703aa71c3f4ea86', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 15:42:29', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ceb6875855bc77c79f93bfce318f8f90', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 15:42:29', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b2a00559535ef3b4b648a752f1b357d2', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('db1b3cac3f5f88e07e5126219abc6686', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('574954f3d1605221521bc9133767df6d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('7da7bb269106386f714c7c5f1ba7bd59', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 19:28:42', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('6401048ddc69a4288381184d30c9c610', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 19:28:42', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c8e3cc910f5e9cae24d83125a7e31e97', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 19:28:42', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('11d4d50b0403d09cc661294c68de5115', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 19:28:45', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('dad4cb7d96c3fe98a86632f39569bbb9', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 19:28:45', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('2daf67a5b958b2b2028ec57a284af93d', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 19:28:45', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('02a775535bc9b446ce4f62e1ea237954', 'cash_balances', 'corporate_cash_gsheet', '2026-03-23 19:28:46', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('83c8b22a662c8dfbb76c5010f03483e4', 'cash_balances', 'customer_cash_gsheet', '2026-03-23 19:28:46', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('c136a2f21e38a989994bcf00ef214035', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-23 19:28:46', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b9b5a37e4d30fa59014baa6e826535d4', 'cash_balances', 'corporate_cash_gsheet', '2026-03-24 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('f430a44de88dfe7abbac6ee531bf0f67', 'cash_balances', 'customer_cash_gsheet', '2026-03-24 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('9f96718d4c6c2d752dbc6367ae166113', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-24 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('4df3425fd89ad4281c8a33f0ec4cdb0d', 'cash_balances', 'corporate_cash_gsheet', '2026-03-25 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('ad1e60bd9c8b74e4a45ff5a8308a297c', 'cash_balances', 'customer_cash_gsheet', '2026-03-25 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('cb951ca20da174a4c19775dacc0a1350', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-25 18:30:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b15a0f11489c8903f870107b34c906db', 'cash_balances', 'corporate_cash_gsheet', '2026-03-27 20:33:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('9b4586792ec323cec55c659fbc0893d4', 'cash_balances', 'customer_cash_gsheet', '2026-03-27 20:33:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('5b08c3936b01d4d91de8848cb5442f3c', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-27 20:33:00', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('7394c3cd5bfb2b4df1d82c205f14f3fe', 'cash_balances', 'corporate_cash_gsheet', '2026-03-27 20:35:44', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('adb30b84396c2596195dae58da9855e8', 'cash_balances', 'customer_cash_gsheet', '2026-03-27 20:35:44', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b1e18c79704fa9f867961f32acc10dda', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-27 20:35:44', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('319e879cece759ac4a62d67b145ee673', 'cash_balances', 'corporate_cash_gsheet', '2026-03-27 20:35:47', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('0ba742e5457e16e2bf13c1888d8dc08a', 'cash_balances', 'customer_cash_gsheet', '2026-03-27 20:35:47', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('22d55d3313267b1771642a6a5b579391', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-27 20:35:47', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('b2ffe16e69bbd222c2cb7bce975f7acc', 'cash_balances', 'corporate_cash_gsheet', '2026-03-27 20:36:06', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('cdf0e23fff44b17f6406a3e4f9acd457', 'cash_balances', 'customer_cash_gsheet', '2026-03-27 20:36:06', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
INSERT INTO treasury_ingestion_log (id, module, source, ingested_at, records_ingested, status, error_message) VALUES ('16fe394367e3567a4c96ae3a3c892145', 'corp_forecast', 'corp_forecast_gsheet', '2026-03-27 20:36:06', 0, 'error', 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');

-- Table: treasury_user_preferences
DROP TABLE IF EXISTS treasury_user_preferences;
CREATE TABLE treasury_user_preferences (
      user_id TEXT PRIMARY KEY,
      cash_top_n INTEGER DEFAULT 5,
      cash_days_back INTEGER DEFAULT 2,
      cash_account_type TEXT DEFAULT 'both',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- Table: user_account_access
DROP TABLE IF EXISTS user_account_access;
CREATE TABLE user_account_access (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      account_id TEXT NOT NULL REFERENCES accounts(id),
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')), override_reason TEXT, override_by TEXT, override_at TEXT,
      UNIQUE(user_id, account_id)
    );

-- Table: user_sessions
DROP TABLE IF EXISTS user_sessions;
CREATE TABLE user_sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_group TEXT,
      login_at TEXT NOT NULL DEFAULT (datetime('now')),
      logout_at TEXT,
      last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
      ip_address TEXT,
      user_agent TEXT
    );

INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('fdd5d40c5fd0ffd51d75710d86d34199', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 17:45:12', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('1dcb6e5ef964322096c363961150d6f7', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 20:44:34', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('d6fc43bc3017410f453efa12dbf1d3b0', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 20:53:04', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('4aad21622310a879bfb3ec84d3c9c671', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:37:40', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('82bbc52113509245c88b68a523b98d05', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:40:44', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('130d27bccd3490cfef66bf102e67c249', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:42:11', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('92365717c01eaff7cef6c099baad1b41', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:43:14', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('2e7cb268803fa9b759219269dc8225ad', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:46:46', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('a23f4bbfa0bfa7498a7b0c08f2e03e68', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 21:48:45', '2026-03-18 21:53:29', '2026-03-18 21:48:45', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('3fae2a5961cb76f6f01186f9ba0697fc', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 22:09:26', '2026-03-18 22:36:57', '2026-03-18 22:36:42', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('eb882198b3e5ef09da06c471335f815f', 'user-nahla-wardeh', 'Nahla Wardeh', 'Other', '2026-03-18 22:37:06', '2026-03-18 22:37:58', '2026-03-18 22:37:07', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('2c3269d7164f66f1205531fa6559d141', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 22:38:03', '2026-03-18 22:39:21', '2026-03-18 22:38:05', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('6d52268afdd522d96d88fe64edd69101', 'user-nahla-wardeh', 'Nahla Wardeh', 'Other', '2026-03-18 22:39:31', NULL, '2026-03-18 23:18:20', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('7799a0b5c0ad443cf908e9d92f0c5925', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 22:58:40', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('8e70a0113a36a5cc17afea12438bda14', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 22:58:42', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('bb1b5dd4c47f4ae9d10746bd4114df97', 'user-nahla-wardeh', 'Nahla Wardeh', 'Other', '2026-03-18 23:18:19', '2026-03-18 23:18:59', '2026-03-18 23:18:20', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('6df4cd1d115458034379a099762e5e3c', 'admin-001', 'John Murphy', 'Treasury', '2026-03-18 23:19:07', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('6cc5fb5c374882a9b230d554b356c325', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 12:04:00', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('c80a631177405faf6885012f0895eed9', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 12:49:30', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('8115e6daa2f8c7e34d2a4f4f83f993b1', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 13:30:56', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('254efbdb710c07e652320f2ea766593e', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 13:46:04', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('1169bd5a89671887b92610ac80eda17f', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 13:47:45', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('5a641d0974fcba4c198f0bdbd6677395', 'user-colin-robbins', 'Colin Robbins', 'Payroll', '2026-03-19 14:41:38', '2026-03-19 14:42:22', '2026-03-19 14:41:38', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('b7f8db09013315c1194023e3a1a631cf', 'user-kc-deatsch', 'KC Deatsch', 'Accounting', '2026-03-19 14:42:39', '2026-03-19 14:45:26', '2026-03-19 14:42:40', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('5d4ca9c1225c8305da90c7afb6813870', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 14:45:33', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('0d1eaf502fda4e1f36a30cee0f2e8d12', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 18:45:18', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('3e5dea6aec091d581f938b4bc8279c31', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 18:53:18', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('f786eea536fe34e069ec634240a95fa3', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 18:55:58', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('87c4753a6dbf87d122b4ad60bd214315', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 18:57:06', '2026-03-19 18:58:24', '2026-03-19 18:57:07', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('93ae32705a6d72c5e41d1fc0e6610d6d', '5b5e0165d458765c2f4dda8b2a9d6d50', 'Will Ott', 'Accounting', '2026-03-19 18:58:32', '2026-03-19 18:59:17', '2026-03-19 18:58:32', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('f802f6114a59d104fdcc4f2cbeee138a', 'admin-001', 'John Murphy', 'Treasury', '2026-03-19 18:59:27', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('fb98ad88e991b69fecbb2e9054c9a483', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:04:07', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('e6aeb3026acb37a4dfe73e14a5ad4cc3', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:33:42', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('5cd78814f42444630dc2f5e2699c4e2c', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:47:26', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('1fc46384e505a6981feb08c37b3ac174', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:47:43', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('e7786e530460a89178bb971f900128cf', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:47:44', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('e2ead35ae82322a517613762992e81f6', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:55:05', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('3f1a2ba5c76a4b3e91ffc4702ee0cd22', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 12:55:53', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('78254b7de295a8ddd68f677b156de684', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 19:13:11', '2026-03-20 19:36:19', '2026-03-20 19:36:19', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('059db5aad4fbf0f7a5d97649d73f144b', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 19:36:29', '2026-03-20 19:39:20', '2026-03-20 19:36:30', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('c16dedf68fac01b1376ce8cba659abe7', 'user-kc-deatsch', 'KC Deatsch', 'Accounting', '2026-03-20 19:39:32', '2026-03-20 19:40:50', '2026-03-20 19:39:32', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('8c8045d25c3011128c8ebba52d935eb2', 'admin-001', 'John Murphy', 'Treasury', '2026-03-20 19:40:57', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('36b2c96be54bfd73ddda49203827e7b9', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 14:20:24', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('f36fe132901c882bbf329eda51568f9b', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:26:55', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('e596a538c2deb1574c89a69402f90322', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:32:13', '2026-03-23 15:34:34', '2026-03-23 15:32:15', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('92632abf805d52ceb206909b2e806e65', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:34:43', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('0d3b56ad3976ca45ecb4879384ba8b6b', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:37:44', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('5a18be63f6e61c8cfea23de88e22c9b5', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:38:42', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('19b9b7c08fe95f2adce3c05469290a9a', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 15:39:56', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('268f619437200ca2f3f0acc956b29211', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 16:01:25', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'curl/8.18.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('a7f4ecdd0fd4258d33a251a110a82a36', 'admin-001', 'John Murphy', 'Treasury', '2026-03-23 19:28:34', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('7d9800656d15419cf9b6b610e496f6bc', 'user-kc-deatsch', 'KC Deatsch', 'Accounting', '2026-03-24 02:14:42', '2026-03-24 02:15:23', '2026-03-24 02:14:42', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('6b53cd08805e4b2aa4f7788c1dcde97e', 'admin-001', 'John Murphy', 'Treasury', '2026-03-24 02:15:32', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');
INSERT INTO user_sessions (id, user_id, user_name, user_group, login_at, logout_at, last_active_at, ip_address, user_agent) VALUES ('a8235376153cda982d63f37906ce7fdc', 'admin-001', 'John Murphy', 'Treasury', '2026-03-27 20:33:49', NULL, '2026-03-27 20:47:26', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0');

-- Table: users
DROP TABLE IF EXISTS users;
CREATE TABLE "users" (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('read_only', 'staff', 'manager', 'sr_manager', 'admin')),
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

INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('admin-001', 'john.murphy@gusto.com', 'John Murphy', 'admin', 'active', NULL, 'System Administrator', 'Treasury', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 20:33:49', '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-001', 'sarah.chen@gusto.com', 'Sarah Chen', 'staff', 'active', NULL, 'AP Specialist', 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, 50000, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-002', 'james.park@gusto.com', 'James Park', 'manager', 'active', NULL, 'AP Manager', 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, 250000, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-003', 'maria.rodriguez@gusto.com', 'Maria Rodriguez', 'sr_manager', 'active', NULL, 'Senior AP Manager', 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, 500000, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-004', 'linda.kim@gusto.com', 'Linda Kim', 'admin', 'active', NULL, 'Treasury Manager', 'Treasury', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-005', 'diego.torres@gusto.com', 'Diego Torres', 'admin', 'active', NULL, 'CFO / Administrator', 'Treasury', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-006', 'ming.huey@gusto.com', 'Ming Huey', 'admin', 'active', NULL, 'Treasury Manager', 'Treasury', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-16 15:38:15', '2026-03-16 15:38:15');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-bobby-cajucom', 'bobby.cajucom@gusto.com', 'Bobby Cajucom', 'admin', 'active', NULL, NULL, 'Treasury', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-roselle-ramos', 'roselle.ramos@gusto.com', 'Roselle Ramos', 'manager', 'active', NULL, NULL, 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-diana-roig', 'diana.roig@gusto.com', 'Diana Roig', 'manager', 'active', NULL, NULL, 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-syd-ramesh', 'syd.ramesh@gusto.com', 'Syd Ramesh', 'manager', 'active', NULL, NULL, 'Accounts Payable', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-jecah-cabaling', 'jecah.cabaling@gusto.com', 'Jecah Cabaling', 'manager', 'active', NULL, NULL, 'Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-haewon-han', 'haewon.han@gusto.com', 'Haewon Han', 'manager', 'active', NULL, NULL, 'Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-charles-sikazwe', 'charles.sikazwe@gusto.com', 'Charles Sikazwe', 'manager', 'active', NULL, NULL, 'Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-kc-deatsch', 'kc.deatsch@gusto.com', 'KC Deatsch', 'manager', 'active', NULL, NULL, 'Accounting', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-24 02:14:42', '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-rachele-russo', 'rachele.russo@gusto.com', 'Rachele Russo', 'manager', 'active', NULL, NULL, 'Accounting', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 19:56:25', '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-frank-devoe', 'frank.devoe@gusto.com', 'Frank DeVoe', 'manager', 'active', NULL, NULL, 'Payment Ops / Platform Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:55', '2026-03-17 14:21:55');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-john-tullis', 'john.tullis@gusto.com', 'John Tullis', 'manager', 'active', NULL, NULL, 'Payment Ops / Platform Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-amanda-wong', 'amanda.wong@gusto.com', 'Amanda Wong', 'manager', 'active', NULL, NULL, 'Payment Ops / Platform Accounting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-clarice-norman-mclean', 'clarice.norman-mclean@gusto.com', 'Clarice Norman-McLean', 'manager', 'active', NULL, NULL, 'Payroll', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-glydel-arioste', 'glydel.arioste@gusto.com', 'Glydel Arioste', 'manager', 'active', NULL, NULL, 'Payroll', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-colin-robbins', 'colin.robbins@gusto.com', 'Colin Robbins', 'manager', 'active', NULL, NULL, 'Payroll', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-19 14:41:38', '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('user-nahla-wardeh', 'nahla.wardeh@gusto.com', 'Nahla Wardeh', 'manager', 'active', NULL, NULL, 'Other', NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-18 23:18:19', '2026-03-17 14:21:56', '2026-03-17 14:21:56');
INSERT INTO users (id, email, name, role, status, workday_id, title, department, cost_center, manager_name, manager_email, pe_partner_name, pe_partner_email, payment_limit, last_login_at, created_at, updated_at) VALUES ('5b5e0165d458765c2f4dda8b2a9d6d50', 'will.ott@gusto.com', 'Will Ott', 'sr_manager', 'active', NULL, 'Employee', NULL, NULL, NULL, NULL, NULL, NULL, 500000, '2026-03-19 18:58:32', '2026-03-19 18:57:54', '2026-03-19 18:57:54');

CREATE INDEX idx_aaal_user ON account_access_audit_log(user_id);
CREATE INDEX idx_approvals_approver ON payment_approvals(approver_id);
CREATE INDEX idx_approvals_payment ON payment_approvals(payment_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_bc_confirmed ON bank_confirmations(confirmed_at);
CREATE INDEX idx_bc_payment ON bank_confirmations(payment_id);
CREATE INDEX idx_cbs_date ON cash_balance_snapshots(balance_date);
CREATE INDEX idx_cbs_type ON cash_balance_snapshots(account_type);
CREATE INDEX idx_cfs_date ON corp_forecast_snapshots(forecast_date);
CREATE INDEX idx_eod_date ON eod_reports(report_date);
CREATE INDEX idx_ga_account ON group_accounts(account_id);
CREATE INDEX idx_ga_group ON group_accounts(group_id);
CREATE INDEX idx_gas_tier ON group_approval_steps(tier_id);
CREATE INDEX idx_gat_group ON group_approval_tiers(group_id);
CREATE INDEX idx_gm_group ON group_members(group_id);
CREATE INDEX idx_gm_user ON group_members(user_id);
CREATE INDEX idx_grcl_group ON group_routing_change_log(group_id);
CREATE INDEX idx_nlog_payment ON notification_log(payment_id);
CREATE INDEX idx_nlog_sent ON notification_log(sent_at);
CREATE INDEX idx_nlog_type ON notification_log(notification_type);
CREATE INDEX idx_pa_group ON payment_approvals(group_id);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_requester ON payments(requester_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_sla_payment ON payment_sla_log(payment_id);
CREATE INDEX idx_uaa_account ON user_account_access(account_id);
CREATE INDEX idx_uaa_user ON user_account_access(user_id);
CREATE INDEX idx_usess_login ON user_sessions(login_at);
CREATE INDEX idx_usess_user ON user_sessions(user_id);

CREATE TRIGGER generate_payment_reference
    AFTER INSERT ON payments
    WHEN NEW.reference_number IS NULL
    BEGIN
      UPDATE payments
      SET reference_number = 'PAY-' || strftime('%Y%m%d', 'now') || '-' ||
        substr('000000' || (SELECT COUNT(*) + 1 FROM payments WHERE date(created_at) = date('now')), -6)
      WHERE id = NEW.id;
    END;

PRAGMA foreign_keys = ON;
