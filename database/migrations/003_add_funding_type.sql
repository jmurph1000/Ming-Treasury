-- Add funding_type column to payments table
ALTER TABLE payments
    ADD COLUMN funding_type VARCHAR(20) NOT NULL DEFAULT 'external'
    CHECK (funding_type IN ('internal', 'external'));
