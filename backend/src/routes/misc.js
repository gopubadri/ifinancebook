import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { mapBike, mapDayReport, mapAuthUser } from '../mappers.js'
import { requireRole } from '../middleware/auth.js'
import { refreshAllDerived, refreshDashboardStats } from '../services/refresh.js'
import { isPhase2Module, MODULE_MAP } from '../txConfig.js'
import { listResource, createResource } from './transactions.js'
import { parsePagination, pageResult } from '../utils/pagination.js'
import { runGlobalSearch } from '../services/search.js'

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

router.get('/users', async (_req, res) => {
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
  const { rows } = await query(`SELECT * FROM bike_purchases ORDER BY id`)
  res.json(rows.map(mapBike))
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
  res.json(await runGlobalSearch(q, limit))
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

router.get('/reports/pnl', async (_req, res) => {
  try {
    const { getPnlFromLedger } = await import('../services/ledger.js')
    return res.json(await getPnlFromLedger())
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

router.get('/reports/day-report', async (_req, res) => {
  // Prefer live day_report_rows (includes opening + receipts)
  const stored = await query(`SELECT * FROM day_report_rows ORDER BY sno`)
  if (stored.rowCount === 0) {
    // Fallback: build from receipts
    const receipts = await query(`
      SELECT r.receipt_no, r.paid_date, r.total, r.created_by, c.name, c.hp_no, c.reg_no
      FROM receipts r
      JOIN customers c ON c.id = r.customer_id
      ORDER BY r.id
    `)
    const rows = receipts.rows.map((r, i) => ({
      sno: i + 1,
      name: r.name,
      rcNo: String(r.receipt_no),
      hp: r.hp_no,
      desc: `EMI - ${r.reg_no || r.hp_no}`,
      createdBy: r.created_by || '',
      receiptAmt: Number(r.total),
    }))
    return res.json(rows)
  }
  res.json(stored.rows.map(mapDayReport))
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

router.put('/settings', async (req, res) => {
  const data = req.body || {}
  await query(
    `INSERT INTO settings (id, data) VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(data)]
  )
  res.json({ ok: true, ...data })
})

export default router
