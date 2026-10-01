import { query } from '../db.js'

let ready = false

/** Add entry_date so the day book can be opened for one date. Safe to call repeatedly. */
export async function ensureDayReportDate() {
  if (ready) return
  await query(`ALTER TABLE day_report_rows ADD COLUMN IF NOT EXISTS entry_date DATE`)
  await query(`CREATE INDEX IF NOT EXISTS idx_day_report_entry_date ON day_report_rows(entry_date)`)
  await query(`
    UPDATE day_report_rows
    SET entry_date = CURRENT_DATE
    WHERE entry_date IS NULL AND upper(name) <> 'OPENING BALANCE'
  `)
  ready = true
}
