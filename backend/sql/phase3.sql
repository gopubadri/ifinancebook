-- Phase 3: Double-entry accounting

CREATE TABLE IF NOT EXISTS acc_masters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS acc_sub_masters (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  master_id INTEGER REFERENCES acc_masters(id) ON DELETE SET NULL,
  -- normal_balance: debit for assets/expenses, credit for liabilities/income
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  statement TEXT NOT NULL CHECK (statement IN ('balance_sheet', 'pnl')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS acc_accounts (
  id SERIAL PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  village TEXT DEFAULT 'NIL',
  mobile TEXT DEFAULT '0000000000',
  sub_master_id INTEGER NOT NULL REFERENCES acc_sub_masters(id),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, sub_master_id)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  narration TEXT,
  reference_type TEXT, -- RECEIPT, IE_BILL, MANUAL, OPENING, etc.
  reference_id TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES acc_accounts(id),
  debit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  description TEXT,
  CONSTRAINT journal_line_one_side CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(reference_type, reference_id);
