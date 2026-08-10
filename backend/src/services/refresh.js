import { query } from '../db.js'

/** Recompute dashboard_stats from live Phase-1 + Phase-2 tables. */
export async function refreshDashboardStats(executor = { query }) {
  const [receipts, expenses, handloans, overdue, closed] = await Promise.all([
    executor.query(`SELECT COALESCE(SUM(amount), 0) AS emi, COALESCE(SUM(ta), 0) AS ta FROM receipts`),
    executor.query(`
      SELECT
        COALESCE(SUM(CASE WHEN bill_type = 'Income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN bill_type = 'Expense' THEN amount ELSE 0 END), 0) AS expenses
      FROM ie_bills
    `).catch(async () => ({
      // fallback if phase2 table missing
      rows: [{ income: 0, expenses: 0 }],
    })),
    executor.query(`
      SELECT
        COALESCE((SELECT SUM(balance) FROM handloan_accounts), 0)
        + COALESCE((SELECT SUM(balance) FROM customer_handloans WHERE status = 'open'), 0)
        AS hl
    `).catch(async () => ({ rows: [{ hl: 0 }] })),
    executor.query(`
      SELECT COALESCE(SUM(balance), 0) AS od
      FROM emi_schedules
      WHERE status <> 'paid' AND due_date < CURRENT_DATE
    `),
    executor.query(`SELECT COUNT(*)::int AS closed FROM customers WHERE closed = 'YES'`),
  ])

  const emiCollection = Number(receipts.rows[0].emi || 0)
  const taIncome = Number(receipts.rows[0].ta || 0)
  const moduleIncome = Number(expenses.rows[0].income || 0)
  const moduleExpenses = Number(expenses.rows[0].expenses || 0)

  await executor.query(
    `INSERT INTO dashboard_stats (id, income, expenses, emi_collection, hl_collection, od_collection, closed_hp)
     VALUES (1, $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       income = EXCLUDED.income,
       expenses = EXCLUDED.expenses,
       emi_collection = EXCLUDED.emi_collection,
       hl_collection = EXCLUDED.hl_collection,
       od_collection = EXCLUDED.od_collection,
       closed_hp = EXCLUDED.closed_hp`,
    [
      moduleIncome + taIncome,
      moduleExpenses,
      emiCollection,
      Number(handloans.rows[0].hl || 0),
      Number(overdue.rows[0].od || 0),
      Number(closed.rows[0].closed || 0),
    ]
  )
}

export async function refreshLedgerSnapshots(executor = { query }) {
  const [hp, cash, interest, expInc, banks, capitals, chits, assets, hl] = await Promise.all([
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS outstanding FROM emi_schedules WHERE status <> 'paid'`),
    executor.query(`SELECT COALESCE(SUM(total), 0) AS cash FROM receipts`),
    executor.query(`SELECT COALESCE(SUM(amount), 0) AS interest FROM receipts`),
    executor.query(`
      SELECT COALESCE(SUM(CASE WHEN bill_type = 'Income' THEN amount ELSE 0 END), 0) AS income
      FROM ie_bills
    `).catch(async () => ({ rows: [{ income: 0 }] })),
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS v FROM bank_accounts`).catch(async () => ({ rows: [{ v: 0 }] })),
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS v FROM capital_accounts`).catch(async () => ({ rows: [{ v: 0 }] })),
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS v FROM chit_accounts`).catch(async () => ({ rows: [{ v: 0 }] })),
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS v FROM asset_accounts`).catch(async () => ({ rows: [{ v: 0 }] })),
    executor.query(`SELECT COALESCE(SUM(balance), 0) AS v FROM handloan_accounts`).catch(async () => ({ rows: [{ v: 0 }] })),
  ])

  const updates = [
    ['balance_sheet', 'assets', 'HP OUTSTANDING', Number(hp.rows[0].outstanding || 0)],
    ['balance_sheet', 'liabilities', 'CASH IN HAND', Number(cash.rows[0].cash || 0)],
    ['balance_sheet', 'assets', 'BANKS', Number(banks.rows[0].v || 0)],
    ['balance_sheet', 'liabilities', 'CAPITAL', Number(capitals.rows[0].v || 0)],
    ['balance_sheet', 'assets', 'CHITS', Number(chits.rows[0].v || 0)],
    ['balance_sheet', 'assets', 'ASSETS', Number(assets.rows[0].v || 0)],
    ['balance_sheet', 'assets', 'HANDLOANS', Number(hl.rows[0].v || 0)],
    ['pnl', 'income', 'RECEIVED INTEREST', Number(interest.rows[0].interest || 0)],
    ['pnl', 'income', 'AGREEMENTS', Number(expInc.rows[0].income || 0)],
  ]

  for (const [statement, side, label, amount] of updates) {
    await executor.query(
      `UPDATE ledger_lines SET amount = $1
       WHERE statement = $2 AND side = $3 AND label = $4`,
      [amount, statement, side, label]
    )
  }
}

export async function refreshCharts(executor = { query }) {
  const open = await executor.query(`SELECT COUNT(*)::int AS n FROM customers WHERE closed = 'NO'`)
  const closed = await executor.query(`SELECT COUNT(*)::int AS n FROM customers WHERE closed = 'YES'`)

  await executor.query(`DELETE FROM chart_hps`)
  await executor.query(`INSERT INTO chart_hps (name, value) VALUES ('Open', $1), ('Closed', $2)`, [
    Number(open.rows[0].n || 0),
    Number(closed.rows[0].n || 0),
  ])

  await executor.query(`DELETE FROM chart_financed`)
  await executor.query(`
    INSERT INTO chart_financed (month, amount)
    SELECT to_char(emi_date, 'Mon') AS month,
           SUM(emi_amount * emi_period) AS amount
    FROM customers
    WHERE emi_date IS NOT NULL
    GROUP BY to_char(emi_date, 'Mon'), date_trunc('month', emi_date)
    ORDER BY date_trunc('month', emi_date)
  `)

  await executor.query(`DELETE FROM chart_collection`)
  await executor.query(`
    INSERT INTO chart_collection (month, collected)
    SELECT to_char(paid_date, 'Mon') AS month,
           SUM(amount) AS collected
    FROM receipts
    GROUP BY to_char(paid_date, 'Mon'), date_trunc('month', paid_date)
    ORDER BY date_trunc('month', paid_date)
  `)
}

export async function refreshAllDerived(executor = { query }) {
  await refreshDashboardStats(executor)
  await refreshLedgerSnapshots(executor)
  await refreshCharts(executor)
}
