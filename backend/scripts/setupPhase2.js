import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { pool } from '../src/db.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function seedIfEmpty(client, table, countSql, insertFn) {
  const { rows } = await client.query(countSql)
  if (Number(rows[0].n) > 0) {
    console.log(`  skip ${table} (already has data)`)
    return
  }
  await insertFn(client)
  console.log(`  seeded ${table}`)
}

async function main() {
  const client = await pool.connect()
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/phase2.sql'), 'utf8')
    await client.query(sql)
    console.log('Phase 2 schema applied')

    await client.query('BEGIN')

    await seedIfEmpty(client, 'handloan_accounts', 'SELECT COUNT(*)::int AS n FROM handloan_accounts', async (c) => {
      await c.query(`
        INSERT INTO handloan_accounts (loan_type, name, village, balance) VALUES
        ('1', 'M SRINIVASA RAO', 'TANUKU', 12500),
        ('1', 'K LAKSHMI', 'ELURU', 0),
        ('2', 'B ANJANEYULU', 'NIDADAVOLU', 6200)
      `)
    })

    await seedIfEmpty(client, 'bank_accounts', 'SELECT COUNT(*)::int AS n FROM bank_accounts', async (c) => {
      await c.query(`
        INSERT INTO bank_accounts (name, balance, account_kind) VALUES
        ('SBI - TADEPALLIGUDEM', 4118408, 'BANK'),
        ('GPay Collections', 32100, 'UPI'),
        ('PhonePe Collections', 18650, 'UPI')
      `)
    })

    await seedIfEmpty(client, 'capital_accounts', 'SELECT COUNT(*)::int AS n FROM capital_accounts', async (c) => {
      await c.query(`
        INSERT INTO capital_accounts (name, village, balance) VALUES
        ('CHANDU CHILUKURI', 'TADEPALLIGUDEM', 1500000),
        ('SRI ADITYA PARTNERS', 'TADEPALLIGUDEM', 850000)
      `)
    })

    await seedIfEmpty(client, 'deposit_accounts', 'SELECT COUNT(*)::int AS n FROM deposit_accounts', async (c) => {
      await c.query(`
        INSERT INTO deposit_accounts (deposit_type, name, village, balance) VALUES
        ('normal', 'G RAMA DEVI', 'CHEBROLU', 40000)
      `)
    })

    await seedIfEmpty(client, 'cheques', 'SELECT COUNT(*)::int AS n FROM cheques', async (c) => {
      await c.query(`
        INSERT INTO cheques (cheque_no, description, cheque_date, amount, status) VALUES
        ('004821', 'Vendor settlement', '2026-06-11', 22000, 'cleared'),
        ('004822', 'Repair advance', '2026-07-01', 4500, 'pending')
      `)
    })

    await seedIfEmpty(client, 'chit_accounts', 'SELECT COUNT(*)::int AS n FROM chit_accounts', async (c) => {
      await c.query(`INSERT INTO chit_accounts (name, balance) VALUES ('CHIT GROUP - A (20 Lakh)', 620000)`)
    })

    await seedIfEmpty(client, 'loan_accounts', 'SELECT COUNT(*)::int AS n FROM loan_accounts', async (c) => {
      await c.query(`INSERT INTO loan_accounts (name, village, mobile, balance) VALUES ('P VENKATESH', 'TANUKU', '9963321440', 0)`)
    })

    await seedIfEmpty(client, 'asset_accounts', 'SELECT COUNT(*)::int AS n FROM asset_accounts', async (c) => {
      await c.query(`
        INSERT INTO asset_accounts (name, village, balance) VALUES
        ('OFFICE BUILDING', 'TADEPALLIGUDEM', 3200000),
        ('TWO-WHEELER (OFFICE)', 'TADEPALLIGUDEM', 65000)
      `)
    })

    await seedIfEmpty(client, 'investment_accounts', 'SELECT COUNT(*)::int AS n FROM investment_accounts', async (c) => {
      await c.query(`INSERT INTO investment_accounts (name, village, balance) VALUES ('FIXED DEPOSIT - SBI', '-', 1200000)`)
    })

    await seedIfEmpty(client, 'ie_accounts', 'SELECT COUNT(*)::int AS n FROM ie_accounts', async (c) => {
      await c.query(`
        INSERT INTO ie_accounts (name, balance) VALUES
        ('PROFIT OR LOSS', 25054331),
        ('COMMISSIONS', 0),
        ('SALARIES', 0),
        ('RENTALS', 0)
      `)
    })

    await seedIfEmpty(client, 'ie_bills', 'SELECT COUNT(*)::int AS n FROM ie_bills', async (c) => {
      await c.query(`
        INSERT INTO ie_bills (amount, bill_type, paid_date, account, description) VALUES
        (15000, 'Expense', '2026-07-01', 'RENTALS', 'Office rent - July'),
        (500, 'Income', '2026-07-06', 'AGREEMENTS', 'New agreement fee')
      `)
    })

    // Update bike status from selling_price
    await client.query(`
      UPDATE bike_purchases
      SET status = CASE WHEN selling_price > 0 THEN 'sold' ELSE 'in_stock' END
      WHERE status IS NULL OR status = 'in_stock' OR status = 'sold'
    `)

    await client.query('COMMIT')
    console.log('Phase 2 setup complete')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Phase 2 setup failed:', err.message)
  process.exit(1)
})
