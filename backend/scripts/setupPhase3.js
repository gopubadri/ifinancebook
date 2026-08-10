import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { pool } from '../src/db.js'

dotenv.config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const client = await pool.connect()
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/phase3.sql'), 'utf8')
    await client.query(sql)
    console.log('Phase 3 schema applied')

    const { rows: existing } = await client.query('SELECT COUNT(*)::int AS n FROM acc_sub_masters')
    if (existing[0].n > 0) {
      console.log('Chart of accounts already seeded — skip')
      return
    }

    await client.query('BEGIN')

    const masters = [
      ['ASSETS', 1],
      ['LIABILITIES', 2],
      ['INCOME', 3],
      ['EXPENSES', 4],
    ]
    for (const [name, sort] of masters) {
      await client.query(`INSERT INTO acc_masters (name, sort_order) VALUES ($1,$2)`, [name, sort])
    }

    const { rows: mrows } = await client.query(`SELECT id, name FROM acc_masters`)
    const mid = Object.fromEntries(mrows.map((r) => [r.name, r.id]))

    // name, master, normal_balance, statement, sort
    const subs = [
      ['BANKS', 'ASSETS', 'debit', 'balance_sheet', 1],
      ['ASSETS', 'ASSETS', 'debit', 'balance_sheet', 2],
      ['CHITS', 'ASSETS', 'debit', 'balance_sheet', 3],
      ['HANDLOANS', 'ASSETS', 'debit', 'balance_sheet', 4],
      ['SUNDRY DEBTORS', 'ASSETS', 'debit', 'balance_sheet', 5],
      ['HP OUTSTANDING', 'ASSETS', 'debit', 'balance_sheet', 6],
      ['CONSULTANCY STOCK', 'ASSETS', 'debit', 'balance_sheet', 7],
      ['OTHER', 'ASSETS', 'debit', 'balance_sheet', 8],
      ['CAPITAL', 'LIABILITIES', 'credit', 'balance_sheet', 1],
      ['DEPOSITS DP', 'LIABILITIES', 'credit', 'balance_sheet', 2],
      ['LOANS', 'LIABILITIES', 'credit', 'balance_sheet', 3],
      ['SUNDRY CREDITORS', 'LIABILITIES', 'credit', 'balance_sheet', 4],
      ['UNSECURED LOANS', 'LIABILITIES', 'credit', 'balance_sheet', 5],
      ['CASH IN HAND', 'LIABILITIES', 'credit', 'balance_sheet', 6],
      ['INTEREST RECEIVABLE', 'LIABILITIES', 'credit', 'balance_sheet', 7],
      ['PROFIT & EXPENSES', 'LIABILITIES', 'credit', 'balance_sheet', 8],
      ['INCOME HEADS', 'INCOME', 'credit', 'pnl', 1],
      ['EXPENSE HEADS', 'EXPENSES', 'debit', 'pnl', 1],
    ]

    for (const [name, master, nb, stmt, sort] of subs) {
      await client.query(
        `INSERT INTO acc_sub_masters (name, master_id, normal_balance, statement, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [name, mid[master], nb, stmt, sort]
      )
    }

    const { rows: srows } = await client.query(`SELECT id, name FROM acc_sub_masters`)
    const sid = Object.fromEntries(srows.map((r) => [r.name, r.id]))

    async function acc(name, sub, opts = {}) {
      await client.query(
        `INSERT INTO acc_accounts (code, name, village, mobile, sub_master_id, is_system)
         VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [opts.code || null, name, opts.village || 'NIL', opts.mobile || '0000000000', sid[sub]]
      )
    }

    // System accounts used by auto-posting
    await acc('CASH / BANK COLLECTIONS', 'BANKS', { code: 'BK001' })
    await acc('SBI - TADEPALLIGUDEM', 'BANKS', { code: 'BK002', village: 'TADEPALLIGUDEM' })
    await acc('HP RECEIVABLES', 'HP OUTSTANDING', { code: 'HP001' })
    await acc('HANDLOAN RECEIVABLES', 'HANDLOANS', { code: 'HL001' })
    await acc('FIXED ASSETS', 'ASSETS', { code: 'AS001', village: 'TADEPALLIGUDEM' })
    await acc('CONSULTANCY STOCK', 'CONSULTANCY STOCK', { code: 'CS001' })
    await acc('CHIT INVESTMENTS', 'CHITS', { code: 'CH001' })
    await acc('SHARE CAPITAL', 'CAPITAL', { code: 'CP001', village: 'TADEPALLIGUDEM' })
    await acc('CUSTOMER DEPOSITS', 'DEPOSITS DP', { code: 'DP001' })
    await acc('CASH CONTROL', 'CASH IN HAND', { code: 'CA001' })
    await acc('PROFIT OR LOSS', 'PROFIT & EXPENSES', { code: 'PL001' })

    await acc('RECEIVED INTEREST', 'INCOME HEADS', { code: 'IN001' })
    await acc("EMI TA's", 'INCOME HEADS', { code: 'IN002' })
    await acc("OD'S", 'INCOME HEADS', { code: 'IN003' })
    await acc('AGREEMENTS', 'INCOME HEADS', { code: 'IN004' })
    await acc('SALE PROFIT', 'INCOME HEADS', { code: 'IN005' })
    await acc('RENTALS', 'EXPENSE HEADS', { code: 'EX001' })
    await acc('SALARIES', 'EXPENSE HEADS', { code: 'EX002' })
    await acc('COMMISSIONS', 'EXPENSE HEADS', { code: 'EX003' })
    await acc('GENERAL EXPENSE', 'EXPENSE HEADS', { code: 'EX004' })

    // Opening balances journal from current Phase-2 snapshots (optional balanced opener)
    const bankSum = await client.query(`SELECT COALESCE(SUM(balance),0) AS v FROM bank_accounts`)
    const hpSum = await client.query(`SELECT COALESCE(SUM(balance),0) AS v FROM emi_schedules WHERE status <> 'paid'`)
    const capitalSum = await client.query(`SELECT COALESCE(SUM(balance),0) AS v FROM capital_accounts`)
    const banks = Number(bankSum.rows[0].v || 0)
    const hp = Number(hpSum.rows[0].v || 0)
    const capital = Number(capitalSum.rows[0].v || 0)
    const plug = banks + hp - capital

    const accountId = async (name) => {
      const r = await client.query(`SELECT id FROM acc_accounts WHERE name = $1 LIMIT 1`, [name])
      return r.rows[0].id
    }

    const je = await client.query(
      `INSERT INTO journal_entries (entry_date, narration, reference_type, reference_id, created_by)
       VALUES (CURRENT_DATE, 'Opening balances (Phase 3)', 'OPENING', 'OPENING-1', 'SYSTEM')
       RETURNING id`
    )
    const jeId = je.rows[0].id
    const lines = [
      [await accountId('CASH / BANK COLLECTIONS'), banks, 0],
      [await accountId('HP RECEIVABLES'), hp, 0],
      [await accountId('SHARE CAPITAL'), 0, capital],
    ]
    if (plug > 0) lines.push([await accountId('PROFIT OR LOSS'), 0, plug])
    else if (plug < 0) lines.push([await accountId('PROFIT OR LOSS'), Math.abs(plug), 0])

    for (const [aid, dr, cr] of lines) {
      if (dr === 0 && cr === 0) continue
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit, description)
         VALUES ($1,$2,$3,$4,'Opening')`,
        [jeId, aid, dr, cr]
      )
    }

    await client.query('COMMIT')
    console.log('Phase 3 chart of accounts + opening journal seeded')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('Phase 3 setup failed:', e.message)
  process.exit(1)
})
