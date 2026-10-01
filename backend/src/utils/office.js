import { query } from '../db.js'

let ready = false

export async function ensureOfficeSchema() {
  if (ready) return
  await query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ`)
  await query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS voided_by TEXT`)
  await query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS bank_id INTEGER`)
  await query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS overpayment NUMERIC(12, 2) NOT NULL DEFAULT 0`)
  await query(`
    CREATE TABLE IF NOT EXISTS receipt_allocations (
      id SERIAL PRIMARY KEY,
      receipt_no INTEGER NOT NULL,
      emi_schedule_id INTEGER NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      interest NUMERIC(12, 2) NOT NULL DEFAULT 0
    )
  `)
  await query(`ALTER TABLE cheques ADD COLUMN IF NOT EXISTS bank_account_id INTEGER`)
  await query(`ALTER TABLE cheques ADD COLUMN IF NOT EXISTS cleared_at DATE`)
  await query(`
    CREATE TABLE IF NOT EXISTS handloan_receipts (
      id SERIAL PRIMARY KEY,
      customer_handloan_id INTEGER NOT NULL REFERENCES customer_handloans(id) ON DELETE CASCADE,
      receipt_no INTEGER NOT NULL,
      paid_date DATE NOT NULL,
      amount NUMERIC(14, 2) NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      detail JSONB
    )
  `)
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS seized_notes TEXT`)
  ready = true
}

export async function writeAudit({ actor, action, entity, entityId, detail }, executor = { query }) {
  await ensureOfficeSchema()
  await executor.query(
    `INSERT INTO audit_events (actor, action, entity, entity_id, detail)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [actor || null, action, entity, entityId != null ? String(entityId) : null, JSON.stringify(detail || {})]
  )
}

const CLEARED = new Set(['cleared', 'paid'])

/** Update a cheque. Clearing into a bank adds the amount once. */
export async function applyChequeUpdate(id, body = {}) {
  await ensureOfficeSchema()
  const prevRes = await query(`SELECT * FROM cheques WHERE id = $1`, [id])
  const prev = prevRes.rows[0]
  if (!prev) return null

  const nextStatus = body.status || prev.status
  const becomingClear = CLEARED.has(String(nextStatus).toLowerCase())
    && !CLEARED.has(String(prev.status || '').toLowerCase())

  let bankId = prev.bank_account_id
  let clearedAt = prev.cleared_at
  const amount = body.amount != null ? Number(body.amount) : Number(prev.amount)

  if (becomingClear) {
    bankId = Number(body.bankId || 0)
    if (!bankId) {
      const err = new Error('Choose a bank account before marking the cheque cleared.')
      err.status = 400
      throw err
    }
    const bank = await query(`SELECT id FROM bank_accounts WHERE id = $1`, [bankId])
    if (!bank.rows[0]) {
      const err = new Error('Bank account not found.')
      err.status = 400
      throw err
    }
    await query(`UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`, [amount, bankId])
    clearedAt = new Date().toISOString().slice(0, 10)
    await writeAudit({
      actor: body.actor || null,
      action: 'cheque_clear',
      entity: 'cheque',
      entityId: id,
      detail: { amount, bankId, chequeNo: body.cheque || prev.cheque_no },
    })
  }

  const { rows } = await query(
    `UPDATE cheques SET
      cheque_no = COALESCE($1, cheque_no),
      description = COALESCE($2, description),
      cheque_date = COALESCE($3, cheque_date),
      amount = COALESCE($4, amount),
      status = COALESCE($5, status),
      bank_account_id = $6,
      cleared_at = $7
     WHERE id = $8 RETURNING *`,
    [
      body.cheque || body.chequeNo || null,
      body.description ?? null,
      body.date || null,
      body.amount != null ? amount : null,
      body.status || null,
      bankId,
      clearedAt,
      id,
    ]
  )
  return rows[0] || null
}
