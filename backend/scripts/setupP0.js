import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { pool } from '../src/db.js'

dotenv.config()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/p0_polish.sql'), 'utf8')
  await pool.query(sql)

  // Backfill address from settings company profile where customer fields empty
  const settings = await pool.query(`SELECT data FROM settings WHERE id = 1`)
  const s = settings.rows[0]?.data || {}
  await pool.query(
    `UPDATE customers SET
       city = COALESCE(NULLIF(city, ''), $1),
       state = COALESCE(NULLIF(state, ''), $2),
       street = COALESCE(NULLIF(street, ''), $3)
     WHERE city IS NULL OR state IS NULL OR street IS NULL`,
    [s.city || null, s.state || null, s.street || null]
  )

  // Set closed_date for already closed customers
  await pool.query(
    `UPDATE customers SET closed_date = COALESCE(closed_date, CURRENT_DATE)
     WHERE closed = 'YES' AND closed_date IS NULL`
  )
  await pool.query(
    `UPDATE customers SET seized_date = COALESCE(seized_date, CURRENT_DATE)
     WHERE seized = 'YES' AND seized_date IS NULL`
  )

  console.log('P0 polish schema applied')
  await pool.end()
}

main().catch((err) => {
  console.error('P0 setup failed:', err.message)
  process.exit(1)
})
