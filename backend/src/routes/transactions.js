import { Router } from 'express'
import { query } from '../db.js'
import { MODULE_MAP } from '../txConfig.js'
import { refreshAllDerived } from '../services/refresh.js'
import { postIeBill } from '../services/ledger.js'

const router = Router()

function n(v, fallback = 0) {
  const x = Number(v)
  return Number.isFinite(x) ? x : fallback
}

function iso(d) {
  if (!d) return d
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

/* ---------- mappers ---------- */
const mapHandloan = (r) => ({
  id: r.id,
  name: r.name,
  village: r.village,
  balance: n(r.balance),
  interestRate: n(r.interest_rate),
  issuedDate: iso(r.issued_date),
  loanType: r.loan_type,
  customerId: r.customer_id,
})
const mapBank = (r) => ({ id: r.id, name: r.name, balance: n(r.balance), accountKind: r.account_kind })
const mapNamedBalance = (r) => ({ id: r.id, name: r.name, village: r.village || null, balance: n(r.balance), mobile: r.mobile || undefined })
const mapCheque = (r) => ({
  id: r.id,
  cheque: r.cheque_no,
  description: r.description,
  date: iso(r.cheque_date),
  amount: n(r.amount),
  status: r.status,
})
const mapIeBill = (r) => ({
  id: r.id,
  amount: n(r.amount),
  type: r.bill_type,
  paidDate: iso(r.paid_date),
  account: r.account,
  description: r.description,
})
const mapCustomerHl = (r) => ({
  id: r.id,
  customerId: r.customer_id,
  loanAmount: n(r.loan_amount),
  interestRate: n(r.interest_rate),
  issuedDate: iso(r.issued_date),
  balance: n(r.balance),
  status: r.status,
  notes: r.notes,
})

/* ---------- list / create by module key (matches Navbar) ---------- */
router.get('/modules/:key', async (req, res) => {
  const cfg = MODULE_MAP[req.params.key]
  if (!cfg) return res.status(404).json({ error: 'Not a Phase-2 transaction module' })

  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const q = String(req.query.q || '').trim()
  const paged = await listResource(cfg.resource, cfg.filter || {}, {
    paginate: true,
    page,
    limit,
    q,
  })
  res.json({
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
})

router.post('/modules/:key/rows', async (req, res) => {
  const cfg = MODULE_MAP[req.params.key]
  if (!cfg) return res.status(404).json({ error: 'Not a Phase-2 transaction module' })

  const created = await createResource(cfg.resource, req.body || {}, cfg.filter || {})
  await refreshAllDerived()
  res.status(201).json(created)
})

/* ---------- direct REST resources ---------- */
router.get('/handloans', async (req, res) => {
  res.json(await listResource('handloans', { loanType: req.query.loanType }))
})
router.post('/handloans', async (req, res) => {
  const row = await createResource('handloans', req.body || {}, { loanType: req.body?.loanType || '1' })
  await refreshAllDerived()
  res.status(201).json(row)
})
router.put('/handloans/:id', async (req, res) => {
  const row = await updateHandloan(req.params.id, req.body || {})
  if (!row) return res.status(404).json({ error: 'Not found' })
  await refreshAllDerived()
  res.json(row)
})

router.get('/banks', async (_req, res) => res.json(await listResource('banks')))
router.post('/banks', async (req, res) => {
  const row = await createResource('banks', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})
router.put('/banks/:id', async (req, res) => {
  const { rows } = await query(
    `UPDATE bank_accounts SET name = COALESCE($1, name), balance = COALESCE($2, balance),
      account_kind = COALESCE($3, account_kind) WHERE id = $4 RETURNING *`,
    [req.body?.name, req.body?.balance != null ? n(req.body.balance) : null, req.body?.accountKind || null, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  await refreshAllDerived()
  res.json(mapBank(rows[0]))
})

router.get('/capitals', async (_req, res) => res.json(await listResource('capitals')))
router.post('/capitals', async (req, res) => {
  const row = await createResource('capitals', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})

router.get('/deposits', async (req, res) => {
  res.json(await listResource('deposits', { depositType: req.query.depositType || 'normal' }))
})
router.post('/deposits', async (req, res) => {
  const row = await createResource('deposits', req.body || {}, { depositType: req.body?.depositType || 'normal' })
  await refreshAllDerived()
  res.status(201).json(row)
})

router.get('/cheques', async (_req, res) => res.json(await listResource('cheques')))
router.post('/cheques', async (req, res) => {
  const row = await createResource('cheques', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})
router.put('/cheques/:id', async (req, res) => {
  const b = req.body || {}
  const { rows } = await query(
    `UPDATE cheques SET
      cheque_no = COALESCE($1, cheque_no),
      description = COALESCE($2, description),
      cheque_date = COALESCE($3, cheque_date),
      amount = COALESCE($4, amount),
      status = COALESCE($5, status)
     WHERE id = $6 RETURNING *`,
    [
      b.cheque || b.chequeNo || null,
      b.description ?? null,
      b.date || null,
      b.amount != null ? n(b.amount) : null,
      b.status || null,
      req.params.id,
    ]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Not found' })
  res.json(mapCheque(rows[0]))
})

router.get('/chits', async (_req, res) => res.json(await listResource('chits')))
router.post('/chits', async (req, res) => {
  const row = await createResource('chits', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})

router.get('/loans', async (_req, res) => res.json(await listResource('loans')))
router.post('/loans', async (req, res) => {
  const row = await createResource('loans', req.body || {})
  res.status(201).json(row)
})

router.get('/assets', async (_req, res) => res.json(await listResource('assets')))
router.post('/assets', async (req, res) => {
  const row = await createResource('assets', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})

router.get('/investments', async (_req, res) => res.json(await listResource('investments')))
router.post('/investments', async (req, res) => {
  const row = await createResource('investments', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})

router.get('/credits', async (_req, res) => res.json(await listResource('credits')))
router.post('/credits', async (req, res) => {
  const row = await createResource('credits', req.body || {})
  res.status(201).json(row)
})

router.get('/ie-accounts', async (_req, res) => res.json(await listResource('ie-accounts')))
router.post('/ie-accounts', async (req, res) => {
  const row = await createResource('ie-accounts', req.body || {})
  res.status(201).json(row)
})

router.get('/ie-bills', async (_req, res) => res.json(await listResource('ie-bills')))
router.post('/ie-bills', async (req, res) => {
  const row = await createResource('ie-bills', req.body || {})
  await refreshAllDerived()
  res.status(201).json(row)
})

/* ---------- helpers ---------- */
async function listResource(resource, filter = {}, options = null) {
  const paginate = options && options.paginate
  const page = paginate ? Math.max(1, Number(options.page) || 1) : 1
  const limit = paginate ? Math.min(100, Math.max(1, Number(options.limit) || 20)) : null
  const offset = paginate ? (page - 1) * limit : 0
  const q = String(options?.q || '').trim().toLowerCase()
  const like = `%${q}%`

  async function run({ countSql, dataSql, params = [], map }) {
    if (!paginate) {
      const { rows } = await query(dataSql, params)
      return rows.map(map)
    }
    const countRes = await query(countSql, params)
    const total = Number(countRes.rows[0].count || 0)
    const { rows } = await query(
      `${dataSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1)
    return {
      items: rows.map(map),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }

  switch (resource) {
    case 'handloans': {
      const type = filter.loanType || '1'
      const params = q ? [String(type), like] : [String(type)]
      const filterSql = q
        ? `AND (lower(name) LIKE $2 OR lower(COALESCE(village,'')) LIKE $2)`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM handloan_accounts WHERE loan_type = $1 ${filterSql}`,
        dataSql: `SELECT * FROM handloan_accounts WHERE loan_type = $1 ${filterSql} ORDER BY id`,
        params,
        map: mapHandloan,
      })
    }
    case 'banks': {
      const params = q ? [like] : []
      const filterSql = q ? `WHERE lower(name) LIKE $1` : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM bank_accounts ${filterSql}`,
        dataSql: `SELECT * FROM bank_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapBank,
      })
    }
    case 'capitals': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(name) LIKE $1 OR lower(COALESCE(village,'')) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM capital_accounts ${filterSql}`,
        dataSql: `SELECT * FROM capital_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'deposits': {
      const type = filter.depositType || 'normal'
      const params = q ? [type, like] : [type]
      const filterSql = q
        ? `AND (lower(name) LIKE $2 OR lower(COALESCE(village,'')) LIKE $2)`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM deposit_accounts WHERE deposit_type = $1 ${filterSql}`,
        dataSql: `SELECT * FROM deposit_accounts WHERE deposit_type = $1 ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'cheques': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(cheque_no) LIKE $1 OR lower(COALESCE(description,'')) LIKE $1 OR lower(status) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM cheques ${filterSql}`,
        dataSql: `SELECT * FROM cheques ${filterSql} ORDER BY id`,
        params,
        map: mapCheque,
      })
    }
    case 'chits': {
      const params = q ? [like] : []
      const filterSql = q ? `WHERE lower(name) LIKE $1` : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM chit_accounts ${filterSql}`,
        dataSql: `SELECT * FROM chit_accounts ${filterSql} ORDER BY id`,
        params,
        map: (r) => ({ id: r.id, name: r.name, balance: n(r.balance) }),
      })
    }
    case 'loans': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(name) LIKE $1 OR lower(COALESCE(village,'')) LIKE $1 OR COALESCE(mobile,'') LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM loan_accounts ${filterSql}`,
        dataSql: `SELECT * FROM loan_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'assets': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(name) LIKE $1 OR lower(COALESCE(village,'')) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM asset_accounts ${filterSql}`,
        dataSql: `SELECT * FROM asset_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'investments': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(name) LIKE $1 OR lower(COALESCE(village,'')) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM investment_accounts ${filterSql}`,
        dataSql: `SELECT * FROM investment_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'credits': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(name) LIKE $1 OR lower(COALESCE(village,'')) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM credit_accounts ${filterSql}`,
        dataSql: `SELECT * FROM credit_accounts ${filterSql} ORDER BY id`,
        params,
        map: mapNamedBalance,
      })
    }
    case 'ie-accounts': {
      const params = q ? [like] : []
      const filterSql = q ? `WHERE lower(name) LIKE $1` : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM ie_accounts ${filterSql}`,
        dataSql: `SELECT * FROM ie_accounts ${filterSql} ORDER BY id`,
        params,
        map: (r) => ({ id: r.id, name: r.name, balance: n(r.balance) }),
      })
    }
    case 'ie-bills': {
      const params = q ? [like] : []
      const filterSql = q
        ? `WHERE lower(COALESCE(account,'')) LIKE $1
            OR lower(COALESCE(description,'')) LIKE $1
            OR lower(bill_type) LIKE $1`
        : ''
      return run({
        countSql: `SELECT COUNT(*)::int AS count FROM ie_bills ${filterSql}`,
        dataSql: `SELECT * FROM ie_bills ${filterSql} ORDER BY id DESC`,
        params,
        map: mapIeBill,
      })
    }
    default:
      return paginate
        ? { items: [], total: 0, page, limit, totalPages: 1, hasNext: false, hasPrev: false }
        : []
  }
}

async function createResource(resource, body, filter = {}) {
  switch (resource) {
    case 'handloans': {
      const loanType = String(body.loanType || filter.loanType || '1')
      const { rows } = await query(
        `INSERT INTO handloan_accounts (loan_type, name, village, balance, interest_rate, issued_date, customer_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          loanType,
          String(body.name || '').trim(),
          String(body.village || '').trim() || null,
          n(body.balance),
          n(body.interestRate),
          body.issuedDate || body.date || new Date().toISOString().slice(0, 10),
          body.customerId || null,
          body.notes || null,
        ]
      )
      return mapHandloan(rows[0])
    }
    case 'banks': {
      const { rows } = await query(
        `INSERT INTO bank_accounts (name, balance, account_kind) VALUES ($1,$2,$3) RETURNING *`,
        [String(body.name || '').trim(), n(body.balance), body.accountKind || 'BANK']
      )
      return mapBank(rows[0])
    }
    case 'capitals': {
      const { rows } = await query(
        `INSERT INTO capital_accounts (name, village, balance) VALUES ($1,$2,$3) RETURNING *`,
        [String(body.name || '').trim(), String(body.village || '').trim() || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'deposits': {
      const depositType = body.depositType || filter.depositType || 'normal'
      const { rows } = await query(
        `INSERT INTO deposit_accounts (deposit_type, name, village, balance) VALUES ($1,$2,$3,$4) RETURNING *`,
        [depositType, String(body.name || '').trim(), String(body.village || '').trim() || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'cheques': {
      const { rows } = await query(
        `INSERT INTO cheques (cheque_no, description, cheque_date, amount, status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [
          String(body.cheque || body.chequeNo || '').trim(),
          body.description || null,
          body.date || new Date().toISOString().slice(0, 10),
          n(body.amount),
          body.status || 'pending',
        ]
      )
      return mapCheque(rows[0])
    }
    case 'chits': {
      const { rows } = await query(
        `INSERT INTO chit_accounts (name, balance) VALUES ($1,$2) RETURNING *`,
        [String(body.name || '').trim(), n(body.balance)]
      )
      return { id: rows[0].id, name: rows[0].name, balance: n(rows[0].balance) }
    }
    case 'loans': {
      const { rows } = await query(
        `INSERT INTO loan_accounts (name, village, mobile, balance) VALUES ($1,$2,$3,$4) RETURNING *`,
        [String(body.name || '').trim(), body.village || null, body.mobile || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'assets': {
      const { rows } = await query(
        `INSERT INTO asset_accounts (name, village, balance) VALUES ($1,$2,$3) RETURNING *`,
        [String(body.name || '').trim(), body.village || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'investments': {
      const { rows } = await query(
        `INSERT INTO investment_accounts (name, village, balance) VALUES ($1,$2,$3) RETURNING *`,
        [String(body.name || '').trim(), body.village || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'credits': {
      const { rows } = await query(
        `INSERT INTO credit_accounts (name, village, balance) VALUES ($1,$2,$3) RETURNING *`,
        [String(body.name || '').trim(), body.village || null, n(body.balance)]
      )
      return mapNamedBalance(rows[0])
    }
    case 'ie-accounts': {
      const { rows } = await query(
        `INSERT INTO ie_accounts (name, balance) VALUES ($1,$2) RETURNING *`,
        [String(body.name || '').trim(), n(body.balance)]
      )
      return { id: rows[0].id, name: rows[0].name, balance: n(rows[0].balance) }
    }
    case 'ie-bills': {
      const billType = body.type === 'Income' ? 'Income' : 'Expense'
      const { rows } = await query(
        `INSERT INTO ie_bills (amount, bill_type, paid_date, account, description) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [n(body.amount), billType, body.paidDate || body.date || new Date().toISOString().slice(0, 10), body.account || null, body.description || null]
      )
      const mapped = mapIeBill(rows[0])
      try {
        await postIeBill({
          id: rows[0].id,
          amount: mapped.amount,
          billType: mapped.type,
          paidDate: mapped.paidDate,
          account: mapped.account,
          description: mapped.description,
        })
      } catch (err) {
        console.warn('IE ledger post skipped:', err.message)
      }
      return mapped
    }
    default:
      throw new Error(`Unknown resource ${resource}`)
  }
}

async function updateHandloan(id, body) {
  const { rows } = await query(
    `UPDATE handloan_accounts SET
      name = COALESCE($1, name),
      village = COALESCE($2, village),
      balance = COALESCE($3, balance),
      interest_rate = COALESCE($4, interest_rate)
     WHERE id = $5 RETURNING *`,
    [
      body.name || null,
      body.village ?? null,
      body.balance != null ? n(body.balance) : null,
      body.interestRate != null ? n(body.interestRate) : null,
      id,
    ]
  )
  return rows[0] ? mapHandloan(rows[0]) : null
}

export { mapCustomerHl, listResource, createResource }
export default router
