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

const router = Router()

router.get('/masters', async (_req, res) => {
  const { rows } = await query(`SELECT * FROM acc_masters ORDER BY sort_order, id`)
  res.json(rows)
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

router.get('/journals', async (_req, res) => {
  const { rows } = await query(
    `SELECT je.*,
      (SELECT COALESCE(SUM(debit),0) FROM journal_lines WHERE journal_entry_id = je.id) AS debit,
      (SELECT COALESCE(SUM(credit),0) FROM journal_lines WHERE journal_entry_id = je.id) AS credit,
      (SELECT COUNT(*) FROM journal_lines WHERE journal_entry_id = je.id) AS line_count
     FROM journal_entries je
     ORDER BY je.entry_date DESC, je.id DESC
     LIMIT 200`
  )
  res.json(rows.map((r) => ({
    id: r.id,
    date: r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : String(r.entry_date).slice(0, 10),
    narration: r.narration,
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    createdBy: r.created_by,
    debit: Number(r.debit),
    credit: Number(r.credit),
    lineCount: Number(r.line_count),
  })))
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
  res.json({
    id: e.id,
    date: e.entry_date instanceof Date ? e.entry_date.toISOString().slice(0, 10) : String(e.entry_date).slice(0, 10),
    narration: e.narration,
    referenceType: e.reference_type,
    referenceId: e.reference_id,
    createdBy: e.created_by,
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

router.get('/trial-balance', async (_req, res) => {
  res.json(await getTrialBalance())
})

router.get('/balance-sheet', async (_req, res) => {
  res.json(await getBalanceSheetFromLedger())
})

router.get('/pnl', async (_req, res) => {
  res.json(await getPnlFromLedger())
})

export default router
