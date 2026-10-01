import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { mapBike, mapDayReport, mapAuthUser } from '../mappers.js'
import { requireRole } from '../middleware/auth.js'
import { refreshAllDerived, refreshDashboardStats } from '../services/refresh.js'
import { isPhase2Module, MODULE_MAP } from '../config/txConfig.js'
import { listResource, createResource, updateResource, deleteResource } from './transactions.js'
import { ensureOfficeSchema, writeAudit } from '../utils/office.js'
import { parsePagination, pageResult } from '../utils/pagination.js'
import { runGlobalSearch } from '../services/search.js'
import { getSettingsData } from '../utils/settings.js'
import { ensureDayReportDate } from '../utils/dayReport.js'

const router = Router()
const ALLOWED_ROLES = new Set(['ADMIN', 'CLERK', 'LINE EXECUTIVE'])
const SYSTEM_USERNAMES = ['admin', 'clerk', 'line']

router.get('/dashboard', async (_req, res) => {
  await refreshDashboardStats()
  const { rows } = await query(`SELECT * FROM dashboard_stats WHERE id = 1`)
  const s = rows[0] || {}
  res.json({
    income: Number(s.income || 0),
    expenses: Number(s.expenses || 0),
    emiCollection: Number(s.emi_collection || 0),
    hlCollection: Number(s.hl_collection || 0),
    odCollection: Number(s.od_collection || 0),
    closedHp: Number(s.closed_hp || 0),
  })
})

router.get('/users', requireRole('ADMIN'), async (_req, res) => {
  const { rows } = await query(
    `SELECT id, username, name, role, created_at
     FROM auth_users
     WHERE username NOT IN ('admin', 'clerk', 'line')
     ORDER BY created_at DESC, id DESC`
  )
  res.json(rows.map(mapAuthUser))
})

router.post('/users', requireRole('ADMIN'), async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const name = String(bodyName(req))
  const roleRaw = String(req.body?.role || 'CLERK').trim().toUpperCase()
  const role = ALLOWED_ROLES.has(roleRaw) ? roleRaw : 'CLERK'

  if (SYSTEM_USERNAMES.includes(username)) {
    return res.status(400).json({ error: 'That username is reserved.' })
  }
  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' })
  }
  if (!/^[a-z0-9._-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only use letters, numbers, . _ -' })
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }
  if (!name) {
    return res.status(400).json({ error: 'Display name is required.' })
  }

  const existing = await query(`SELECT id FROM auth_users WHERE username = $1`, [username])
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'That username is already taken.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const { rows } = await query(
    `INSERT INTO auth_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, name, role, created_at`,
    [username, passwordHash, name, role]
  )
  res.status(201).json(mapAuthUser(rows[0]))
})

function bodyName(req) {
  return String(req.body?.name || '').trim().toUpperCase()
}

router.get('/consultancy', async (_req, res) => {
  const settings = await getSettingsData()
  const rate = Number(settings.consultancyInterest || 0)
  const { rows } = await query(`SELECT * FROM bike_purchases ORDER BY id`)
  const today = new Date()
  res.json(rows.map((row) => {
    const bike = mapBike(row)
    let carryingInterest = 0
    if (!(Number(row.selling_price) > 0) && row.purchase_date && rate) {
      const bought = row.purchase_date instanceof Date ? row.purchase_date : new Date(row.purchase_date)
      const days = Math.max(0, Math.floor((today - bought) / 86400000))
      carryingInterest = Math.round(Number(row.purchase_amount || 0) * (rate / 100) * (days / 365) * 100) / 100
    }
    return { ...bike, carryingInterest, interestRate: rate }
  }))
})

router.post('/consultancy', async (req, res) => {
  const body = req.body || {}
  const rcNo = String(body.rcNo || '').trim()
  if (!rcNo) return res.status(400).json({ error: 'RC No is required.' })

  const idRes = await query(`SELECT COALESCE(MAX(id), 200) + 1 AS id FROM bike_purchases`)
  const id = Number(idRes.rows[0].id)
  const purchaseAmount = Number(body.purchaseAmount || 0)
  const repairCost = Number(body.repairCost || 0)
  const sellingPrice = Number(body.sellingPrice || 0)
  const status = sellingPrice > 0 ? 'sold' : 'in_stock'

  const { rows } = await query(
    `INSERT INTO bike_purchases (
      id, rc_no, makers, model, purchase_date, purchase_amount, repair_cost, selling_price, status, sold_date, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      id,
      rcNo,
      String(body.makers || '').trim() || null,
      String(body.model || '').trim() || null,
      body.purchaseDate || new Date().toISOString().slice(0, 10),
      purchaseAmount,
      repairCost,
      sellingPrice,
      status,
      sellingPrice > 0 ? (body.soldDate || new Date().toISOString().slice(0, 10)) : null,
      body.notes || null,
    ]
  )

  await query(
    `INSERT INTO asset_accounts (name, village, balance) VALUES ($1,$2,$3)`,
    [
      `${body.makers || 'BIKE'} ${rcNo}`,
      'CONSULTANCY STOCK',
      purchaseAmount + repairCost,
    ]
  )

  await refreshAllDerived()
  res.status(201).json(mapBike(rows[0]))
})

router.put('/consultancy/:id', async (req, res) => {
  const id = Number(req.params.id)
  const body = req.body || {}
  const existing = await query(`SELECT * FROM bike_purchases WHERE id = $1`, [id])
  if (!existing.rows[0]) return res.status(404).json({ error: 'Bike not found' })

  const sellingPrice = body.sellingPrice != null ? Number(body.sellingPrice) : Number(existing.rows[0].selling_price)
  const status = sellingPrice > 0 ? 'sold' : (body.status || existing.rows[0].status || 'in_stock')

  const { rows } = await query(
    `UPDATE bike_purchases SET
      makers = COALESCE($1, makers),
      model = COALESCE($2, model),
      repair_cost = COALESCE($3, repair_cost),
      selling_price = COALESCE($4, selling_price),
      status = $5,
      sold_date = CASE WHEN $5 = 'sold' THEN COALESCE($6, CURRENT_DATE) ELSE NULL END,
      notes = COALESCE($7, notes)
     WHERE id = $8
     RETURNING *`,
    [
      body.makers || null,
      body.model || null,
      body.repairCost != null ? Number(body.repairCost) : null,
      body.sellingPrice != null ? Number(body.sellingPrice) : null,
      status,
      body.soldDate || null,
      body.notes ?? null,
      id,
    ]
  )

  await refreshAllDerived()
  res.json(mapBike(rows[0]))
})

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 6))
  res.json(await runGlobalSearch(q, limit, req.user?.role))
})

router.get('/modules/:key', async (req, res) => {
  const key = req.params.key
  const { page, limit } = parsePagination(req.query)
  const q = String(req.query.q || '').trim()

  if (isPhase2Module(key)) {
    const cfg = MODULE_MAP[key]
    const paged = await listResource(cfg.resource, cfg.filter || {}, {
      paginate: true,
      page,
      limit,
      q,
    })
    return res.json({
      title: cfg.title,
      columns: cfg.columns,
      rows: paged.items,
      total: paged.total,
      page: paged.page,
      limit: paged.limit,
      totalPages: paged.totalPages,
      hasNext: paged.hasNext,
      hasPrev: paged.hasPrev,
      phase2: true,
      q,
    })
  }

  let mod = await query(`SELECT * FROM generic_modules WHERE module_key = $1`, [key])
  if (!mod.rows[0]) {
    const title = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    await query(
      `INSERT INTO generic_modules (module_key, title, columns)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (module_key) DO NOTHING`,
      [key, title, JSON.stringify(['name', 'village', 'balance'])]
    )
    mod = await query(`SELECT * FROM generic_modules WHERE module_key = $1`, [key])
  }

  const like = `%${q.toLowerCase()}%`
  const filterSql = q ? `AND row_data::text ILIKE $2` : ''
  const countParams = q ? [key, like] : [key]
  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM generic_module_rows WHERE module_key = $1 ${filterSql}`,
    countParams
  )
  const total = countRes.rows[0].count
  const offset = (page - 1) * limit
  const dataParams = q ? [key, like, limit, offset] : [key, limit, offset]
  const rows = await query(
    q
      ? `SELECT id, row_data FROM generic_module_rows
         WHERE module_key = $1 AND row_data::text ILIKE $2
         ORDER BY id LIMIT $3 OFFSET $4`
      : `SELECT id, row_data FROM generic_module_rows
         WHERE module_key = $1
         ORDER BY id LIMIT $2 OFFSET $3`,
    dataParams
  )

  const result = pageResult(
    rows.rows.map((r) => ({ id: r.id, ...r.row_data })),
    total,
    page,
    limit
  )
  res.json({
    title: mod.rows[0].title,
    columns: mod.rows[0].columns,
    rows: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    hasNext: result.hasNext,
    hasPrev: result.hasPrev,
    phase2: false,
    q,
  })
})

router.post('/modules/:key/rows', async (req, res) => {
  const key = req.params.key
  if (isPhase2Module(key)) {
    const cfg = MODULE_MAP[key]
    const created = await createResource(cfg.resource, req.body || {}, cfg.filter || {})
    await refreshAllDerived()
    return res.status(201).json(created)
  }

  let mod = await query(`SELECT * FROM generic_modules WHERE module_key = $1`, [key])
  if (!mod.rows[0]) {
    const title = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    await query(
      `INSERT INTO generic_modules (module_key, title, columns)
       VALUES ($1, $2, $3::jsonb)`,
      [key, title, JSON.stringify(Object.keys(req.body || { name: '' }))]
    )
    mod = await query(`SELECT * FROM generic_modules WHERE module_key = $1`, [key])
  }

  const rowData = { ...(req.body || {}) }
  delete rowData.id
  for (const col of ['balance', 'amount']) {
    if (rowData[col] != null && rowData[col] !== '') rowData[col] = Number(rowData[col])
  }

  const { rows } = await query(
    `INSERT INTO generic_module_rows (module_key, row_data) VALUES ($1, $2::jsonb)
     RETURNING id, row_data`,
    [key, JSON.stringify(rowData)]
  )

  await refreshAllDerived()
  res.status(201).json({ id: rows[0].id, ...rows[0].row_data })
})

router.put('/modules/:key/rows/:id', async (req, res) => {
  const key = req.params.key
  if (isPhase2Module(key)) {
    try {
      const cfg = MODULE_MAP[key]
      const updated = await updateResource(cfg.resource, req.params.id, { ...(req.body || {}), actor: req.user?.name })
      if (!updated) return res.status(404).json({ error: 'Not found' })
      await refreshAllDerived()
      return res.json(updated)
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message })
    }
  }
  const rowData = { ...(req.body || {}) }
  delete rowData.id
  const { rows } = await query(
    `UPDATE generic_module_rows SET row_data = $1::jsonb
     WHERE id = $2 AND module_key = $3
     RETURNING id, row_data`,
    [JSON.stringify(rowData), req.params.id, key]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json({ id: rows[0].id, ...rows[0].row_data })
})

router.delete('/modules/:key/rows/:id', async (req, res) => {
  const key = req.params.key
  if (isPhase2Module(key)) {
    const cfg = MODULE_MAP[key]
    const ok = await deleteResource(cfg.resource, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    await refreshAllDerived()
    return res.status(204).end()
  }
  const result = await query(
    `DELETE FROM generic_module_rows WHERE id = $1 AND module_key = $2`,
    [req.params.id, key]
  )
  if (!result.rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

router.get('/reports/line', async (req, res) => {
  const { getLineReport } = await import('../services/lineReport.js')
  res.json(await getLineReport({
    view: req.query.view,
    type: req.query.type,
    village: req.query.village,
    asOf: req.query.asOf,
  }))
})

router.get('/reports/special/:key', async (req, res) => {
  const { getSpecialReport } = await import('../services/specialReports.js')
  const data = await getSpecialReport(req.params.key, req.query)
  if (!data) return res.status(404).json({ error: 'Unknown report' })
  res.json(data)
})

router.get('/reports/menu', async (_req, res) => {
  const { rows } = await query(`SELECT category, label FROM report_menu ORDER BY id`)
  const menu = { finance: [], financeType2: [], accounts: [] }
  for (const row of rows) {
    if (!menu[row.category]) menu[row.category] = []
    menu[row.category].push(row.label)
  }
  res.json(menu)
})

router.get('/reports/balance-sheet', async (_req, res) => {
  try {
    const { getBalanceSheetFromLedger } = await import('../services/ledger.js')
    return res.json(await getBalanceSheetFromLedger())
  } catch (err) {
    // Fallback to seeded ledger_lines if Phase 3 not initialized
    const { rows } = await query(
      `SELECT side, label, amount FROM ledger_lines
       WHERE statement = 'balance_sheet' ORDER BY sort_order, id`
    )
    res.json({
      liabilities: rows.filter((r) => r.side === 'liabilities').map((r) => [r.label, Number(r.amount)]),
      assets: rows.filter((r) => r.side === 'assets').map((r) => [r.label, Number(r.amount)]),
    })
  }
})

router.get('/reports/pnl', async (req, res) => {
  try {
    const { getPnlFromLedger } = await import('../services/ledger.js')
    return res.json(await getPnlFromLedger({
      from: req.query.from || null,
      to: req.query.to || null,
      preset: req.query.preset || null,
    }))
  } catch {
    const { rows } = await query(
      `SELECT side, label, amount FROM ledger_lines
       WHERE statement = 'pnl' ORDER BY sort_order, id`
    )
    res.json({
      income: rows.filter((r) => r.side === 'income').map((r) => [r.label, Number(r.amount)]),
      expenses: rows.filter((r) => r.side === 'expenses').map((r) => [r.label, Number(r.amount)]),
    })
  }
})

router.get('/reports/day-report', async (req, res) => {
  await ensureDayReportDate()
  const date = String(req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must be YYYY-MM-DD.' })
  }

  const settings = await getSettingsData()
  const openingBase = await query(
    `SELECT COALESCE(SUM(receipt_amt), 0) AS amt
     FROM day_report_rows WHERE upper(name) = 'OPENING BALANCE'`
  )
  const prior = await query(
    `SELECT COALESCE(SUM(receipt_amt), 0) AS amt
     FROM day_report_rows
     WHERE entry_date IS NOT NULL AND entry_date < $1`,
    [date]
  )
  const day = await query(
    `SELECT * FROM day_report_rows
     WHERE entry_date = $1
     ORDER BY sno, id`,
    [date]
  )

  const opening = Math.round((Number(openingBase.rows[0].amt) + Number(prior.rows[0].amt)) * 100) / 100
  const lines = day.rows.map(mapDayReport)
  const rows = [
    {
      sno: 1,
      name: 'OPENING BALANCE',
      rcNo: '----',
      hp: '----',
      desc: '----',
      createdBy: '',
      receiptAmt: opening,
    },
    ...lines.map((row, i) => ({ ...row, sno: i + 2 })),
  ]
  const collected = Math.round(lines.reduce((s, r) => s + Number(r.receiptAmt || 0), 0) * 100) / 100

  res.json({
    date,
    city: settings.city || 'TADEPALLIGUDEM',
    opening,
    collected,
    closing: Math.round((opening + collected) * 100) / 100,
    count: lines.length,
    rows,
  })
})

router.get('/reports/closed-hp', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, hp_no, name, mobile, reg_no, village, emi_amount, emi_period,
            closed, closed_date, created_by
     FROM customers WHERE closed = 'YES'
     ORDER BY COALESCE(closed_date, clr_date) DESC NULLS LAST, id DESC`
  )
  res.json({
    title: 'Closed HP Report',
    count: rows.length,
    rows: rows.map((r, i) => ({
      sno: i + 1,
      id: r.id,
      hpNo: r.hp_no,
      name: r.name,
      mobile: r.mobile || '',
      regNo: r.reg_no || '',
      village: r.village || '',
      emiAmount: Number(r.emi_amount || 0),
      emiPeriod: r.emi_period,
      closedDate: r.closed_date ? String(r.closed_date).slice(0, 10) : '',
      createdBy: r.created_by || '',
    })),
  })
})

router.get('/reports/seized-hp', async (_req, res) => {
  const { rows } = await query(
    `SELECT id, hp_no, name, mobile, reg_no, village, emi_amount, emi_period,
            seized, seized_date, closed, created_by
     FROM customers WHERE seized = 'YES'
     ORDER BY COALESCE(seized_date, clr_date) DESC NULLS LAST, id DESC`
  )
  res.json({
    title: 'Seized HP Report',
    count: rows.length,
    rows: rows.map((r, i) => ({
      sno: i + 1,
      id: r.id,
      hpNo: r.hp_no,
      name: r.name,
      mobile: r.mobile || '',
      regNo: r.reg_no || '',
      village: r.village || '',
      emiAmount: Number(r.emi_amount || 0),
      emiPeriod: r.emi_period,
      seizedDate: r.seized_date ? String(r.seized_date).slice(0, 10) : '',
      closed: r.closed,
      createdBy: r.created_by || '',
    })),
  })
})

router.get('/reports/od', async (_req, res) => {
  const { getSettingsData, calcOdInterest } = await import('../utils/settings.js')
  const settings = await getSettingsData()
  const odRate = Number(settings.odInterest ?? 0.1)
  const today = new Date().toISOString().slice(0, 10)

  const { rows } = await query(
    `SELECT c.id, c.hp_no, c.name, c.mobile, c.reg_no, c.village,
            e.sno, e.due_date, e.balance, e.status
     FROM emi_schedules e
     JOIN customers c ON c.id = e.customer_id
     WHERE e.status <> 'paid'
       AND e.due_date < $1::date
       AND c.closed = 'NO'
     ORDER BY e.due_date, c.hp_no, e.sno`,
    [today]
  )

  const items = rows.map((r, i) => {
    const balance = Number(r.balance || 0)
    const dueDate = r.due_date ? String(r.due_date).slice(0, 10) : ''
    const od = calcOdInterest(balance, dueDate, odRate)
    return {
      sno: i + 1,
      customerId: r.id,
      hpNo: r.hp_no,
      name: r.name,
      mobile: r.mobile || '',
      regNo: r.reg_no || '',
      village: r.village || '',
      emiSno: r.sno,
      dueDate,
      balance,
      daysOverdue: od.days,
      odInterest: od.interest,
      odTotal: Math.round((balance + od.interest) * 100) / 100,
    }
  })

  const overduePrincipal = items.reduce((s, r) => s + r.balance, 0)
  const odInterestTotal = items.reduce((s, r) => s + r.odInterest, 0)

  res.json({
    title: 'OD Report',
    asOf: today,
    odRatePerDay: odRate,
    count: items.length,
    overduePrincipal: Math.round(overduePrincipal * 100) / 100,
    odInterestTotal: Math.round(odInterestTotal * 100) / 100,
    grandTotal: Math.round((overduePrincipal + odInterestTotal) * 100) / 100,
    rows: items,
  })
})

router.get('/reports/collection', async (req, res) => {
  await ensureOfficeSchema()
  const from = req.query.from || null
  const to = req.query.to || null
  const params = []
  let where = 'r.voided_at IS NULL'
  if (from) {
    params.push(from)
    where += ` AND r.paid_date >= $${params.length}::date`
  }
  if (to) {
    params.push(to)
    where += ` AND r.paid_date <= $${params.length}::date`
  }

  const { rows } = await query(
    `SELECT r.receipt_no, r.paid_date, r.total, r.created_by,
            c.id AS customer_id, c.name, c.hp_no, c.reg_no, c.village
     FROM receipts r
     JOIN customers c ON c.id = r.customer_id
     WHERE ${where}
     ORDER BY r.paid_date DESC, r.id DESC`,
    params
  )

  const items = rows.map((r, i) => ({
    sno: i + 1,
    customerId: r.customer_id,
    receiptNo: String(r.receipt_no),
    paidDate: r.paid_date ? String(r.paid_date).slice(0, 10) : '',
    name: r.name,
    hpNo: r.hp_no,
    regNo: r.reg_no || '',
    village: r.village || '',
    amount: Number(r.total || 0),
    createdBy: r.created_by || '',
  }))

  res.json({
    title: 'Collection Report',
    from,
    to,
    count: items.length,
    totalCollected: Math.round(items.reduce((s, r) => s + r.amount, 0) * 100) / 100,
    rows: items,
  })
})

router.get('/charts', async (_req, res) => {
  await refreshAllDerived()
  const [hps, financed, collection] = await Promise.all([
    query(`SELECT name, value FROM chart_hps ORDER BY id`),
    query(`SELECT month, amount FROM chart_financed ORDER BY id`),
    query(`SELECT month, collected FROM chart_collection ORDER BY id`),
  ])
  res.json({
    hps: hps.rows.map((r) => ({ name: r.name, value: Number(r.value) })),
    financedAmount: financed.rows.length
      ? financed.rows.map((r) => ({ month: r.month, amount: Number(r.amount) }))
      : [{ month: 'N/A', amount: 0 }],
    collection: collection.rows.length
      ? collection.rows.map((r) => ({ month: r.month, collected: Number(r.collected) }))
      : [{ month: 'N/A', collected: 0 }],
  })
})

router.get('/settings', async (_req, res) => {
  const { rows } = await query(`SELECT data FROM settings WHERE id = 1`)
  res.json(rows[0]?.data || {})
})

router.put('/settings', requireRole('ADMIN'), async (req, res) => {
  const data = req.body || {}
  await query(
    `INSERT INTO settings (id, data) VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(data)]
  )
  await writeAudit({
    actor: req.user?.name,
    action: 'settings_save',
    entity: 'settings',
    entityId: 1,
    detail: { emiFrequency: data.emiFrequency, odInterest: data.odInterest },
  })
  res.json({ ok: true, ...data })
})

router.get('/staff', async (_req, res) => {
  const { rows } = await query(`SELECT id, name, mobile, type, joined_on FROM staff_users ORDER BY id`)
  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    mobile: r.mobile || '',
    type: r.type,
    joinedOn: r.joined_on ? String(r.joined_on).slice(0, 10) : '',
  })))
})

router.get('/audit', requireRole('ADMIN'), async (_req, res) => {
  await ensureOfficeSchema()
  const { rows } = await query(
    `SELECT * FROM audit_events ORDER BY id DESC LIMIT 200`
  )
  res.json(rows.map((r) => ({
    id: r.id,
    at: r.created_at,
    actor: r.actor || '',
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id || '',
    detail: r.detail || {},
  })))
})

router.post('/users/:id/password', requireRole('ADMIN'), async (req, res) => {
  const password = String(req.body?.password || '')
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  const passwordHash = await bcrypt.hash(password, 10)
  const { rows } = await query(
    `UPDATE auth_users SET password_hash = $1 WHERE id = $2 RETURNING id, username, name`,
    [passwordHash, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'User not found' })
  await writeAudit({
    actor: req.user?.name,
    action: 'password_reset',
    entity: 'user',
    entityId: rows[0].id,
    detail: { username: rows[0].username },
  })
  res.json({ ok: true, id: rows[0].id, username: rows[0].username })
})

export default router
