import { query } from '../db.js'
import { getSettingsData, calcOdInterest } from '../utils/settings.js'

const VIEWS = new Set(['all', 'hp', 'demand', 'ac', 'spl', 'zero', 'today'])

export async function getLineReport({
  view = 'all',
  type = '1',
  village = '',
  asOf,
} = {}) {
  const settings = await getSettingsData()
  const odRate = Number(settings.odInterest ?? 0.1)
  const date = asOf || new Date().toISOString().slice(0, 10)
  const mode = VIEWS.has(view) ? view : 'all'
  const villageFilter = String(village || '').trim()

  const params = [date]
  let villageSql = ''
  if (villageFilter) {
    params.push(villageFilter.toLowerCase())
    villageSql = `AND lower(COALESCE(c.village, '')) = $${params.length}`
  }

  const { rows } = await query(
    `SELECT
        c.id, c.hp_no, c.name, c.mobile, c.reg_no, c.village,
        c.emi_amount, c.emi_period, c.closed, c.seized, c.cb,
        COALESCE(SUM(e.paid_amount), 0) AS paid_amount,
        COALESCE(SUM(CASE WHEN e.status <> 'paid' THEN e.balance ELSE 0 END), 0) AS outstanding,
        MIN(e.due_date) FILTER (WHERE e.status <> 'paid') AS next_due,
        COUNT(*) FILTER (WHERE e.status <> 'paid' AND e.due_date <= $1::date) AS demand_count,
        COALESCE(SUM(e.balance) FILTER (WHERE e.status <> 'paid' AND e.due_date <= $1::date), 0) AS demand_amount,
        COUNT(*) FILTER (WHERE e.status <> 'paid' AND e.due_date < $1::date) AS overdue_count,
        COALESCE(SUM(e.balance) FILTER (WHERE e.status <> 'paid' AND e.due_date < $1::date), 0) AS overdue_principal,
        BOOL_OR(e.status <> 'paid' AND e.due_date = $1::date) AS due_today
     FROM customers c
     LEFT JOIN emi_schedules e ON e.customer_id = c.id
     WHERE 1=1 ${villageSql}
     GROUP BY c.id
     ORDER BY lower(COALESCE(c.village, '')), c.hp_no`,
    params
  )

  let items = rows.map((r) => {
    const outstanding = Number(r.outstanding || 0)
    const overduePrincipal = Number(r.overdue_principal || 0)
    const nextDue = r.next_due ? String(r.next_due).slice(0, 10) : ''
    const od = calcOdInterest(overduePrincipal, nextDue || date, odRate)
    const closed = r.closed === 'YES'
    const seized = r.seized === 'YES'
    return {
      id: r.id,
      hpNo: r.hp_no,
      name: r.name,
      mobile: r.mobile || '',
      regNo: r.reg_no || '',
      village: r.village || '',
      emiAmount: Number(r.emi_amount || 0),
      emiPeriod: r.emi_period,
      paidAmount: Number(r.paid_amount || 0),
      outstanding,
      demandAmount: Number(r.demand_amount || 0),
      demandCount: Number(r.demand_count || 0),
      overdueCount: Number(r.overdue_count || 0),
      overduePrincipal,
      daysOverdue: od.days,
      odInterest: od.interest,
      odTotal: Math.round((overduePrincipal + od.interest) * 100) / 100,
      nextDue,
      dueToday: Boolean(r.due_today),
      closed,
      seized,
      cb: Boolean(r.cb),
      status: closed ? 'closed' : seized ? 'seized' : outstanding <= 0 ? 'clear' : (od.days > 0 ? 'overdue' : 'running'),
    }
  })

  if (mode === 'ac') {
    // all customers, including closed
  } else if (mode === 'spl') {
    items = items.filter((r) => r.seized)
  } else if (mode === 'zero') {
    items = items.filter((r) => !r.closed && r.outstanding <= 0)
  } else if (mode === 'today') {
    items = items.filter((r) => !r.closed && r.dueToday)
  } else if (mode === 'demand') {
    items = items.filter((r) => !r.closed && r.demandAmount > 0)
  } else {
    items = items.filter((r) => !r.closed)
  }

  if (mode === 'hp') {
    items.sort((a, b) => String(a.hpNo).localeCompare(String(b.hpNo)))
  } else if (String(type) === '2') {
    items.sort((a, b) => String(a.village).localeCompare(String(b.village)) || String(a.name).localeCompare(String(b.name)))
  }

  const numbered = items.map((r, i) => ({ sno: i + 1, ...r }))
  const villages = [...new Set(rows.map((r) => r.village).filter(Boolean))].sort((a, b) => a.localeCompare(b))

  const outstanding = numbered.reduce((s, r) => s + r.outstanding, 0)
  const demand = numbered.reduce((s, r) => s + r.demandAmount, 0)
  const overdue = numbered.reduce((s, r) => s + r.overduePrincipal, 0)
  const odInterest = numbered.reduce((s, r) => s + r.odInterest, 0)

  return {
    title: titleFor(mode, type),
    view: mode,
    type: String(type) === '2' ? '2' : '1',
    asOf: date,
    village: villageFilter,
    villages,
    odRatePerDay: odRate,
    count: numbered.length,
    outstanding: round2(outstanding),
    demand: round2(demand),
    overduePrincipal: round2(overdue),
    odInterest: round2(odInterest),
    rows: numbered,
  }
}

function titleFor(view, type) {
  const t2 = String(type) === '2' ? ' Type 2' : ''
  const labels = {
    all: 'Line Report',
    hp: 'Line Report (HP)',
    demand: 'Line Report (Demand)',
    ac: 'Line Report (AC)',
    spl: 'Line Report (SPL)',
    zero: 'Line Report (Zero)',
    today: 'Line Report (Today)',
  }
  return (labels[view] || 'Line Report') + t2
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}
