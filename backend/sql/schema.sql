-- iFinance Books schema

CREATE TABLE IF NOT EXISTS auth_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  type TEXT NOT NULL,
  joined_on DATE
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  hp_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile TEXT,
  reg_no TEXT,
  village TEXT,
  emi_period INTEGER NOT NULL,
  emi_amount NUMERIC(12, 2) NOT NULL,
  makers_no TEXT,
  model TEXT,
  chasis_no TEXT,
  eng_no TEXT,
  cb BOOLEAN NOT NULL DEFAULT FALSE,
  clr_date DATE,
  emi_date DATE,
  seized TEXT NOT NULL DEFAULT 'NO',
  closed TEXT NOT NULL DEFAULT 'NO'
);

CREATE TABLE IF NOT EXISTS emi_schedules (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sno INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  interest_component NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_interest NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL,
  cumulative_balance NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE (customer_id, sno)
);

CREATE TABLE IF NOT EXISTS out_payments (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sno INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  paid_date DATE NOT NULL,
  interest NUMERIC(8, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  receipt_no INTEGER NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  paid_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  ta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bike_purchases (
  id INTEGER PRIMARY KEY,
  rc_no TEXT NOT NULL,
  makers TEXT,
  model TEXT,
  purchase_date DATE,
  purchase_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  repair_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS generic_modules (
  module_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS generic_module_rows (
  id SERIAL PRIMARY KEY,
  module_key TEXT NOT NULL REFERENCES generic_modules(module_key) ON DELETE CASCADE,
  row_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS report_menu (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_lines (
  id SERIAL PRIMARY KEY,
  statement TEXT NOT NULL CHECK (statement IN ('balance_sheet', 'pnl')),
  side TEXT NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS day_report_rows (
  id SERIAL PRIMARY KEY,
  sno INTEGER NOT NULL,
  name TEXT NOT NULL,
  rc_no TEXT,
  hp TEXT,
  description TEXT,
  created_by TEXT,
  receipt_amt NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chart_hps (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chart_financed (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS chart_collection (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  collected NUMERIC(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS dashboard_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  income NUMERIC(14, 2) NOT NULL DEFAULT 0,
  expenses NUMERIC(14, 2) NOT NULL DEFAULT 0,
  emi_collection NUMERIC(14, 2) NOT NULL DEFAULT 0,
  hl_collection NUMERIC(14, 2) NOT NULL DEFAULT 0,
  od_collection NUMERIC(14, 2) NOT NULL DEFAULT 0,
  closed_hp INTEGER NOT NULL DEFAULT 0
);

CREATE SEQUENCE IF NOT EXISTS receipt_no_seq START 400000;
