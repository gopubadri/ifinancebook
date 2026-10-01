import { Router } from 'express'
import { pool, query } from '../db.js'
import { mapCustomer, mapEmiRow, mapOutPayment } from '../mappers.js'
import { buildEmiSchedule, emiFrequencyFromSettings } from '../utils/emi.js'
import { ensureOfficeSchema, writeAudit } from '../utils/office.js'
import { refreshAllDerived } from '../services/refresh.js'
import { postEmiReceipt, postJournal } from '../services/ledger.js'
import {
  getSettingsData,
  calcOdInterest,
  assertNotBackdated,
  defaultEntryDate,
} from '../utils/settings.js'
import { parsePagination, pageResult } from '../utils/pagination.js'
import { ensureDayReportDate } from '../utils/dayReport.js'

const router = Router()

router.post('/', async (req, res) => {
  const body = req.body || {}
  const hpNo = String(body.hpNo || '').trim()
  const name = String(body.name || '').trim()
  const emiPeriod = Number(body.emiPeriod)
  const emiAmount = Number(body.emiAmount)
  const emiDate = body.emiDate || new Date().toISOString().slice(0, 10)

  if (!hpNo || !name) {
    return res.status(400).json({ error: 'HP No and Name are required.' })
  }
  if (!Number.isFinite(emiPeriod) || emiPeriod < 1) {
    return res.status(400).json({ error: 'EMI Period must be at least 1 month.' })
  }
  if (!Number.isFinite(emiAmount) || emiAmount <= 0) {
    return res.status(400).json({ error: 'EMI Amount must be greater than 0.' })
  }

  const exists = await query(`SELECT id FROM customers WHERE lower(hp_no) = lower($1)`, [hpNo])
  if (exists.rowCount > 0) {
    return res.status(409).json({ error: `HP No "${hpNo}" already exists.` })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const idRes = await client.query(`SELECT COALESCE(MAX(id), 4800) + 1 AS id FROM customers`)
    const id = Number(idRes.rows[0].id)

    const seized = body.seized === 'YES' ? 'YES' : 'NO'
    const closed = body.closed === 'YES' ? 'YES' : 'NO'
    const today = new Date().toISOString().slice(0, 10)
    const values = [
      id,
      hpNo,
      name,
      String(body.mobile || '').trim() || null,
      String(body.regNo || '').trim() || null,
      String(body.village || '').trim() || null,
      emiPeriod,
      emiAmount,
      String(body.makersNo || '').trim() || null,
      String(body.model || '').trim() || null,
      String(body.chasisNo || '').trim() || null,
      String(body.engNo || '').trim() || null,
      Boolean(body.cb),
      body.clrDate || null,
      emiDate,
      seized,
      closed,
      seized === 'YES' ? (body.seizedDate || today) : null,
      closed === 'YES' ? (body.closedDate || today) : null,
      String(body.city || '').trim() || null,
      String(body.state || '').trim() || null,
      String(body.street || '').trim() || null,
      String(body.alternateMobile || '').trim() || null,
      req.user?.name || null,
    ]

    const inserted = await client.query(
      `INSERT INTO customers (
        id, hp_no, name, mobile, reg_no, village, emi_period, emi_amount,
        makers_no, model, chasis_no, eng_no, cb, clr_date, emi_date, seized, closed,
        seized_date, closed_date, city, state, street, alternate_mobile, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING *`,
      values
    )

    const settings = await getSettingsData()
    const schedule = buildEmiSchedule({
      emiAmount,
      emiPeriod,
      emiDate,
      frequency: emiFrequencyFromSettings(settings),
    })
    for (const row of schedule) {
      await client.query(
        `INSERT INTO emi_schedules (
          customer_id, sno, due_date, amount, interest_component,
          paid_interest, paid_amount, balance, cumulative_balance, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id, row.sno, row.dueDate, row.amount, row.interestComponent,
          row.paidInterest, row.paidAmount, row.balance, row.cumulativeBalance, row.status,
        ]
      )
    }

    // Also register under RTA module for interconnection
    await client.query(
      `INSERT INTO generic_module_rows (module_key, row_data) VALUES ('rta', $1::jsonb)`,
      [JSON.stringify({
        customer: name,
        hpNo,
        agent: req.user?.name || 'ADMIN',
        bikeBrand: String(body.makersNo || '').trim() || '-',
      })]
    )

    await refreshAllDerived(client)
    await client.query('COMMIT')
    res.status(201).json(mapCustomer(inserted.rows[0]))
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const { page, limit, offset } = parsePagination(req.query)
  const like = `%${q}%`

  const where = q
    ? `WHERE lower(name) LIKE $1
          OR lower(hp_no) LIKE $1
          OR COALESCE(mobile, '') LIKE $1
          OR lower(COALESCE(village, '')) LIKE $1
          OR lower(COALESCE(reg_no, '')) LIKE $1
          OR COALESCE(alternate_mobile, '') LIKE $1`
    : ''
  const params = q ? [like] : []

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM customers ${where}`,
    params
  )
  const total = countRes.rows[0].count

  const dataRes = await query(
    `SELECT * FROM customers ${where}
     ORDER BY id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )

  res.json(pageResult(dataRes.rows.map(mapCustomer), total, page, limit))
})

router.get('/:id', async (req, res) => {
  const { ensureVehicleDates } = await import('../services/specialReports.js')
  await ensureVehicleDates()
  const { rows } = await query(`SELECT * FROM customers WHERE id = $1`, [req.params.id])
  if (!rows[0]) return res.status(404).json(null)
  res.json(mapCustomer(rows[0]))
})

router.put('/:id', async (req, res) => {
  const { ensureVehicleDates } = await import('../services/specialReports.js')
  await ensureVehicleDates()
  const id = Number(req.params.id)
  const body = req.body || {}
  const existing = await query(`SELECT * FROM customers WHERE id = $1`, [id])
  if (!existing.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  const prev = existing.rows[0]
  await ensureOfficeSchema()

  let hpNo = prev.hp_no
  if (body.hpNo && String(body.hpNo).trim() && String(body.hpNo).trim() !== prev.hp_no) {
    const nextHp = String(body.hpNo).trim()
    const clash = await query(
      `SELECT id FROM customers WHERE lower(hp_no) = lower($1) AND id <> $2`,
      [nextHp, id]
    )
    if (clash.rowCount > 0) return res.status(409).json({ error: `HP No "${nextHp}" already exists.` })
    hpNo = nextHp
  }

  const seized = body.seized === 'YES' ? 'YES' : 'NO'
  const closed = body.closed === 'YES' ? 'YES' : 'NO'
  const today = new Date().toISOString().slice(0, 10)

  let seizedDate = body.seizedDate || prev.seized_date || null
  if (seized === 'YES' && prev.seized !== 'YES') seizedDate = body.seizedDate || today
  if (seized === 'NO') seizedDate = null

  let closedDate = body.closedDate || prev.closed_date || null
  if (closed === 'YES' && prev.closed !== 'YES') closedDate = body.closedDate || today
  if (closed === 'NO') closedDate = null

  const { rows } = await query(
    `UPDATE customers SET
      name = $1, mobile = $2, reg_no = $3, village = $4,
      makers_no = $5, model = $6, chasis_no = $7, eng_no = $8,
      cb = $9, clr_date = $10, emi_date = $11,
      seized = $12, closed = $13,
      seized_date = $14, closed_date = $15,
      city = $16, state = $17, street = $18, alternate_mobile = $19,
      insurance_expiry = $20, tax_expiry = $21, pollution_expiry = $22, rta_token_date = $23,
      hp_no = $25, seized_notes = $26,
      updated_at = NOW()
     WHERE id = $24
     RETURNING *`,
    [
      String(body.name || prev.name).trim(),
      String(body.mobile || '').trim() || null,
      String(body.regNo || '').trim() || null,
      String(body.village || '').trim() || null,
      String(body.makersNo || '').trim() || null,
      String(body.model || '').trim() || null,
      String(body.chasisNo || '').trim() || null,
      String(body.engNo || '').trim() || null,
      Boolean(body.cb),
      body.clrDate || null,
      body.emiDate || prev.emi_date,
      seized,
      closed,
      seizedDate,
      closedDate,
      String(body.city || '').trim() || null,
      String(body.state || '').trim() || null,
      String(body.street || '').trim() || null,
      String(body.alternateMobile || '').trim() || null,
      body.insuranceExpiry || null,
      body.taxExpiry || null,
      body.pollutionExpiry || null,
      body.rtaTokenDate || null,
      id,
      hpNo,
      String(body.seizedNotes ?? prev.seized_notes ?? '').trim() || null,
    ]
  )

  await refreshAllDerived()
  res.json(mapCustomer(rows[0]))
})

router.post('/:id/rebuild-schedule', async (req, res) => {
  await ensureOfficeSchema()
  const id = Number(req.params.id)
  const existing = await query(`SELECT * FROM customers WHERE id = $1`, [id])
  if (!existing.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  const prev = existing.rows[0]

  const receipts = await query(`SELECT COUNT(*)::int AS n FROM receipts WHERE customer_id = $1`, [id])
  if (Number(receipts.rows[0].n) > 0) {
    return res.status(400).json({ error: 'Schedule can be rebuilt only before any receipt is saved.' })
  }

  const emiAmount = Number(req.body?.emiAmount || prev.emi_amount)
  const emiPeriod = Number(req.body?.emiPeriod || prev.emi_period)
  const emiDate = req.body?.emiDate || String(prev.emi_date).slice(0, 10)
  if (!Number.isFinite(emiPeriod) || emiPeriod < 1) {
    return res.status(400).json({ error: 'EMI period must be at least 1.' })
  }
  if (!Number.isFinite(emiAmount) || emiAmount <= 0) {
    return res.status(400).json({ error: 'EMI amount must be greater than 0.' })
  }

  const settings = await getSettingsData()
  const schedule = buildEmiSchedule({
    emiAmount,
    emiPeriod,
    emiDate,
    frequency: emiFrequencyFromSettings(settings),
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM emi_schedules WHERE customer_id = $1`, [id])
    for (const row of schedule) {
      await client.query(
        `INSERT INTO emi_schedules (
          customer_id, sno, due_date, amount, interest_component,
          paid_interest, paid_amount, balance, cumulative_balance, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id, row.sno, row.dueDate, row.amount, row.interestComponent,
          row.paidInterest, row.paidAmount, row.balance, row.cumulativeBalance, row.status,
        ]
      )
    }
    await client.query(
      `UPDATE customers SET emi_amount = $1, emi_period = $2, emi_date = $3, updated_at = NOW() WHERE id = $4`,
      [emiAmount, emiPeriod, emiDate, id]
    )
    await writeAudit({
      actor: req.user?.name,
      action: 'rebuild_schedule',
      entity: 'customer',
      entityId: id,
      detail: { emiAmount, emiPeriod, emiDate, frequency: emiFrequencyFromSettings(settings) },
    }, client)
    await refreshAllDerived(client)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  const updated = await query(`SELECT * FROM customers WHERE id = $1`, [id])
  res.json(mapCustomer(updated.rows[0]))
})

router.get('/:id/emi-summary', async (req, res) => {
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [req.params.id])
  if (!customerRes.rows[0]) return res.status(404).json(null)

  const settings = await getSettingsData()
  const odRate = Number(settings.odInterest ?? 0.1)

  const { rows } = await query(
    `SELECT * FROM emi_schedules WHERE customer_id = $1 ORDER BY sno`,
    [req.params.id]
  )
  const today = new Date().toISOString().slice(0, 10)
  const schedule = rows.map((row) => {
    const mapped = mapEmiRow(row)
    if (mapped.status !== 'paid' && mapped.dueDate < today) {
      const od = calcOdInterest(mapped.balance, mapped.dueDate, odRate)
      return {
        ...mapped,
        daysOverdue: od.days,
        odInterest: od.interest,
        odTotal: Math.round((mapped.balance + od.interest) * 100) / 100,
      }
    }
    return { ...mapped, daysOverdue: 0, odInterest: 0, odTotal: mapped.balance }
  })

  const totalLoan = schedule.reduce((s, r) => s + r.amount, 0)
  const paidAmount = schedule.reduce((s, r) => s + r.paidAmount, 0)
  const paidEmis = schedule.filter((r) => r.status === 'paid').length
  const overdue = schedule.filter((r) => r.status !== 'paid' && r.dueDate < today)
  const overdueAmount = overdue.reduce((s, r) => s + r.balance, 0)
  const odInterestTotal = overdue.reduce((s, r) => s + r.odInterest, 0)

  res.json({
    paidAmount,
    pendingBalance: overdueAmount,
    balance: totalLoan - paidAmount,
    totalBalance: totalLoan,
    totalEmis: schedule.length,
    paidEmis,
    remainingEmis: schedule.length - paidEmis,
    totalLoan,
    overdueCount: overdue.length,
    overdueAmount,
    odInterestRate: odRate,
    odInterestTotal,
    odGrandTotal: Math.round((overdueAmount + odInterestTotal) * 100) / 100,
    schedule,
  })
})

router.get('/:id/bills', async (req, res) => {
  await ensureOfficeSchema()
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [req.params.id])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  const settings = await getSettingsData()
  const series = settings.hpRcptSeries || '00'

  const { rows } = await query(
    `SELECT * FROM receipts WHERE customer_id = $1 ORDER BY id DESC`,
    [req.params.id]
  )
  res.json(rows.map((r) => ({
    id: r.id,
    billNo: `${series}/${r.receipt_no}`,
    receiptNo: r.receipt_no,
    date: r.paid_date instanceof Date ? r.paid_date.toISOString().slice(0, 10) : String(r.paid_date).slice(0, 10),
    amount: Number(r.amount),
    ta: Number(r.ta),
    total: Number(r.total),
    createdBy: r.created_by || '',
    type: 'EMI RECEIPT',
    voided: Boolean(r.voided_at),
    overpayment: Number(r.overpayment || 0),
  })))
})

router.get('/:id/reminders', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM customer_reminders WHERE customer_id = $1 ORDER BY remind_date, id`,
    [req.params.id]
  )
  res.json(rows.map((r) => ({
    id: r.id,
    remindDate: r.remind_date instanceof Date ? r.remind_date.toISOString().slice(0, 10) : String(r.remind_date).slice(0, 10),
    message: r.message,
    status: r.status,
    createdBy: r.created_by || '',
  })))
})

router.post('/:id/reminders', async (req, res) => {
  const customerId = Number(req.params.id)
  const customerRes = await query(`SELECT id FROM customers WHERE id = $1`, [customerId])
  if (!customerRes.rowCount) return res.status(404).json({ error: 'Customer not found' })

  const remindDate = req.body?.remindDate || req.body?.date
  const message = String(req.body?.message || '').trim()
  if (!remindDate || !message) {
    return res.status(400).json({ error: 'Remind date and message are required.' })
  }

  const { rows } = await query(
    `INSERT INTO customer_reminders (customer_id, remind_date, message, status, created_by)
     VALUES ($1,$2,$3,'pending',$4) RETURNING *`,
    [customerId, remindDate, message, req.user?.name || null]
  )
  const r = rows[0]
  res.status(201).json({
    id: r.id,
    remindDate: r.remind_date instanceof Date ? r.remind_date.toISOString().slice(0, 10) : String(r.remind_date).slice(0, 10),
    message: r.message,
    status: r.status,
    createdBy: r.created_by || '',
  })
})

router.patch('/:id/reminders/:reminderId', async (req, res) => {
  const status = ['pending', 'done', 'cancelled'].includes(req.body?.status)
    ? req.body.status
    : null
  if (!status) return res.status(400).json({ error: 'Invalid status' })

  const { rows } = await query(
    `UPDATE customer_reminders SET status = $1
     WHERE id = $2 AND customer_id = $3 RETURNING *`,
    [status, req.params.reminderId, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Reminder not found' })
  const r = rows[0]
  res.json({
    id: r.id,
    remindDate: r.remind_date instanceof Date ? r.remind_date.toISOString().slice(0, 10) : String(r.remind_date).slice(0, 10),
    message: r.message,
    status: r.status,
    createdBy: r.created_by || '',
  })
})

router.get('/:id/settlement-preview', async (req, res) => {
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [req.params.id])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  const settings = await getSettingsData()
  const settlementRate = Number(settings.settlementInterest || 0)

  const bal = await query(
    `SELECT COALESCE(SUM(balance),0) AS outstanding
     FROM emi_schedules WHERE customer_id = $1 AND status <> 'paid'`,
    [req.params.id]
  )
  const outstanding = Number(bal.rows[0].outstanding || 0)
  const settlementInterest = Math.round(outstanding * (settlementRate / 100) * 100) / 100
  res.json({
    outstanding,
    settlementInterestRate: settlementRate,
    settlementInterest,
    totalDue: Math.round((outstanding + settlementInterest) * 100) / 100,
    closed: customerRes.rows[0].closed,
  })
})

router.post('/:id/settlement', async (req, res) => {
  const customerId = Number(req.params.id)
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [customerId])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  if (customerRes.rows[0].closed === 'YES') {
    return res.status(400).json({ error: 'Finance is already closed.' })
  }

  const settings = await getSettingsData()
  const settlementDate = defaultEntryDate(settings, req.body?.date)
  try {
    assertNotBackdated(settings, settlementDate)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bal = await client.query(
      `SELECT COALESCE(SUM(balance),0) AS outstanding
       FROM emi_schedules WHERE customer_id = $1 AND status <> 'paid' FOR UPDATE`,
      [customerId]
    )
    const outstanding = Number(bal.rows[0].outstanding || 0)
    const settlementRate = Number(settings.settlementInterest || 0)
    const settlementInterest = Math.round(outstanding * (settlementRate / 100) * 100) / 100
    const waiver = Number(req.body?.waiverAmount || 0)
    const amountCollected = Number(req.body?.amountCollected ?? (outstanding + settlementInterest - waiver))
    const totalDue = Math.round((outstanding + settlementInterest) * 100) / 100

    await client.query(
      `UPDATE emi_schedules
       SET paid_amount = amount, balance = 0, status = 'paid'
       WHERE customer_id = $1 AND status <> 'paid'`,
      [customerId]
    )
    await client.query(
      `UPDATE customers SET closed = 'YES', closed_date = $1, updated_at = NOW() WHERE id = $2`,
      [settlementDate, customerId]
    )

    const { rows: settRows } = await client.query(
      `INSERT INTO settlements (
        customer_id, settlement_date, outstanding_before, settlement_interest,
        waiver_amount, amount_collected, total_due, notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        customerId, settlementDate, outstanding, settlementInterest,
        waiver, amountCollected, totalDue, req.body?.notes || null, req.user?.name || null,
      ]
    )

    await ensureDayReportDate()
    const snoRes = await client.query(`SELECT COALESCE(MAX(sno),0)+1 AS sno FROM day_report_rows`)
    const c = mapCustomer(customerRes.rows[0])
    await client.query(
      `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt, entry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        Number(snoRes.rows[0].sno), c.name, 'STM', c.hpNo,
        `Settlement clearance`, req.user?.name || '', amountCollected, settlementDate,
      ]
    )

    try {
      if (amountCollected > 0) {
        await postJournal({
          entryDate: settlementDate,
          narration: `STM settlement — ${c.name} (${c.hpNo})`,
          referenceType: 'SETTLEMENT',
          referenceId: String(settRows[0].id),
          createdBy: req.user?.name || null,
          lines: [
            { accountName: 'CASH / BANK COLLECTIONS', debit: amountCollected, credit: 0 },
            { accountName: 'HP RECEIVABLES', debit: 0, credit: Math.min(amountCollected, outstanding) },
            ...(amountCollected > outstanding
              ? [{ accountName: 'RECEIVED INTEREST', debit: 0, credit: amountCollected - outstanding }]
              : []),
            ...(amountCollected < outstanding
              ? [
                  { accountName: 'GENERAL EXPENSE', debit: outstanding - amountCollected, credit: 0, description: 'Settlement waiver/write-off' },
                  { accountName: 'HP RECEIVABLES', debit: 0, credit: outstanding - amountCollected },
                ]
              : []),
          ],
        }, client)
      } else if (outstanding > 0) {
        await postJournal({
          entryDate: settlementDate,
          narration: `STM write-off — ${c.name} (${c.hpNo})`,
          referenceType: 'SETTLEMENT',
          referenceId: String(settRows[0].id),
          createdBy: req.user?.name || null,
          lines: [
            { accountName: 'GENERAL EXPENSE', debit: outstanding, credit: 0, description: 'Full write-off' },
            { accountName: 'HP RECEIVABLES', debit: 0, credit: outstanding },
          ],
        }, client)
      }
    } catch (ledgerErr) {
      console.warn('Settlement ledger post skipped:', ledgerErr.message)
    }

    await refreshAllDerived(client)
    await client.query('COMMIT')
    res.status(201).json({
      ok: true,
      settlementId: settRows[0].id,
      outstanding,
      settlementInterest,
      waiverAmount: waiver,
      amountCollected,
      totalDue,
      closed: 'YES',
      closedDate: settlementDate,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

router.get('/:id/out-payments', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM out_payments WHERE customer_id = $1 ORDER BY sno`,
    [req.params.id]
  )
  res.json(rows.map(mapOutPayment))
})

router.post('/:id/out-payments', async (req, res) => {
  const customerId = Number(req.params.id)
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [customerId])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })

  const settings = await getSettingsData()
  const amount = Number(req.body?.amount || 0)
  const interestInput = req.body?.interest
  const interest = interestInput === undefined || interestInput === null || interestInput === ''
    ? Number(settings.outPaymentInterest || 0)
    : Number(interestInput)
  const paidAmount = Number(req.body?.paidAmount ?? amount)
  const paidDate = defaultEntryDate(settings, req.body?.date)
  const status = req.body?.status === 'pending' ? 'pending' : 'paid'

  try {
    assertNotBackdated(settings, paidDate)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' })
  }

  let dueDate = req.body?.dueDate || null
  if (!dueDate && String(settings.hpOpDueDate || '').toUpperCase() === 'YES') {
    const d = new Date(paidDate)
    d.setMonth(d.getMonth() + 1)
    dueDate = d.toISOString().slice(0, 10)
  }

  const snoRes = await query(
    `SELECT COALESCE(MAX(sno), 0) + 1 AS sno FROM out_payments WHERE customer_id = $1`,
    [customerId]
  )
  const sno = Number(snoRes.rows[0].sno)

  const { rows } = await query(
    `INSERT INTO out_payments (customer_id, sno, amount, paid_date, interest, paid_amount, status, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [customerId, sno, amount, paidDate, interest, paidAmount, status, dueDate, req.body?.notes || null]
  )

  // Mirror into Phase-2 handloan_accounts
  const c = mapCustomer(customerRes.rows[0])
  await query(
    `INSERT INTO handloan_accounts (loan_type, name, village, balance, interest_rate, issued_date, customer_id)
     VALUES ('1', $1, $2, $3, $4, $5, $6)`,
    [c.name, c.village || '-', amount, interest, paidDate, customerId]
  )

  await ensureDayReportDate()
  const daySno = await query(`SELECT COALESCE(MAX(sno), 0) + 1 AS sno FROM day_report_rows`)
  const opSeries = settings.hpopRcptSeries || 'OP'
  await query(
    `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt, entry_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      Number(daySno.rows[0].sno),
      c.name,
      `${opSeries}/${rows[0].id}`,
      c.hpNo,
      'Out payment',
      req.user?.name || '',
      -Math.abs(paidAmount),
      paidDate,
    ]
  )

  await refreshAllDerived()
  res.status(201).json(mapOutPayment(rows[0]))
})

router.get('/:id/handloans', async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM customer_handloans WHERE customer_id = $1 ORDER BY id DESC`,
    [req.params.id]
  )
  res.json(rows.map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    loanAmount: Number(r.loan_amount),
    interestRate: Number(r.interest_rate),
    issuedDate: r.issued_date instanceof Date ? r.issued_date.toISOString().slice(0, 10) : String(r.issued_date).slice(0, 10),
    balance: Number(r.balance),
    status: r.status,
    notes: r.notes,
  })))
})

router.post('/:id/handloans', async (req, res) => {
  const customerId = Number(req.params.id)
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [customerId])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })

  const settings = await getSettingsData()
  const loanType = String(settings.handloanType || '').includes('2') ? '2' : '1'
  const loanAmount = Number(req.body?.loanAmount || req.body?.amount || 0)
  const interestRate = Number(req.body?.interestRate || req.body?.interest || 0)
  const issuedDate = req.body?.issuedDate || req.body?.date || new Date().toISOString().slice(0, 10)
  const balance = Number(req.body?.balance ?? loanAmount)

  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return res.status(400).json({ error: 'Loan amount must be greater than 0.' })
  }

  const { rows } = await query(
    `INSERT INTO customer_handloans (customer_id, loan_amount, interest_rate, issued_date, balance, status, notes)
     VALUES ($1,$2,$3,$4,$5,'open',$6) RETURNING *`,
    [customerId, loanAmount, interestRate, issuedDate, balance, req.body?.notes || null]
  )

  const c = mapCustomer(customerRes.rows[0])
  await query(
    `INSERT INTO handloan_accounts (loan_type, name, village, balance, interest_rate, issued_date, customer_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [loanType, c.name, c.village || '-', balance, interestRate, issuedDate, customerId]
  )

  await refreshAllDerived()
  res.status(201).json({
    id: rows[0].id,
    customerId,
    loanAmount,
    interestRate,
    issuedDate,
    balance,
    status: 'open',
    loanType,
    notes: rows[0].notes,
  })
})

router.post('/:id/handloans/:hlId/repay', async (req, res) => {
  await ensureOfficeSchema()
  await ensureDayReportDate()
  const customerId = Number(req.params.id)
  const hlId = Number(req.params.hlId)
  const amount = Number(req.body?.amount || 0)
  const settings = await getSettingsData()
  const paidDate = defaultEntryDate(settings, req.body?.date)
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' })
  }
  try {
    assertNotBackdated(settings, paidDate)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const hl = await client.query(
      `SELECT * FROM customer_handloans WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [hlId, customerId]
    )
    if (!hl.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Handloan not found.' })
    }
    const balance = Number(hl.rows[0].balance)
    if (amount > balance + 0.001) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Repayment is more than the handloan balance.' })
    }
    const nextBalance = Math.round((balance - amount) * 100) / 100
    const status = nextBalance <= 0 ? 'paid' : 'open'
    await client.query(
      `UPDATE customer_handloans SET balance = $1, status = $2 WHERE id = $3`,
      [nextBalance, status, hlId]
    )
    await client.query(
      `UPDATE handloan_accounts
       SET balance = GREATEST(balance - $1, 0)
       WHERE id = (
         SELECT id FROM handloan_accounts
         WHERE customer_id = $2 AND issued_date = $3
         ORDER BY id DESC LIMIT 1
       )`,
      [amount, customerId, hl.rows[0].issued_date]
    )
    const receiptNoRes = await client.query(`SELECT nextval('receipt_no_seq') AS receipt_no`)
    const receiptNo = Number(receiptNoRes.rows[0].receipt_no)
    await client.query(
      `INSERT INTO handloan_receipts (customer_handloan_id, receipt_no, paid_date, amount, created_by)
       VALUES ($1,$2,$3,$4,$5)`,
      [hlId, receiptNo, paidDate, amount, req.user?.name || null]
    )
    const customer = mapCustomer((await client.query(`SELECT * FROM customers WHERE id = $1`, [customerId])).rows[0])
    const snoRes = await client.query(`SELECT COALESCE(MAX(sno), 0) + 1 AS sno FROM day_report_rows`)
    const series = settings.hphlRcptSeries || 'HL'
    await client.query(
      `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt, entry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        Number(snoRes.rows[0].sno), customer.name, `${series}/${receiptNo}`, customer.hpNo,
        'Handloan receipt', req.user?.name || '', amount, paidDate,
      ]
    )
    const bankId = Number(req.body?.bankId || 0)
    if (bankId) {
      const bank = await client.query(`SELECT id FROM bank_accounts WHERE id = $1`, [bankId])
      if (!bank.rows[0]) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Bank account not found.' })
      }
      await client.query(`UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`, [amount, bankId])
    }
    await writeAudit({
      actor: req.user?.name,
      action: 'handloan_repay',
      entity: 'customer_handloan',
      entityId: hlId,
      detail: { amount, receiptNo, balance: nextBalance },
    }, client)
    await refreshAllDerived(client)
    await client.query('COMMIT')
    res.status(201).json({
      ok: true,
      receiptNo,
      billNo: `${series}/${receiptNo}`,
      amount,
      balance: nextBalance,
      status,
      date: paidDate,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

router.post('/:id/receipts', async (req, res) => {
  const customerId = Number(req.params.id)
  const customerRes = await query(`SELECT * FROM customers WHERE id = $1`, [customerId])
  if (!customerRes.rows[0]) return res.status(404).json({ error: 'Customer not found' })
  const customer = mapCustomer(customerRes.rows[0])

  const settingsData = await getSettingsData()
  const amount = Number(req.body?.amount || 0)
  const ta = Number(req.body?.ta || 0)
  const total = Number(req.body?.total ?? amount + ta)
  const paidDate = defaultEntryDate(settingsData, req.body?.date)
  const createdBy = req.user?.name || null

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' })
  }

  try {
    assertNotBackdated(settingsData, paidDate)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  await ensureDayReportDate()
  await ensureOfficeSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const receiptNoRes = await client.query(`SELECT nextval('receipt_no_seq') AS receipt_no`)
    const receiptNo = Number(receiptNoRes.rows[0].receipt_no)

    await client.query(
      `INSERT INTO receipts (receipt_no, customer_id, paid_date, amount, ta, total, created_by, bank_id, overpayment)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0)`,
      [receiptNo, customerId, paidDate, amount, ta, total, createdBy, null]
    )

    let remaining = amount
    const schedule = await client.query(
      `SELECT * FROM emi_schedules
       WHERE customer_id = $1 AND status <> 'paid'
       ORDER BY sno FOR UPDATE`,
      [customerId]
    )

    for (const row of schedule.rows) {
      if (remaining <= 0) break
      const owed = Number(row.balance)
      const pay = Math.min(remaining, owed)
      const interestOwed = Math.max(0, Number(row.interest_component || 0) - Number(row.paid_interest || 0))
      const interestPay = Math.min(pay, interestOwed)
      const newPaid = Number(row.paid_amount) + pay
      const newBalance = Number(row.amount) - newPaid
      const status = newBalance <= 0 ? 'paid' : 'partial'

      await client.query(
        `UPDATE emi_schedules
         SET paid_amount = $1, paid_interest = $2, balance = $3, status = $4
         WHERE id = $5`,
        [newPaid, Number(row.paid_interest || 0) + interestPay, Math.max(newBalance, 0), status, row.id]
      )
      await client.query(
        `INSERT INTO receipt_allocations (receipt_no, emi_schedule_id, amount, interest)
         VALUES ($1,$2,$3,$4)`,
        [receiptNo, row.id, pay, interestPay]
      )
      remaining -= pay
    }
    const overpayment = Math.round(Math.max(remaining, 0) * 100) / 100

    const snoRes = await client.query(`SELECT COALESCE(MAX(sno), 0) + 1 AS sno FROM day_report_rows`)
    const series = settingsData.hpRcptSeries || '00'
    await client.query(
      `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt, entry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        Number(snoRes.rows[0].sno),
        customer.name,
        `${series}/${receiptNo}`,
        customer.hpNo,
        `EMI - ${customer.regNo || customer.hpNo}`,
        createdBy || '',
        total,
        paidDate,
      ]
    )

    const requestedBankId = Number(req.body?.bankId || 0)
    const bankRes = requestedBankId
      ? await client.query(`SELECT id, name FROM bank_accounts WHERE id = $1`, [requestedBankId])
      : await client.query(`SELECT id, name FROM bank_accounts ORDER BY id LIMIT 1`)
    const bank = bankRes.rows[0]
    if (requestedBankId && !bank) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Bank account not found.' })
    }
    if (bank) {
      await client.query(
        `UPDATE bank_accounts SET balance = balance + $1 WHERE id = $2`,
        [total, bank.id]
      )
    }
    await client.query(
      `UPDATE receipts SET bank_id = $1, overpayment = $2 WHERE receipt_no = $3`,
      [bank?.id || null, overpayment, receiptNo]
    )

    // Auto-close if all EMIs paid
    const unpaid = await client.query(
      `SELECT COUNT(*)::int AS n FROM emi_schedules WHERE customer_id = $1 AND status <> 'paid'`,
      [customerId]
    )
    if (Number(unpaid.rows[0].n) === 0) {
      await client.query(
        `UPDATE customers SET closed = 'YES', closed_date = COALESCE(closed_date, $1), updated_at = NOW() WHERE id = $2`,
        [paidDate, customerId]
      )
    }

    let ledgerPosted = true
    let ledgerWarning = null
    try {
      await postEmiReceipt({
        receiptNo,
        amount,
        ta,
        total,
        paidDate,
        customerName: customer.name,
        hpNo: customer.hpNo,
        createdBy,
      }, client)
    } catch (ledgerErr) {
      ledgerPosted = false
      ledgerWarning = ledgerErr.message
      console.warn('Ledger post skipped:', ledgerErr.message)
    }

    await refreshAllDerived(client)
    await client.query('COMMIT')
    res.json({
      ok: true,
      receiptNo,
      customerId,
      date: paidDate,
      amount,
      ta,
      total,
      bankId: bank?.id || null,
      bankName: bank?.name || null,
      overpayment,
      ledgerPosted,
      ledgerWarning,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

router.post('/:id/receipts/:receiptNo/void', async (req, res) => {
  await ensureOfficeSchema()
  await ensureDayReportDate()
  const customerId = Number(req.params.id)
  const receiptNo = Number(req.params.receiptNo)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const receiptRes = await client.query(
      `SELECT * FROM receipts WHERE receipt_no = $1 AND customer_id = $2 FOR UPDATE`,
      [receiptNo, customerId]
    )
    const receipt = receiptRes.rows[0]
    if (!receipt) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Receipt not found.' })
    }
    if (receipt.voided_at) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'This receipt is already void.' })
    }
    const settled = await client.query(`SELECT id FROM settlements WHERE customer_id = $1 LIMIT 1`, [customerId])
    if (settled.rowCount > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'This finance is settled. Void is blocked.' })
    }

    const allocs = await client.query(
      `SELECT * FROM receipt_allocations WHERE receipt_no = $1`,
      [receiptNo]
    )
    if (allocs.rowCount > 0) {
      for (const alloc of allocs.rows) {
        const rowRes = await client.query(`SELECT * FROM emi_schedules WHERE id = $1 FOR UPDATE`, [alloc.emi_schedule_id])
        const row = rowRes.rows[0]
        if (!row) continue
        const undo = Number(alloc.amount)
        const newPaid = Math.max(0, Number(row.paid_amount) - undo)
        const newInterest = Math.max(0, Number(row.paid_interest) - Number(alloc.interest || 0))
        const newBalance = Math.max(0, Number(row.amount) - newPaid)
        const status = newPaid <= 0 ? 'pending' : 'partial'
        await client.query(
          `UPDATE emi_schedules SET paid_amount = $1, paid_interest = $2, balance = $3, status = $4 WHERE id = $5`,
          [newPaid, newInterest, newBalance, status, row.id]
        )
      }
    } else {
      let left = Number(receipt.amount)
      const sched = await client.query(
        `SELECT * FROM emi_schedules WHERE customer_id = $1 AND paid_amount > 0 ORDER BY sno DESC FOR UPDATE`,
        [customerId]
      )
      for (const row of sched.rows) {
        if (left <= 0) break
        const undo = Math.min(left, Number(row.paid_amount))
        const interestUndo = Math.min(undo, Number(row.paid_interest || 0))
        const newPaid = Number(row.paid_amount) - undo
        const newInterest = Number(row.paid_interest || 0) - interestUndo
        const newBalance = Math.max(0, Number(row.amount) - newPaid)
        const status = newPaid <= 0 ? 'pending' : 'partial'
        await client.query(
          `UPDATE emi_schedules SET paid_amount = $1, paid_interest = $2, balance = $3, status = $4 WHERE id = $5`,
          [newPaid, newInterest, newBalance, status, row.id]
        )
        left -= undo
      }
    }

    await client.query(
      `UPDATE receipts SET voided_at = NOW(), voided_by = $1 WHERE receipt_no = $2`,
      [req.user?.name || null, receiptNo]
    )

    const bankId = receipt.bank_id
    if (bankId) {
      await client.query(`UPDATE bank_accounts SET balance = balance - $1 WHERE id = $2`, [Number(receipt.total), bankId])
    } else {
      await client.query(
        `UPDATE bank_accounts SET balance = balance - $1
         WHERE id = (SELECT id FROM bank_accounts ORDER BY id LIMIT 1)`,
        [Number(receipt.total)]
      )
    }

    const customer = mapCustomer((await client.query(`SELECT * FROM customers WHERE id = $1`, [customerId])).rows[0])
    const snoRes = await client.query(`SELECT COALESCE(MAX(sno), 0) + 1 AS sno FROM day_report_rows`)
    const today = new Date().toISOString().slice(0, 10)
    await client.query(
      `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt, entry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        Number(snoRes.rows[0].sno), customer.name, `VOID/${receiptNo}`, customer.hpNo,
        'Receipt void', req.user?.name || '', -Number(receipt.total), today,
      ]
    )

    const unpaid = await client.query(
      `SELECT COUNT(*)::int AS n FROM emi_schedules WHERE customer_id = $1 AND status <> 'paid'`,
      [customerId]
    )
    if (Number(unpaid.rows[0].n) > 0) {
      await client.query(
        `UPDATE customers SET closed = 'NO', closed_date = NULL, updated_at = NOW() WHERE id = $1 AND closed = 'YES'`,
        [customerId]
      )
    }

    let ledgerWarning = null
    try {
      await postJournal({
        entryDate: today,
        narration: `Void EMI receipt ${receiptNo} — ${customer.name} (${customer.hpNo})`,
        referenceType: 'RECEIPT_VOID',
        referenceId: String(receiptNo),
        createdBy: req.user?.name || null,
        lines: [
          { accountName: 'HP RECEIVABLES', debit: Number(receipt.amount), credit: 0 },
          ...(Number(receipt.ta) > 0
            ? [{ accountName: "EMI TA's", debit: Number(receipt.ta), credit: 0 }]
            : []),
          { accountName: 'CASH / BANK COLLECTIONS', debit: 0, credit: Number(receipt.total) },
        ],
      }, client)
    } catch (ledgerErr) {
      ledgerWarning = ledgerErr.message
    }

    await writeAudit({
      actor: req.user?.name,
      action: 'void_receipt',
      entity: 'receipt',
      entityId: receiptNo,
      detail: { customerId, total: Number(receipt.total) },
    }, client)
    await refreshAllDerived(client)
    await client.query('COMMIT')
    res.json({ ok: true, receiptNo, voided: true, ledgerWarning })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

export default router
