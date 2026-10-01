-- P0 polish: customer completeness, reminders, settlement, out-payment due dates

ALTER TABLE customers ADD COLUMN IF NOT EXISTS seized_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS closed_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alternate_mobile TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE out_payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE out_payments ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS customer_reminders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  remind_date DATE NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlements (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  outstanding_before NUMERIC(14, 2) NOT NULL DEFAULT 0,
  settlement_interest NUMERIC(14, 2) NOT NULL DEFAULT 0,
  waiver_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  amount_collected NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_due NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_customer ON customer_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON customer_reminders(remind_date);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_expiry DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pollution_expiry DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rta_token_date DATE;
ALTER TABLE bike_purchases ADD COLUMN IF NOT EXISTS rta_token_date DATE;

ALTER TABLE day_report_rows ADD COLUMN IF NOT EXISTS entry_date DATE;
CREATE INDEX IF NOT EXISTS idx_day_report_entry_date ON day_report_rows(entry_date);
UPDATE day_report_rows
SET entry_date = CURRENT_DATE
WHERE entry_date IS NULL AND upper(name) <> 'OPENING BALANCE';

ALTER TABLE receipts ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS voided_by TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_id INTEGER;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS overpayment NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bank_account_id INTEGER;
ALTER TABLE cheques ADD COLUMN IF NOT EXISTS cleared_at DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS seized_notes TEXT;

CREATE TABLE IF NOT EXISTS receipt_allocations (
  id SERIAL PRIMARY KEY,
  receipt_no INTEGER NOT NULL,
  emi_schedule_id INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  interest NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS handloan_receipts (
  id SERIAL PRIMARY KEY,
  customer_handloan_id INTEGER NOT NULL REFERENCES customer_handloans(id) ON DELETE CASCADE,
  receipt_no INTEGER NOT NULL,
  paid_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail JSONB
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'deposit_accounts'
  ) AND NOT EXISTS (
    SELECT 1 FROM deposit_accounts WHERE deposit_type = 'dp'
  ) THEN
    INSERT INTO deposit_accounts (deposit_type, name, village, balance)
    VALUES ('dp', 'DP - OFFICE MARGIN', 'TADEPALLIGUDEM', 85000);
  END IF;
END $$;
