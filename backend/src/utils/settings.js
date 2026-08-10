import { query } from '../db.js'

export async function getSettingsData(executor = { query }) {
  const { rows } = await executor.query(`SELECT data FROM settings WHERE id = 1`)
  return rows[0]?.data || {}
}

export function daysBetween(fromDate, toDate = new Date()) {
  const a = new Date(fromDate)
  const b = new Date(toDate)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)))
}

/** OD interest = outstanding * (odRate/100) * days_overdue (odRate is % per day, default 0.1) */
export function calcOdInterest(outstanding, dueDate, odRatePerDay) {
  const days = daysBetween(dueDate)
  if (days <= 0 || outstanding <= 0) return { days: 0, interest: 0 }
  const rate = Number(odRatePerDay)
  const safeRate = Number.isFinite(rate) ? rate : 0.1
  const interest = Math.round(outstanding * (safeRate / 100) * days * 100) / 100
  return { days, interest }
}

export function assertNotBackdated(settings, entryDate) {
  if (String(settings.dayScrollProtect || '').toUpperCase() !== 'YES') return
  const days = daysBetween(entryDate, new Date())
  // Protect against dates too far in the past (more than 3 days), and future > 0
  const today = new Date().toISOString().slice(0, 10)
  if (entryDate > today) {
    throw new Error('Future dated entries are not allowed (Day Scroll Protect).')
  }
  if (days > 3) {
    throw new Error('Back-dated entry beyond 3 days is blocked (Day Scroll Protect).')
  }
}

export function defaultEntryDate(settings, requested) {
  if (requested) return requested
  if (String(settings.autoDate || 'YES').toUpperCase() === 'YES') {
    return new Date().toISOString().slice(0, 10)
  }
  return requested || new Date().toISOString().slice(0, 10)
}
