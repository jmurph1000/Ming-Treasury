-- Migration: 001_initial_schema
-- Description: Create all core tables for Gusto Treasury Payment Tool
-- Created: 2024

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ap_staff', 'ap_manager', 'sr_ap_manager', 'treasury', 'cfo', 'admin')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
    workday_id VARCHAR(100),
    title VARCHAR(255),
    department VARCHAR(255),
    cost_center VARCHAR(100),
    manager_name VARCHAR(255),
    manager_email VARCHAR(255),
    pe_partner_name VARCHAR(255),
    pe_partner_email VARCHAR(255),
    payment_limit DECIMAL(15,2),
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_workday_id ON users(workday_id);

-- =====================================================
-- BANK ACCOUNTS TABLE
-- =====================================================
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number_encrypted BYTEA NOT NULL,
    routing_number_encrypted BYTEA NOT NULL,
    account_type VARCHAR(50) CHECK (account_type IN ('checking', 'savings', 'payroll', 'operating')),
    currency VARCHAR(3) DEFAULT 'USD',
    daily_limit DECIMAL(15,2),
    dual_control_required BOOLEAN DEFAULT true,
    dual_control_threshold DECIMAL(15,2),
    dual_control_mode VARCHAR(20) DEFAULT 'all' CHECK (dual_control_mode IN ('all', 'wires_only', 'above_threshold')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE is_active = true;

-- =====================================================
-- SAVED PAYEES TABLE
-- =====================================================
CREATE TABLE saved_payees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('ach', 'wire', 'check', 'internal')),
    bank_name VARCHAR(255),
    routing_number_encrypted BYTEA,
    account_number_encrypted BYTEA,
    swift_code VARCHAR(11),
    iban VARCHAR(34),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(3) DEFAULT 'USA',
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payees_name ON saved_payees(name);
CREATE INDEX idx_payees_type ON saved_payees(payment_type);
CREATE INDEX idx_payees_active ON saved_payees(is_active) WHERE is_active = true;

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(20) UNIQUE NOT NULL,
    requester_id UUID NOT NULL REFERENCES users(id),
    payee_id UUID REFERENCES saved_payees(id),
    payee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fx_rate DECIMAL(15,6),
    usd_equivalent DECIMAL(15,2) NOT NULL CHECK (usd_equivalent > 0),
    account_id UUID NOT NULL REFERENCES accounts(id),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('ach', 'wire', 'check', 'internal')),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'approved', 'rejected', 'returned',
        'ready_to_execute', 'pending_confirmation', 'executed', 'bank_rejected', 'cancelled'
    )),
    business_justification TEXT NOT NULL CHECK (char_length(business_justification) >= 20),
    requested_date DATE NOT NULL,
    actual_execution_date DATE,
    bank_reference VARCHAR(100),
    bank_rejection_reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')),
    recurring_end_date DATE,
    parent_recurring_id UUID REFERENCES payments(id),
    template_id UUID,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    attachment_size INTEGER,
    current_approval_step INTEGER DEFAULT 0,
    total_approval_steps INTEGER,
    routing_rule_id UUID,
    is_duplicate_flagged BOOLEAN DEFAULT false,
    duplicate_reference_id UUID REFERENCES payments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_requester ON payments(requester_id);
CREATE INDEX idx_payments_payee ON payments(payee_name);
CREATE INDEX idx_payments_date ON payments(requested_date);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_account ON payments(account_id);
CREATE INDEX idx_payments_type ON payments(payment_type);
-- Duplicate detection index
CREATE INDEX idx_payments_duplicate_check ON payments(payee_name, amount, created_at);
-- Status-based queries
CREATE INDEX idx_payments_pending_approval ON payments(status) WHERE status = 'pending_approval';
CREATE INDEX idx_payments_ready_execute ON payments(status) WHERE status = 'ready_to_execute';

-- =====================================================
-- PAYMENT APPROVALS TABLE
-- =====================================================
CREATE TABLE payment_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approver_role VARCHAR(50) NOT NULL,
    step_number INTEGER NOT NULL CHECK (step_number >= 1 AND step_number <= 4),
    action VARCHAR(20) DEFAULT 'pending' CHECK (action IN ('pending', 'approved', 'rejected', 'returned', 'escalated')),
    comment TEXT,
    notified_at TIMESTAMP WITH TIME ZONE,
    actioned_at TIMESTAMP WITH TIME ZONE,
    escalated_at TIMESTAMP WITH TIME ZONE,
    escalated_to_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payment_id, step_number)
);

CREATE INDEX idx_approvals_payment ON payment_approvals(payment_id);
CREATE INDEX idx_approvals_approver ON payment_approvals(approver_id);
CREATE INDEX idx_approvals_pending ON payment_approvals(action) WHERE action = 'pending';
CREATE INDEX idx_approvals_step ON payment_approvals(payment_id, step_number);

-- =====================================================
-- APPROVAL COMMENTS TABLE
-- =====================================================
CREATE TABLE approval_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES payment_approvals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_payment ON approval_comments(payment_id);
CREATE INDEX idx_comments_created ON approval_comments(created_at);

-- =====================================================
-- EXECUTION CONFIRMATIONS TABLE (Dual Control)
-- =====================================================
CREATE TABLE execution_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    confirmer_id UUID NOT NULL REFERENCES users(id),
    confirmation_type VARCHAR(20) NOT NULL CHECK (confirmation_type IN ('primary', 'secondary')),
    bank_reference VARCHAR(100),
    actual_amount DECIMAL(15,2),
    actual_date DATE,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_emergency_halt BOOLEAN DEFAULT false,
    halt_reason TEXT,
    UNIQUE(payment_id, confirmation_type)
);

CREATE INDEX idx_confirmations_payment ON execution_confirmations(payment_id);
CREATE INDEX idx_confirmations_confirmer ON execution_confirmations(confirmer_id);

-- =====================================================
-- ROUTING RULES TABLE
-- =====================================================
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN (
        'account', 'payment_type', 'amount_range', 'payee', 'department', 'combined'
    )),
    -- Trigger conditions (evaluated based on trigger_type)
    account_id UUID REFERENCES accounts(id),
    payment_type VARCHAR(20),
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    department VARCHAR(255),
    payee_pattern VARCHAR(255),
    -- Approval configuration
    num_approvers INTEGER NOT NULL CHECK (num_approvers BETWEEN 1 AND 4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_routing_priority ON routing_rules(priority);
CREATE INDEX idx_routing_active ON routing_rules(is_active) WHERE is_active = true;

-- =====================================================
-- APPROVAL CHAINS TABLE
-- =====================================================
CREATE TABLE approval_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES routing_rules(id) ON DELETE CASCADE,
    step INTEGER NOT NULL CHECK (step BETWEEN 1 AND 4),
    approver_role VARCHAR(50),
    specific_approver_id UUID REFERENCES users(id),
    escalation_hours INTEGER DEFAULT 24,
    escalation_role VARCHAR(50),
    escalation_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rule_id, step)
);

CREATE INDEX idx_chains_rule ON approval_chains(rule_id);

-- =====================================================
-- AUDIT LOG TABLE (Immutable)
-- =====================================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_record ON audit_log(record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_action ON audit_log(action);

-- Prevent updates/deletes on audit_log (SOX compliance)
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- =====================================================
-- ACCESS REQUESTS TABLE (User Provisioning)
-- =====================================================
CREATE TABLE access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    requested_role VARCHAR(50) NOT NULL,
    admin_id UUID NOT NULL REFERENCES users(id),
    workday_data JSONB,
    manager_email VARCHAR(255),
    manager_name VARCHAR(255),
    approval_token VARCHAR(500) UNIQUE,
    denial_token VARCHAR(500) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    manager_response_at TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_access_email ON access_requests(email);
CREATE INDEX idx_access_status ON access_requests(status);
CREATE INDEX idx_access_approval_token ON access_requests(approval_token);
CREATE INDEX idx_access_denial_token ON access_requests(denial_token);
CREATE INDEX idx_access_expires ON access_requests(expires_at);

-- =====================================================
-- PAYMENT TEMPLATES TABLE
-- =====================================================
CREATE TABLE payment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    payee_id UUID REFERENCES saved_payees(id),
    payee_name VARCHAR(255),
    payment_type VARCHAR(20) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    default_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    default_justification TEXT,
    is_shared BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_user ON payment_templates(user_id);
CREATE INDEX idx_templates_shared ON payment_templates(is_shared) WHERE is_shared = true;

-- =====================================================
-- BATCH WINDOWS TABLE
-- =====================================================
CREATE TABLE batch_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cutoff_time TIME NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    days_of_week INTEGER[] CHECK (array_length(days_of_week, 1) <= 7),
    payment_types VARCHAR(20)[],
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- BANK HOLIDAYS TABLE
-- =====================================================
CREATE TABLE bank_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(3) DEFAULT 'USA',
    year INTEGER NOT NULL,
    is_federal BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, country)
);

CREATE INDEX idx_holidays_date ON bank_holidays(date);
CREATE INDEX idx_holidays_year ON bank_holidays(year);
CREATE INDEX idx_holidays_country ON bank_holidays(country);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    payment_id UUID REFERENCES payments(id),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) CHECK (channel IN ('email', 'slack', 'in_app')),
    recipient_email VARCHAR(255),
    recipient_slack_id VARCHAR(100),
    subject VARCHAR(500),
    body TEXT,
    template_name VARCHAR(100),
    template_data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_payment ON notifications(payment_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_pending ON notifications(status) WHERE status = 'pending';

-- =====================================================
-- FX RATES CACHE TABLE
-- =====================================================
CREATE TABLE fx_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(base_currency, target_currency)
);

CREATE INDEX idx_fx_rates_pair ON fx_rates(base_currency, target_currency);

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON system_settings(key);
CREATE INDEX idx_settings_category ON system_settings(category);

-- =====================================================
-- IP ALLOWLIST TABLE
-- =====================================================
CREATE TABLE ip_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidr VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SESSIONS TABLE (for Redis backup)
-- =====================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
