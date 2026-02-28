-- Add conditional funding detail fields to payments table
-- Internal funding: destination account
ALTER TABLE payments ADD COLUMN destination_account_id UUID REFERENCES accounts(id);

-- External funding: third-party bank details (all capped at 30 characters)
ALTER TABLE payments ADD COLUMN ext_bank_name VARCHAR(30);
ALTER TABLE payments ADD COLUMN ext_routing_number VARCHAR(30);
ALTER TABLE payments ADD COLUMN ext_bank_account VARCHAR(30);
ALTER TABLE payments ADD COLUMN ext_recipient_address VARCHAR(30);
ALTER TABLE payments ADD COLUMN ext_special_instructions VARCHAR(30);
