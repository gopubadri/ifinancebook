import { Router } from 'express'
import { query } from '../db.js'
import {
  postJournal,
  getAccountBalances,
  getTrialBalance,
  getBalanceSheetFromLedger,
  getPnlFromLedger,
  getAccountLedger,
} from '../services/ledger.js'
import { requireRole } from '../middleware/auth.js'
import { parsePagination, pageResult } from '../utils/pagination.js'

const router = Router()

router.use(requireRole('ADMIN', 'CLERK'))

router.get('/masters', async (_req, res) => {
  const { rows } = await query(`SELECT * FROM acc_masters ORDER BY sort_order, id`)
  res.json(rows)
})

router.post('/sub-masters', async (req, res) => {
  const name = String(req.body?.name || '').trim().toUpperCase()
  const masterId = Number(req.body?.masterId)
  const normalBalance = req.body?.normalBalance === 'credit' ? 'credit' : 'debit'
  const statement = req.body?.statement === 'pnl' ? 'pnl' : 'balance_sheet'
  if (!name || !masterId) return res.status(400).json({ error: 'Name and master are required.' })
  try {
    const { rows } = await query(
      `INSERT INTO acc_sub_masters (name, master_id, normal_balance, statement)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, masterId, normalBalance, statement]
    )
    res.status(201).json({
      id: rows[0].id,
      name: rows[0].name,
      masterId: rows[0].master_id,
      normalBalance: rows[0].normal_balance,
      statement: rows[0].statement,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/sub-masters', async (_req, res) => {
  const { rows } = await query(
    `SELECT s.*, m.name AS master_name
     FROM acc_sub_masters s
     LEFT JOIN acc_masters m ON m.id = s.master_id
     ORDER BY s.sort_order, s.id`
  )
  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    masterId: r.master_id,
    masterName: r.master_name,
    normalBalance: r.normal_balance,
    statement: r.statement,
  })))
})

router.get('/accounts', async (_req, res) => {
  const balances = await getAccountBalances()
  res.json(balances)
})

router.post('/accounts', async (req, res) => {
  const name = String(req.body?.name || '').trim()
  const subMasterId = Number(req.body?.subMasterId)
  if (!name || !subMasterId) return res.status(400).json({ error: 'Name and subMasterId are required.' })

  const { rows } = await query(
    `INSERT INTO acc_accounts (code, name, village, mobile, sub_master_id, is_system)
     VALUES ($1,$2,$3,$4,$5,FALSE) RETURNING *`,
    [
      req.body?.code || null,
      name,
      req.body?.village || 'NIL',
      req.body?.mobile || '0000000000',
      subMasterId,
    ]
  )
  res.status(201).json({
    id: rows[0].id,
    code: rows[0].code,
    name: rows[0].name,
    village: rows[0].village,
    mobile: rows[0].mobile,
    subMasterId: rows[0].sub_master_id,
  })
})

router.get('/accounts/:id/ledger', async (req, res) => {
  const data = await getAccountLedger(req.params.id)
  if (!data) return res.status(404).json({ error: 'Account not found' })
  res.json(data)
})

router.get('/journals', async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 })
  const count = await query(`SELECT COUNT(*)::int AS count FROM journal_entries`)
  const { rows } = await query(
    `SELECT je.*,
      (SELECT COALESCE(SUM(debit),0) FROM journal_lines WHERE journal_entry_id = je.id) AS debit,
      (SELECT COALESCE(SUM(credit),0) FROM journal_lines WHERE journal_entry_id = je.id) AS credit,
      (SELECT COUNT(*) FROM journal_lines WHERE journal_entry_id = je.id) AS line_count
     FROM journal_entries je
     ORDER BY je.entry_date DESC, je.id DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  const items = rows.map((r) => ({
    id: r.id,
    date: r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : String(r.entry_date).slice(0, 10),
    narration: r.narration,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    createdBy: r.created_by,
    debit: Number(r.debit),
    credit: Number(r.credit),
    lineCount: Number(r.line_count),
  }))
  res.json(pageResult(items, count.rows[0].count, page, limit))
})

router.get('/journals/:id', async (req, res) => {
  const entry = await query(`SELECT * FROM journal_entries WHERE id = $1`, [req.params.id])
  if (!entry.rows[0]) return res.status(404).json({ error: 'Not found' })
  const lines = await query(
    `SELECT jl.*, a.name AS account_name, a.code
     FROM journal_lines jl
     JOIN acc_accounts a ON a.id = jl.account_id
     WHERE jl.journal_entry_id = $1
     ORDER BY jl.id`,
    [req.params.id]
  )
  const e = entry.rows[0]
  const rev = await query(
    `SELECT id FROM journal_entries
     WHERE reference_type = 'REVERSE' AND reference_id = $1 LIMIT 1`,
    [`JE-${e.id}`]
  )
  res.json({
    id: e.id,
    date: e.entry_date instanceof Date ? e.entry_date.toISOString().slice(0, 10) : String(e.entry_date).slice(0, 10),
    narration: e.narration,
    referenceType: e.reference_type,
    referenceId: e.reference_id,
    createdBy: e.created_by,
    reversedById: rev.rows[0]?.id || null,
    canReverse: e.reference_type !== 'REVERSE' && !rev.rows[0],
    lines: lines.rows.map((l) => ({
      id: l.id,
      accountId: l.account_id,
      accountName: l.account_name,
      code: l.code,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description,
    })),
  })
})

router.post('/journals', async (req, res) => {
  try {
    const result = await postJournal({
      entryDate: req.body?.entryDate || new Date().toISOString().slice(0, 10),
      narration: req.body?.narration || '',
      referenceType: 'MANUAL',
      referenceId: req.body?.referenceId || `MANUAL-${Date.now()}`,
      createdBy: req.user?.name || null,
      lines: req.body?.lines || [],
    })
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

/** Create a reversing journal (swap debit/credit). Idempotent per source JE. */
router.post('/journals/:id/reverse', async (req, res) => {
  try {
    const entry = await query(`SELECT * FROM journal_entries WHERE id = $1`, [req.params.id])
    if (!entry.rows[0]) return res.status(404).json({ error: 'Journal not found' })
    const e = entry.rows[0]

    if (e.reference_type === 'REVERSE') {
      return res.status(400).json({ error: 'Cannot reverse a reversing entry. Open the original journal instead.' })
    }

    const lines = await query(
      `SELECT account_id, debit, credit, description
       FROM journal_lines WHERE journal_entry_id = $1 ORDER BY id`,
      [req.params.id]
    )
    if (lines.rowCount === 0) return res.status(400).json({ error: 'Journal has no lines to reverse.' })

    const result = await postJournal({
      entryDate: req.body?.entryDate || new Date().toISOString().slice(0, 10),
      narration: req.body?.narration || `Reversal of JE#${e.id}${e.narration ? ` — ${e.narration}` : ''}`,
      referenceType: 'REVERSE',
      referenceId: `JE-${e.id}`,
      createdBy: req.user?.name || null,
      lines: lines.rows.map((l) => ({
        accountId: l.account_id,
        debit: Number(l.credit || 0),
        credit: Number(l.debit || 0),
        description: l.description ? `Reversal: ${l.description}` : `Reversal of JE#${e.id}`,
      })),
    })

    if (result.skipped) {
      return res.status(409).json({ error: 'This journal was already reversed.', id: result.id })
    }
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/trial-balance', async (_req, res) => {
  res.json(await getTrialBalance())
})

router.get('/balance-sheet', async (_req, res) => {
  res.json(await getBalanceSheetFromLedger())
})

router.get('/pnl', async (req, res) => {
  res.json(await getPnlFromLedger({
    from: req.query.from || null,
    to: req.query.to || null,
    preset: req.query.preset || null,
  }))
})

router.post('/opening', async (req, res) => {
  const accountId = Number(req.body?.accountId)
  const contraAccountId = Number(req.body?.contraAccountId)
  const amount = Number(req.body?.amount)
  const side = req.body?.side === 'credit' ? 'credit' : 'debit'
  if (!accountId || !contraAccountId || accountId === contraAccountId) {
    return res.status(400).json({ error: 'Pick two different accounts.' })
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' })
  }
  const lines = side === 'credit'
    ? [
        { accountId: contraAccountId, debit: amount, credit: 0 },
        { accountId, debit: 0, credit: amount },
      ]
    : [
        { accountId, debit: amount, credit: 0 },
        { accountId: contraAccountId, debit: 0, credit: amount },
      ]
  try {
    const result = await postJournal({
      entryDate: req.body?.entryDate || new Date().toISOString().slice(0, 10),
      narration: req.body?.narration || 'Opening balance',
      referenceType: 'OPENING',
      referenceId: `OPENING-${accountId}-${Date.now()}`,
      createdBy: req.user?.name || null,
      lines,
    })
    res.status(201).json(result)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
