-- Migration: 002_audit_triggers
-- Description: Create audit trigger functions for SOX compliance
-- All changes to sensitive tables are logged with before/after values

-- =====================================================
-- GENERIC AUDIT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields JSONB;
    current_user_id UUID;
    current_user_email VARCHAR(255);
BEGIN
    -- Try to get current user from session variable (set by application)
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
        current_user_email := current_setting('app.current_user_email', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
        current_user_email := 'system';
    END;

    IF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        -- Remove sensitive fields from audit log
        new_data := new_data - ARRAY['account_number_encrypted', 'routing_number_encrypted'];

        INSERT INTO audit_log (
            user_id, user_email, action, table_name, record_id,
            old_values, new_values, ip_address, session_id, timestamp
        ) VALUES (
            current_user_id,
            current_user_email,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            NULL,
            new_data,
            inet(current_setting('app.client_ip', true)),
            current_setting('app.session_id', true),
            NOW()
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);

        -- Remove sensitive fields
        old_data := old_data - ARRAY['account_number_encrypted', 'routing_number_encrypted'];
        new_data := new_data - ARRAY['account_number_encrypted', 'routing_number_encrypted'];

        -- Only log if there are actual changes (excluding updated_at)
        old_data := old_data - 'updated_at';
        new_data := new_data - 'updated_at';

        IF old_data IS DISTINCT FROM new_data THEN
            INSERT INTO audit_log (
                user_id, user_email, action, table_name, record_id,
                old_values, new_values, ip_address, session_id, timestamp
            ) VALUES (
                current_user_id,
                current_user_email,
                'UPDATE',
                TG_TABLE_NAME,
                NEW.id,
                old_data,
                new_data,
                inet(current_setting('app.client_ip', true)),
                current_setting('app.session_id', true),
                NOW()
            );
        END IF;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        -- Remove sensitive fields
        old_data := old_data - ARRAY['account_number_encrypted', 'routing_number_encrypted'];

        INSERT INTO audit_log (
            user_id, user_email, action, table_name, record_id,
            old_values, new_values, ip_address, session_id, timestamp
        ) VALUES (
            current_user_id,
            current_user_email,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            old_data,
            NULL,
            inet(current_setting('app.client_ip', true)),
            current_setting('app.session_id', true),
            NOW()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PAYMENT-SPECIFIC AUDIT FUNCTION
-- Captures payment state changes with more detail
-- =====================================================
CREATE OR REPLACE FUNCTION payment_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    current_user_email VARCHAR(255);
    action_desc VARCHAR(100);
BEGIN
    BEGIN
        current_user_id := current_setting('app.current_user_id', true)::UUID;
        current_user_email := current_setting('app.current_user_email', true);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
        current_user_email := 'system';
    END;

    IF TG_OP = 'UPDATE' THEN
        -- Track status changes specifically
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            action_desc := 'PAYMENT_STATUS_CHANGE: ' || OLD.status || ' -> ' || NEW.status;
        ELSE
            action_desc := 'PAYMENT_UPDATE';
        END IF;

        INSERT INTO audit_log (
            user_id, user_email, action, table_name, record_id,
            old_values, new_values, timestamp
        ) VALUES (
            current_user_id,
            current_user_email,
            action_desc,
            'payments',
            NEW.id,
            jsonb_build_object(
                'status', OLD.status,
                'amount', OLD.amount,
                'currency', OLD.currency,
                'payee_name', OLD.payee_name,
                'current_approval_step', OLD.current_approval_step,
                'bank_reference', OLD.bank_reference
            ),
            jsonb_build_object(
                'status', NEW.status,
                'amount', NEW.amount,
                'currency', NEW.currency,
                'payee_name', NEW.payee_name,
                'current_approval_step', NEW.current_approval_step,
                'bank_reference', NEW.bank_reference
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- APPLY AUDIT TRIGGERS TO SENSITIVE TABLES
-- =====================================================

-- Users table
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Accounts table
DROP TRIGGER IF EXISTS audit_accounts ON accounts;
CREATE TRIGGER audit_accounts
    AFTER INSERT OR UPDATE OR DELETE ON accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Payments table (uses special function)
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
    AFTER UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION payment_audit_trigger_function();

-- Payment approvals
DROP TRIGGER IF EXISTS audit_payment_approvals ON payment_approvals;
CREATE TRIGGER audit_payment_approvals
    AFTER INSERT OR UPDATE OR DELETE ON payment_approvals
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Execution confirmations
DROP TRIGGER IF EXISTS audit_execution_confirmations ON execution_confirmations;
CREATE TRIGGER audit_execution_confirmations
    AFTER INSERT OR UPDATE OR DELETE ON execution_confirmations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Routing rules
DROP TRIGGER IF EXISTS audit_routing_rules ON routing_rules;
CREATE TRIGGER audit_routing_rules
    AFTER INSERT OR UPDATE OR DELETE ON routing_rules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Approval chains
DROP TRIGGER IF EXISTS audit_approval_chains ON approval_chains;
CREATE TRIGGER audit_approval_chains
    AFTER INSERT OR UPDATE OR DELETE ON approval_chains
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Access requests
DROP TRIGGER IF EXISTS audit_access_requests ON access_requests;
CREATE TRIGGER audit_access_requests
    AFTER INSERT OR UPDATE OR DELETE ON access_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Saved payees
DROP TRIGGER IF EXISTS audit_saved_payees ON saved_payees;
CREATE TRIGGER audit_saved_payees
    AFTER INSERT OR UPDATE OR DELETE ON saved_payees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- System settings
DROP TRIGGER IF EXISTS audit_system_settings ON system_settings;
CREATE TRIGGER audit_system_settings
    AFTER INSERT OR UPDATE OR DELETE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_payees_updated_at BEFORE UPDATE ON saved_payees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON routing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_templates_updated_at BEFORE UPDATE ON payment_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_windows_updated_at BEFORE UPDATE ON batch_windows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REFERENCE NUMBER GENERATOR
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS payment_reference_seq START 100000;

CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_number IS NULL THEN
        NEW.reference_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('payment_reference_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_payment_ref BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_payment_reference();
