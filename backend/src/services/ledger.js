import { query, pool } from '../db.js'

export async function getAccountByName(name, executor = { query }) {
  const { rows } = await executor.query(
    `SELECT a.*, s.name AS sub_master, s.normal_balance, s.statement
     FROM acc_accounts a
     JOIN acc_sub_masters s ON s.id = a.sub_master_id
     WHERE lower(a.name) = lower($1)
     LIMIT 1`,
    [name]
  )
  return rows[0] || null
}

/**
 * Post a balanced journal entry.
 * lines: [{ accountId | accountName, debit, credit, description }]
 */
export async function postJournal({
  entryDate = new Date().toISOString().slice(0, 10),
  narration = '',
  referenceType = 'MANUAL',
  referenceId = null,
  createdBy = null,
  lines = [],
}, executor = null) {
  const ownClient = !executor
  const client = executor || await pool.connect()

  try {
    if (ownClient) await client.query('BEGIN')

    const resolved = []
    for (const line of lines) {
      let accountId = line.accountId
      if (!accountId && line.accountName) {
        const acc = await getAccountByName(line.accountName, client)
        if (!acc) throw new Error(`Account not found: ${line.accountName}`)
        accountId = acc.id
      }
      const debit = Number(line.debit || 0)
      const credit = Number(line.credit || 0)
      if (debit < 0 || credit < 0) throw new Error('Debit/credit cannot be negative')
      if (debit === 0 && credit === 0) continue
      if (debit > 0 && credit > 0) throw new Error('A line cannot have both debit and credit')
      resolved.push({
        accountId,
        debit,
        credit,
        description: line.description || null,
      })
    }

    if (resolved.length < 2) throw new Error('Journal needs at least two lines')

    const totalDr = resolved.reduce((s, l) => s + l.debit, 0)
    const totalCr = resolved.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDr - totalCr) > 0.009) {
      throw new Error(`Journal not balanced. Debit ${totalDr} != Credit ${totalCr}`)
    }

    // Idempotent for auto posts
    if (referenceType && referenceId) {
      const existing = await client.query(
        `SELECT id FROM journal_entries WHERE reference_type = $1 AND reference_id = $2 LIMIT 1`,
        [referenceType, String(referenceId)]
      )
      if (existing.rowCount > 0) {
        if (ownClient) await client.query('COMMIT')
        return { id: existing.rows[0].id, skipped: true }
      }
    }

    const { rows } = await client.query(
      `INSERT INTO journal_entries (entry_date, narration, reference_type, reference_id, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [entryDate, narration, referenceType, referenceId != null ? String(referenceId) : null, createdBy]
    )
    const entryId = rows[0].id

    for (const line of resolved) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1,$2,$3,$4,$5)`,
        [entryId, line.accountId, line.debit, line.credit, line.description]
      )
    }

    if (ownClient) await client.query('COMMIT')
    return { id: entryId, skipped: false, debit: totalDr, credit: totalCr }
  } catch (err) {
    if (ownClient) await client.query('ROLLBACK')
    throw err
  } finally {
    if (ownClient) client.release()
  }
}

export async function postEmiReceipt({
  receiptNo,
  amount,
  ta,
  total,
  paidDate,
  customerName,
  hpNo,
  createdBy,
}, executor = null) {
  return postJournal({
    entryDate: paidDate,
    narration: `EMI receipt ${receiptNo} — ${customerName} (${hpNo})`,
    referenceType: 'RECEIPT',
    referenceId: String(receiptNo),
    createdBy,
    lines: [
      { accountName: 'CASH / BANK COLLECTIONS', debit: Number(total), credit: 0, description: 'Collection' },
      { accountName: 'HP RECEIVABLES', debit: 0, credit: Number(amount), description: 'EMI principal/interest recovery' },
      ...(Number(ta) > 0
        ? [{ accountName: "EMI TA's", debit: 0, credit: Number(ta), description: 'Travelling allowance' }]
        : []),
      // If no TA, still need balance: amount may equal total
      ...(Number(ta) === 0 && Number(total) === Number(amount)
        ? []
        : Number(ta) === 0 && Number(total) !== Number(amount)
          ? [{ accountName: 'RECEIVED INTEREST', debit: 0, credit: Number(total) - Number(amount), description: 'Adj' }]
          : []),
    ].filter((l) => (l.debit || 0) + (l.credit || 0) > 0),
  }, executor)
}

export async function postIeBill({ id, amount, billType, paidDate, account, description, createdBy }, executor = null) {
  const amt = Number(amount)
  const isIncome = String(billType).toLowerCase() === 'income'
  const headName = account && String(account).trim()
    ? String(account).trim().toUpperCase()
    : (isIncome ? 'AGREEMENTS' : 'GENERAL EXPENSE')

  // Ensure head account exists under income/expense
  let head = await getAccountByName(headName, executor || { query })
  if (!head) {
    const subName = isIncome ? 'INCOME HEADS' : 'EXPENSE HEADS'
    const sub = await (executor || { query }).query(
      `SELECT id FROM acc_sub_masters WHERE name = $1`,
      [subName]
    )
    if (sub.rows[0]) {
      const inserted = await (executor || { query }).query(
        `INSERT INTO acc_accounts (name, sub_master_id, is_system)
         VALUES ($1,$2,FALSE) RETURNING *`,
        [headName, sub.rows[0].id]
      )
      head = inserted.rows[0]
    }
  }

  const lines = isIncome
    ? [
        { accountName: 'CASH / BANK COLLECTIONS', debit: amt, credit: 0 },
        { accountId: head.id, accountName: headName, debit: 0, credit: amt, description },
      ]
    : [
        { accountId: head.id, accountName: headName, debit: amt, credit: 0, description },
        { accountName: 'CASH / BANK COLLECTIONS', debit: 0, credit: amt },
      ]

  return postJournal({
    entryDate: paidDate,
    narration: `${billType}: ${description || headName}`,
    referenceType: 'IE_BILL',
    referenceId: String(id),
    createdBy,
    lines,
  }, executor)
}

export async function getAccountBalances(executor = { query }) {
  const { rows } = await executor.query(`
    SELECT
      a.id, a.code, a.name, a.village, a.mobile, a.is_system,
      s.id AS sub_master_id, s.name AS sub_master,
      s.normal_balance, s.statement, m.name AS master,
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM acc_accounts a
    JOIN acc_sub_masters s ON s.id = a.sub_master_id
    LEFT JOIN acc_masters m ON m.id = s.master_id
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    WHERE a.is_active = TRUE
    GROUP BY a.id, s.id, m.name
    ORDER BY s.sort_order, a.name
  `)

  return rows.map((r) => {
    const debit = Number(r.total_debit)
    const credit = Number(r.total_credit)
    const raw = r.normal_balance === 'debit' ? debit - credit : credit - debit
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      village: r.village,
      mobile: r.mobile,
      subMaster: r.sub_master,
      subMasterId: r.sub_master_id,
      master: r.master,
      normalBalance: r.normal_balance,
      statement: r.statement,
      totalDebit: debit,
      totalCredit: credit,
      balance: raw,
    }
  })
}

export async function getTrialBalance() {
  const accounts = await getAccountBalances()
  const rows = accounts
    .filter((a) => a.totalDebit !== 0 || a.totalCredit !== 0 || a.balance !== 0)
    .map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      subMaster: a.subMaster,
      debit: a.normalBalance === 'debit' ? Math.max(a.balance, 0) : (a.balance < 0 ? Math.abs(a.balance) : 0),
      credit: a.normalBalance === 'credit' ? Math.max(a.balance, 0) : (a.balance < 0 ? Math.abs(a.balance) : 0),
      totalDebit: a.totalDebit,
      totalCredit: a.totalCredit,
    }))

  // Prefer presenting closing balance side
  const better = accounts
    .filter((a) => a.totalDebit !== 0 || a.totalCredit !== 0)
    .map((a) => {
      const bal = a.totalDebit - a.totalCredit
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        subMaster: a.subMaster,
        debit: bal > 0 ? bal : 0,
        credit: bal < 0 ? Math.abs(bal) : 0,
      }
    })
    .filter((r) => r.debit !== 0 || r.credit !== 0)

  const totalDebit = better.reduce((s, r) => s + r.debit, 0)
  const totalCredit = better.reduce((s, r) => s + r.credit, 0)
  return { rows: better, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.02 }
}

export async function getBalanceSheetFromLedger() {
  const accounts = await getAccountBalances()
  const bs = accounts.filter((a) => a.statement === 'balance_sheet')

  const bySub = {}
  for (const a of bs) {
    if (!bySub[a.subMaster]) bySub[a.subMaster] = 0
    bySub[a.subMaster] += a.balance
  }

  // Classic presentation: assets (debit-normal), liabilities (credit-normal)
  const assetSubs = ['BANKS', 'ASSETS', 'CHITS', 'HANDLOANS', 'SUNDRY DEBTORS', 'HP OUTSTANDING', 'CONSULTANCY STOCK', 'OTHER']
  const liabilitySubs = ['CAPITAL', 'DEPOSITS DP', 'LOANS', 'SUNDRY CREDITORS', 'UNSECURED LOANS', 'CASH IN HAND', 'INTEREST RECEIVABLE', 'PROFIT & EXPENSES']

  const assets = assetSubs
    .filter((name) => bySub[name] != null)
    .map((name) => [name, Number(bySub[name] || 0)])

  const liabilities = liabilitySubs
    .filter((name) => bySub[name] != null)
    .map((name) => [name, Number(bySub[name] || 0)])

  // Add net profit from P&L heads into liabilities (profit)
  const pnl = await getPnlFromLedger()
  if (pnl.profit !== 0) {
    liabilities.push(['PROFIT', pnl.profit])
  }

  const totalAssets = assets.reduce((s, [, v]) => s + v, 0)
  const totalLiabilities = liabilities.reduce((s, [, v]) => s + v, 0)
  if (Math.abs(totalAssets - totalLiabilities) > 0.02) {
    liabilities.push(['Difference', Number((totalAssets - totalLiabilities).toFixed(2))])
  }

  return { assets, liabilities, totalAssets, totalLiabilities }
}

export async function getPnlFromLedger() {
  const accounts = await getAccountBalances()
  const income = accounts
    .filter((a) => a.statement === 'pnl' && a.normalBalance === 'credit')
    .map((a) => [a.name, a.balance])
  const expenses = accounts
    .filter((a) => a.statement === 'pnl' && a.normalBalance === 'debit')
    .map((a) => [a.name, a.balance])

  const totalIncome = income.reduce((s, [, v]) => s + v, 0)
  const totalExpenses = expenses.reduce((s, [, v]) => s + v, 0)
  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    profit: Number((totalIncome - totalExpenses).toFixed(2)),
  }
}

export async function getAccountLedger(accountId) {
  const acc = await query(
    `SELECT a.*, s.name AS sub_master FROM acc_accounts a
     JOIN acc_sub_masters s ON s.id = a.sub_master_id
     WHERE a.id = $1`,
    [accountId]
  )
  if (!acc.rows[0]) return null

  const { rows } = await query(
    `SELECT je.entry_date, je.narration, je.reference_type, je.reference_id,
            jl.debit, jl.credit, jl.description, je.id AS entry_id
     FROM journal_lines jl
     JOIN journal_entries je ON je.id = jl.journal_entry_id
     WHERE jl.account_id = $1
     ORDER BY je.entry_date, je.id, jl.id`,
    [accountId]
  )

  let running = 0
  const lines = rows.map((r) => {
    running += Number(r.debit) - Number(r.credit)
    return {
      date: r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : String(r.entry_date).slice(0, 10),
      narration: r.narration,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      description: r.description,
      debit: Number(r.debit),
      credit: Number(r.credit),
      balance: running,
      entryId: r.entry_id,
    }
  })

  return {
    account: {
      id: acc.rows[0].id,
      name: acc.rows[0].name,
      code: acc.rows[0].code,
      subMaster: acc.rows[0].sub_master,
    },
    lines,
  }
}
