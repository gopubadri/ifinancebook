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
