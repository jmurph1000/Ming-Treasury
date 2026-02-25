-- Seed: 001_initial_data
-- Description: Initial seed data for Gusto Treasury Payment Tool

-- =====================================================
-- DEFAULT ADMIN USER (for initial setup)
-- =====================================================
INSERT INTO users (id, email, name, role, status, payment_limit)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@gusto.com',
    'System Administrator',
    'admin',
    'active',
    NULL  -- Unlimited
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SAMPLE BANK ACCOUNTS (encrypted values are placeholders)
-- In production, these would be set up via admin UI with real encryption
-- =====================================================
INSERT INTO accounts (id, name, bank_name, account_number_encrypted, routing_number_encrypted, account_type, currency, daily_limit, dual_control_required, dual_control_mode)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'Operating Account', 'JPMorgan Chase', E'\\x00', E'\\x00', 'operating', 'USD', 5000000.00, true, 'all'),
    ('10000000-0000-0000-0000-000000000002', 'Payroll Account', 'JPMorgan Chase', E'\\x00', E'\\x00', 'payroll', 'USD', 10000000.00, true, 'all'),
    ('10000000-0000-0000-0000-000000000003', 'Operating Reserve', 'Bank of America', E'\\x00', E'\\x00', 'savings', 'USD', 2000000.00, true, 'wires_only'),
    ('10000000-0000-0000-0000-000000000004', 'International Payments', 'Citibank', E'\\x00', E'\\x00', 'checking', 'USD', 1000000.00, true, 'above_threshold')
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT ROUTING RULES
-- =====================================================
INSERT INTO routing_rules (id, priority, name, description, trigger_type, account_id, payment_type, min_amount, max_amount, num_approvers, is_active)
VALUES
    -- Rule 1: Payroll Account → 2 approvers (Treasury → CFO)
    ('20000000-0000-0000-0000-000000000001', 1, 'Payroll Account Payments', 'All payments from payroll account require Treasury and CFO approval', 'account', '10000000-0000-0000-0000-000000000002', NULL, NULL, NULL, 2, true),

    -- Rule 2: Internal Transfer → 1 approver (Treasury Manager)
    ('20000000-0000-0000-0000-000000000002', 2, 'Internal Transfers', 'Internal transfers between Gusto accounts', 'payment_type', NULL, 'internal', NULL, NULL, 1, true),

    -- Rule 3: Under $25K → 1 approver (AP Manager)
    ('20000000-0000-0000-0000-000000000003', 3, 'Small Payments (Under $25K)', 'Payments under $25,000', 'amount_range', NULL, NULL, 0, 24999.99, 1, true),

    -- Rule 4: $25K-$99K → 2 approvers (AP Mgr → Treasury)
    ('20000000-0000-0000-0000-000000000004', 4, 'Medium Payments ($25K-$99K)', 'Payments between $25,000 and $99,999', 'amount_range', NULL, NULL, 25000, 99999.99, 2, true),

    -- Rule 5: $100K-$499K → 3 approvers (AP Mgr → Sr.Mgr → Treasury)
    ('20000000-0000-0000-0000-000000000005', 5, 'Large Payments ($100K-$499K)', 'Payments between $100,000 and $499,999', 'amount_range', NULL, NULL, 100000, 499999.99, 3, true),

    -- Rule 6: $500K+ → 4 approvers (AP Mgr → Sr.Mgr → Treasury → CFO)
    ('20000000-0000-0000-0000-000000000006', 6, 'Very Large Payments ($500K+)', 'Payments $500,000 and above', 'amount_range', NULL, NULL, 500000, NULL, 4, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- APPROVAL CHAINS FOR ROUTING RULES
-- =====================================================
-- Rule 1: Payroll Account (Treasury → CFO)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000001', 1, 'treasury', 24),
    ('20000000-0000-0000-0000-000000000001', 2, 'cfo', 24)
ON CONFLICT DO NOTHING;

-- Rule 2: Internal Transfer (Treasury)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000002', 1, 'treasury', 24)
ON CONFLICT DO NOTHING;

-- Rule 3: Under $25K (AP Manager)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000003', 1, 'ap_manager', 24)
ON CONFLICT DO NOTHING;

-- Rule 4: $25K-$99K (AP Manager → Treasury)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000004', 1, 'ap_manager', 24),
    ('20000000-0000-0000-0000-000000000004', 2, 'treasury', 24)
ON CONFLICT DO NOTHING;

-- Rule 5: $100K-$499K (AP Manager → Sr AP Manager → Treasury)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000005', 1, 'ap_manager', 24),
    ('20000000-0000-0000-0000-000000000005', 2, 'sr_ap_manager', 24),
    ('20000000-0000-0000-0000-000000000005', 3, 'treasury', 24)
ON CONFLICT DO NOTHING;

-- Rule 6: $500K+ (AP Manager → Sr AP Manager → Treasury → CFO)
INSERT INTO approval_chains (rule_id, step, approver_role, escalation_hours)
VALUES
    ('20000000-0000-0000-0000-000000000006', 1, 'ap_manager', 24),
    ('20000000-0000-0000-0000-000000000006', 2, 'sr_ap_manager', 24),
    ('20000000-0000-0000-0000-000000000006', 3, 'treasury', 24),
    ('20000000-0000-0000-0000-000000000006', 4, 'cfo', 24)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FEDERAL BANK HOLIDAYS (2024-2027)
-- =====================================================
INSERT INTO bank_holidays (date, name, country, year, is_federal)
VALUES
    -- 2024
    ('2024-01-01', 'New Year''s Day', 'USA', 2024, true),
    ('2024-01-15', 'Martin Luther King Jr. Day', 'USA', 2024, true),
    ('2024-02-19', 'Presidents'' Day', 'USA', 2024, true),
    ('2024-05-27', 'Memorial Day', 'USA', 2024, true),
    ('2024-06-19', 'Juneteenth', 'USA', 2024, true),
    ('2024-07-04', 'Independence Day', 'USA', 2024, true),
    ('2024-09-02', 'Labor Day', 'USA', 2024, true),
    ('2024-10-14', 'Columbus Day', 'USA', 2024, true),
    ('2024-11-11', 'Veterans Day', 'USA', 2024, true),
    ('2024-11-28', 'Thanksgiving Day', 'USA', 2024, true),
    ('2024-12-25', 'Christmas Day', 'USA', 2024, true),

    -- 2025
    ('2025-01-01', 'New Year''s Day', 'USA', 2025, true),
    ('2025-01-20', 'Martin Luther King Jr. Day', 'USA', 2025, true),
    ('2025-02-17', 'Presidents'' Day', 'USA', 2025, true),
    ('2025-05-26', 'Memorial Day', 'USA', 2025, true),
    ('2025-06-19', 'Juneteenth', 'USA', 2025, true),
    ('2025-07-04', 'Independence Day', 'USA', 2025, true),
    ('2025-09-01', 'Labor Day', 'USA', 2025, true),
    ('2025-10-13', 'Columbus Day', 'USA', 2025, true),
    ('2025-11-11', 'Veterans Day', 'USA', 2025, true),
    ('2025-11-27', 'Thanksgiving Day', 'USA', 2025, true),
    ('2025-12-25', 'Christmas Day', 'USA', 2025, true),

    -- 2026
    ('2026-01-01', 'New Year''s Day', 'USA', 2026, true),
    ('2026-01-19', 'Martin Luther King Jr. Day', 'USA', 2026, true),
    ('2026-02-16', 'Presidents'' Day', 'USA', 2026, true),
    ('2026-05-25', 'Memorial Day', 'USA', 2026, true),
    ('2026-06-19', 'Juneteenth', 'USA', 2026, true),
    ('2026-07-03', 'Independence Day (Observed)', 'USA', 2026, true),
    ('2026-09-07', 'Labor Day', 'USA', 2026, true),
    ('2026-10-12', 'Columbus Day', 'USA', 2026, true),
    ('2026-11-11', 'Veterans Day', 'USA', 2026, true),
    ('2026-11-26', 'Thanksgiving Day', 'USA', 2026, true),
    ('2026-12-25', 'Christmas Day', 'USA', 2026, true),

    -- 2027
    ('2027-01-01', 'New Year''s Day', 'USA', 2027, true),
    ('2027-01-18', 'Martin Luther King Jr. Day', 'USA', 2027, true),
    ('2027-02-15', 'Presidents'' Day', 'USA', 2027, true),
    ('2027-05-31', 'Memorial Day', 'USA', 2027, true),
    ('2027-06-18', 'Juneteenth (Observed)', 'USA', 2027, true),
    ('2027-07-05', 'Independence Day (Observed)', 'USA', 2027, true),
    ('2027-09-06', 'Labor Day', 'USA', 2027, true),
    ('2027-10-11', 'Columbus Day', 'USA', 2027, true),
    ('2027-11-11', 'Veterans Day', 'USA', 2027, true),
    ('2027-11-25', 'Thanksgiving Day', 'USA', 2027, true),
    ('2027-12-24', 'Christmas Day (Observed)', 'USA', 2027, true)
ON CONFLICT (date, country) DO NOTHING;

-- =====================================================
-- DEFAULT SYSTEM SETTINGS
-- =====================================================
INSERT INTO system_settings (key, value, description, category)
VALUES
    ('session_timeout_minutes', '30', 'Session timeout in minutes', 'security'),
    ('escalation_hours', '24', 'Default escalation window in hours', 'approvals'),
    ('duplicate_detection_days', '90', 'Days to look back for duplicate detection', 'payments'),
    ('min_justification_length', '20', 'Minimum characters for business justification', 'payments'),
    ('min_bank_reference_length', '6', 'Minimum characters for bank reference number', 'execution'),
    ('supported_currencies', '["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "JPY"]', 'Supported payment currencies', 'payments'),
    ('rate_limit_per_minute', '100', 'API rate limit per user per minute', 'security'),
    ('audit_retention_years', '7', 'Years to retain audit logs', 'compliance'),
    ('max_attachment_size_mb', '25', 'Maximum attachment size in MB', 'payments'),
    ('allowed_attachment_types', '["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg"]', 'Allowed file types for attachments', 'payments')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- DEFAULT BATCH WINDOWS
-- =====================================================
INSERT INTO batch_windows (name, cutoff_time, frequency, days_of_week, payment_types, is_active)
VALUES
    ('Morning ACH Batch', '10:00:00', 'daily', ARRAY[1,2,3,4,5], ARRAY['ach'], true),
    ('Afternoon Wire Batch', '14:00:00', 'daily', ARRAY[1,2,3,4,5], ARRAY['wire'], true),
    ('End of Day Batch', '16:00:00', 'daily', ARRAY[1,2,3,4,5], ARRAY['ach', 'wire'], true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT FX RATES (for development)
-- =====================================================
INSERT INTO fx_rates (base_currency, target_currency, rate, source)
VALUES
    ('USD', 'EUR', 0.92, 'manual'),
    ('USD', 'GBP', 0.79, 'manual'),
    ('USD', 'CAD', 1.36, 'manual'),
    ('USD', 'AUD', 1.53, 'manual'),
    ('USD', 'SGD', 1.34, 'manual'),
    ('USD', 'JPY', 149.50, 'manual'),
    ('EUR', 'USD', 1.09, 'manual'),
    ('GBP', 'USD', 1.27, 'manual'),
    ('CAD', 'USD', 0.74, 'manual'),
    ('AUD', 'USD', 0.65, 'manual'),
    ('SGD', 'USD', 0.75, 'manual'),
    ('JPY', 'USD', 0.0067, 'manual')
ON CONFLICT (base_currency, target_currency) DO UPDATE SET rate = EXCLUDED.rate;

-- =====================================================
-- DEFAULT IP ALLOWLIST (for development)
-- =====================================================
INSERT INTO ip_allowlist (cidr, description, is_active)
VALUES
    ('10.0.0.0/8', 'Private network - Class A', true),
    ('172.16.0.0/12', 'Private network - Class B', true),
    ('192.168.0.0/16', 'Private network - Class C', true),
    ('127.0.0.1/32', 'Localhost', true)
ON CONFLICT DO NOTHING;
