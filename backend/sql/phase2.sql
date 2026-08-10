-- Phase 2: Transaction modules (proper relational tables)

CREATE TABLE IF NOT EXISTS handloan_accounts (
  id SERIAL PRIMARY KEY,
  loan_type TEXT NOT NULL DEFAULT '1' CHECK (loan_type IN ('1', '2')),
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(8, 2) NOT NULL DEFAULT 0,
  issued_date DATE DEFAULT CURRENT_DATE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_handloans (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_amount NUMERIC(14, 2) NOT NULL,
  interest_rate NUMERIC(8, 2) NOT NULL DEFAULT 0,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  balance NUMERIC(14, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  account_kind TEXT DEFAULT 'BANK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS capital_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposit_accounts (
  id SERIAL PRIMARY KEY,
  deposit_type TEXT NOT NULL DEFAULT 'normal' CHECK (deposit_type IN ('normal', 'dp')),
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cheques (
  id SERIAL PRIMARY KEY,
  cheque_no TEXT NOT NULL,
  description TEXT,
  cheque_date DATE,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chit_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  mobile TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  village TEXT,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ie_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ie_bills (
  id SERIAL PRIMARY KEY,
  amount NUMERIC(14, 2) NOT NULL,
  bill_type TEXT NOT NULL CHECK (bill_type IN ('Income', 'Expense')),
  paid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhance bike_purchases if columns missing (safe no-ops via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bike_purchases' AND column_name = 'status'
  ) THEN
    ALTER TABLE bike_purchases ADD COLUMN status TEXT NOT NULL DEFAULT 'in_stock';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bike_purchases' AND column_name = 'sold_date'
  ) THEN
    ALTER TABLE bike_purchases ADD COLUMN sold_date DATE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bike_purchases' AND column_name = 'notes'
  ) THEN
    ALTER TABLE bike_purchases ADD COLUMN notes TEXT;
  END IF;
END $$;
