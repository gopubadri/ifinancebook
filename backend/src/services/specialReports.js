import { query } from '../db.js'
import { getLineReport } from './lineReport.js'
import { calcOdInterest, getSettingsData } from '../utils/settings.js'

const KEYS = new Set([
  'demand-collection',
  'line-demand-collection',
  'cbook-hp',
  'cbook-cnslt',
  'cbook-all',
  'bike-repairs',
  'hl-type2',
  'reminders',
  'non-closed',
  'hp-handloan',
  'deposits-dp',
  'hp-insurance',
  'hp-tax',
  'hp-pollution',
  'hp-rta',
  'consultancy-rta',
  'hp-interest',
  'customer-mobiles',
  'delinquency',
])

let vehicleDatesReady = false

export async function ensureVehicleDates() {
  if (vehicleDatesReady) return
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS insurance_expiry DATE`)
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_expiry DATE`)
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS pollution_expiry DATE`)
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS rta_token_date DATE`)
  await query(`ALTER TABLE bike_purchases ADD COLUMN IF NOT EXISTS rta_token_date DATE`)
  vehicleDatesReady = true
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100
}

function iso(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function monthStart() {
  return todayIso().slice(0, 8) + '01'
}

function col(key, label, type = 'text') {
  return { key, label, type }
}

function withSno(rows) {
  return rows.map((r, i) => ({ sno: i + 1, ...r }))
}

function moneyTotals(rows, pairs) {
  return pairs.map(([key, label]) => ({
    label,
    value: round2(rows.reduce((s, r) => s + Number(r[key] || 0), 0)),
    money: true,
  }))
}

function pack({ title, subtitle, dateMode = 'none', columns, rows, totals = [], extra = {} }) {
  const numbered = withSno(rows)
  return {
    title,
    subtitle: subtitle || '',
    dateMode,
    columns: [col('sno', 'SNo', 'number'), ...columns],
    rows: numbered,
    count: numbered.length,
    totals,
    ...extra,
  }
}

function isValidReg(reg) {
  return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/i.test(String(reg || '').replace(/\s+/g, ''))
}

export async function getSpecialReport(key, queryParams = {}) {
  if (!KEYS.has(key)) return null
  await ensureVehicleDates()

  const asOf = queryParams.asOf || todayIso()
  const from = queryParams.from || monthStart()
  const to = queryParams.to || asOf

  switch (key) {
    case 'demand-collection':
      return demandCollection({ from, to, groupByVillage: false })
    case 'line-demand-collection':
      return demandCollection({ from, to, groupByVillage: true })
    case 'cbook-hp':
      return cbook('hp')
    case 'cbook-cnslt':
      return cbook('cnslt')
    case 'cbook-all':
      return cbook('all')
    case 'bike-repairs':
      return bikeRepairs()
    case 'hl-type2':
      return hlType2()
    case 'reminders':
      return reminders(asOf)
    case 'non-closed':
      return nonClosed(asOf)
    case 'hp-handloan':
      return hpHandloan()
    case 'deposits-dp':
      return depositsDp()
    case 'hp-insurance':
      return vehiclePending('insurance_expiry', 'HP Insurance Pending Report', asOf)
    case 'hp-tax':
      return vehiclePending('tax_expiry', 'HP Tax Pending Report', asOf)
    case 'hp-pollution':
      return vehiclePending('pollution_expiry', 'HP Pollution Report', asOf)
    case 'hp-rta':
      return hpRta(asOf)
    case 'consultancy-rta':
      return consultancyRta(asOf)
    case 'hp-interest':
      return hpInterest()
    case 'customer-mobiles':
      return customerMobiles()
    case 'delinquency':
      return delinquency(asOf)
    default:
      return null
  }
}

async function demandCollection({ from, to, groupByVillage }) {
  const { rows } = await query(
    `SELECT
        c.id, c.hp_no, c.name, c.village, c.emi_amount, c.reg_no,
        COALESCE(SUM(e.balance) FILTER (WHERE e.status <> 'paid' AND e.due_date <= $2::date), 0) AS demand,
        COALESCE((
          SELECT SUM(r.total) FROM receipts r
          WHERE r.customer_id = c.id
            AND r.paid_date >= $1::date AND r.paid_date <= $2::date
        ), 0) AS collected
     FROM customers c
     LEFT JOIN emi_schedules e ON e.customer_id = c.id
     WHERE c.closed = 'NO'
     GROUP BY c.id
     ORDER BY lower(COALESCE(c.village, '')), c.hp_no`,
    [from, to]
  )

  const detail = rows
    .map((r) => {
      const demand = round2(r.demand)
      const collected = round2(r.collected)
      return {
        customerId: r.id,
        hpNo: r.hp_no,
        name: r.name,
        village: r.village || '',
        regNo: r.reg_no || '',
        emiAmount: Number(r.emi_amount || 0),
        demand,
        collected,
        shortfall: round2(Math.max(0, demand - collected)),
        surplus: round2(Math.max(0, collected - demand)),
      }
    })
    .filter((r) => r.demand > 0 || r.collected > 0)

  if (groupByVillage) {
    const map = new Map()
    for (const r of detail) {
      const village = r.village || '(No village)'
      if (!map.has(village)) {
        map.set(village, { village, accounts: 0, demand: 0, collected: 0, shortfall: 0 })
      }
      const g = map.get(village)
      g.accounts += 1
      g.demand += r.demand
      g.collected += r.collected
      g.shortfall += r.shortfall
    }
    const grouped = [...map.values()].map((g) => ({
      ...g,
      demand: round2(g.demand),
      collected: round2(g.collected),
      shortfall: round2(g.shortfall),
    }))
    return pack({
      title: 'Line Demand Collection Report',
      subtitle: `Demand due on or before ${to} vs receipts ${from} to ${to}, by village.`,
      dateMode: 'range',
      extra: { from, to },
      columns: [
        col('village', 'Village'),
        col('accounts', 'HPs', 'number'),
        col('demand', 'Demand', 'money'),
        col('collected', 'Collected', 'money'),
        col('shortfall', 'Shortfall', 'money'),
      ],
      rows: grouped,
      totals: moneyTotals(grouped, [
        ['demand', 'Demand'],
        ['collected', 'Collected'],
        ['shortfall', 'Shortfall'],
      ]),
    })
  }

  return pack({
    title: 'Demand Collection Report',
    subtitle: `Unpaid EMIs due on or before ${to} vs receipts from ${from} to ${to}.`,
    dateMode: 'range',
    extra: { from, to },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('emiAmount', 'EMI', 'money'),
      col('demand', 'Demand', 'money'),
      col('collected', 'Collected', 'money'),
      col('shortfall', 'Shortfall', 'money'),
    ],
    rows: detail,
    totals: moneyTotals(detail, [
      ['demand', 'Demand'],
      ['collected', 'Collected'],
      ['shortfall', 'Shortfall'],
    ]),
  })
}

async function cbook(scope) {
  const hpRows = []
  if (scope === 'hp' || scope === 'all') {
    const { rows } = await query(
      `SELECT id, hp_no, name, village, reg_no, makers_no, model, cb, closed
       FROM customers
       ORDER BY cb ASC, hp_no`
    )
    for (const r of rows) {
      hpRows.push({
        source: 'HP',
        customerId: r.id,
        refNo: r.hp_no,
        hpNo: r.hp_no,
        name: r.name,
        village: r.village || '',
        vehicle: [r.makers_no, r.model].filter(Boolean).join(' '),
        rcNo: r.reg_no || '',
        cbook: r.cb ? 'Received' : 'Pending',
        status: r.closed === 'YES' ? 'closed' : 'open',
      })
    }
  }

  const bikeRows = []
  if (scope === 'cnslt' || scope === 'all') {
    const { rows } = await query(
      `SELECT id, rc_no, makers, model, status, sold_date
       FROM bike_purchases ORDER BY id`
    )
    for (const r of rows) {
      const ok = isValidReg(r.rc_no)
      bikeRows.push({
        source: 'CNSLT',
        customerId: null,
        refNo: r.rc_no,
        hpNo: r.rc_no,
        name: r.makers || 'Consultancy bike',
        village: '',
        vehicle: [r.makers, r.model].filter(Boolean).join(' '),
        rcNo: r.rc_no || '',
        cbook: ok ? 'Received' : 'Pending',
        status: r.status || (r.sold_date ? 'sold' : 'in_stock'),
      })
    }
  }

  const rows = scope === 'hp' ? hpRows : scope === 'cnslt' ? bikeRows : [...hpRows, ...bikeRows]
  const pending = rows.filter((r) => r.cbook === 'Pending').length
  const title = scope === 'hp'
    ? 'C Book Report (HP)'
    : scope === 'cnslt'
      ? 'C Book Report (CNSLT)'
      : 'C Book Report (ALL)'

  return pack({
    title,
    subtitle: 'C-book / RC received vs pending. HP uses the C-Book checkbox; consultancy uses a valid AP registration number.',
    columns: [
      ...(scope === 'all' ? [col('source', 'Book')] : []),
      col('refNo', scope === 'cnslt' ? 'RC No' : 'HP / RC', scope === 'cnslt' ? 'text' : 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('vehicle', 'Vehicle'),
      col('rcNo', 'Reg / RC'),
      col('cbook', 'C-Book'),
      col('status', 'Status'),
    ],
    rows,
    totals: [
      { label: 'Pending C-Book', value: pending },
      { label: 'Received', value: rows.length - pending },
    ],
  })
}

async function bikeRepairs() {
  const { rows } = await query(
    `SELECT id, rc_no, makers, model, purchase_date, purchase_amount, repair_cost,
            selling_price, status, sold_date, notes
     FROM bike_purchases
     WHERE COALESCE(repair_cost, 0) > 0
     ORDER BY purchase_date DESC NULLS LAST, id DESC`
  )
  const items = rows.map((r) => ({
    rcNo: r.rc_no,
    makers: r.makers || '',
    model: r.model || '',
    purchaseDate: iso(r.purchase_date),
    purchaseAmount: Number(r.purchase_amount || 0),
    repairCost: Number(r.repair_cost || 0),
    sellingPrice: Number(r.selling_price || 0),
    status: r.status || '',
    notes: r.notes || '',
  }))
  return pack({
    title: 'Bike Repairs Report',
    subtitle: 'Consultancy bikes with a repair cost greater than zero.',
    columns: [
      col('rcNo', 'RC No'),
      col('makers', 'Vehicle'),
      col('model', 'Model'),
      col('purchaseDate', 'Purchase'),
      col('purchaseAmount', 'Purchase Amt', 'money'),
      col('repairCost', 'Repair', 'money'),
      col('sellingPrice', 'Selling', 'money'),
      col('status', 'Status'),
    ],
    rows: items,
    totals: moneyTotals(items, [
      ['purchaseAmount', 'Purchase'],
      ['repairCost', 'Repairs'],
    ]),
  })
}

async function hlType2() {
  const { rows } = await query(
    `SELECT id, name, village, balance, interest_rate, issued_date, customer_id, notes
     FROM handloan_accounts
     WHERE loan_type = '2'
     ORDER BY issued_date DESC NULLS LAST, id`
  )
  const items = rows.map((r) => ({
    customerId: r.customer_id,
    name: r.name,
    village: r.village || '',
    issuedDate: iso(r.issued_date),
    interestRate: Number(r.interest_rate || 0),
    balance: Number(r.balance || 0),
    notes: r.notes || '',
  }))
  return pack({
    title: 'HL Type 2 Collection Report',
    subtitle: 'Type-2 handloan books. Outstanding is the current balance (repayments are not posted yet).',
    columns: [
      col('name', 'Name'),
      col('village', 'Village'),
      col('issuedDate', 'Issued'),
      col('interestRate', 'Int. %', 'number'),
      col('balance', 'Outstanding', 'money'),
      col('notes', 'Notes'),
    ],
    rows: items,
    totals: moneyTotals(items, [['balance', 'Outstanding']]),
  })
}

async function reminders(asOf) {
  const { rows } = await query(
    `SELECT r.id, r.remind_date, r.message, r.status, r.created_by,
            c.id AS customer_id, c.hp_no, c.name, c.village, c.mobile
     FROM customer_reminders r
     JOIN customers c ON c.id = r.customer_id
     ORDER BY r.remind_date, r.id`
  )
  const items = rows.map((r) => ({
    customerId: r.customer_id,
    hpNo: r.hp_no,
    name: r.name,
    village: r.village || '',
    mobile: r.mobile || '',
    remindDate: iso(r.remind_date),
    message: r.message || '',
    status: r.status,
    due: iso(r.remind_date) <= asOf && r.status === 'pending' ? 'Due' : r.status,
    createdBy: r.created_by || '',
  }))
  return pack({
    title: 'Reminders',
    subtitle: `All HP reminders. “Due” means pending on or before ${asOf}.`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('mobile', 'Mobile'),
      col('remindDate', 'Remind Date'),
      col('message', 'Message'),
      col('due', 'Status'),
    ],
    rows: items,
    totals: [
      { label: 'Pending', value: items.filter((r) => r.status === 'pending').length },
      { label: 'Due', value: items.filter((r) => r.due === 'Due').length },
    ],
  })
}

async function nonClosed(asOf) {
  const line = await getLineReport({ view: 'all', asOf })
  return pack({
    title: 'Non Closed Report',
    subtitle: `Open (not closed) HP accounts as of ${asOf}.`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('mobile', 'Mobile'),
      col('emiAmount', 'EMI', 'money'),
      col('outstanding', 'Outstanding', 'money'),
      col('nextDue', 'Next Due'),
      col('status', 'Status'),
    ],
    rows: line.rows.map((r) => ({
      customerId: r.id,
      hpNo: r.hpNo,
      name: r.name,
      village: r.village,
      mobile: r.mobile,
      emiAmount: r.emiAmount,
      outstanding: r.outstanding,
      nextDue: r.nextDue,
      status: r.status,
    })),
    totals: [
      { label: 'Outstanding', value: line.outstanding, money: true },
      { label: 'Demand', value: line.demand, money: true },
    ],
  })
}

async function hpHandloan() {
  const { rows } = await query(
    `SELECT h.id, h.loan_amount, h.interest_rate, h.issued_date, h.balance, h.status, h.notes,
            c.id AS customer_id, c.hp_no, c.name, c.village, c.mobile
     FROM customer_handloans h
     JOIN customers c ON c.id = h.customer_id
     ORDER BY h.issued_date DESC, h.id DESC`
  )
  const items = rows.map((r) => ({
    customerId: r.customer_id,
    hpNo: r.hp_no,
    name: r.name,
    village: r.village || '',
    mobile: r.mobile || '',
    issuedDate: iso(r.issued_date),
    loanAmount: Number(r.loan_amount || 0),
    interestRate: Number(r.interest_rate || 0),
    balance: Number(r.balance || 0),
    status: r.status,
    notes: r.notes || '',
  }))
  return pack({
    title: 'HP Handloan Report',
    subtitle: 'Handloans issued against HP accounts.',
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('issuedDate', 'Issued'),
      col('loanAmount', 'Issued Amt', 'money'),
      col('interestRate', 'Int. %', 'number'),
      col('balance', 'Balance', 'money'),
      col('status', 'Status'),
    ],
    rows: items,
    totals: moneyTotals(items, [
      ['loanAmount', 'Issued'],
      ['balance', 'Balance'],
    ]),
  })
}

async function depositsDp() {
  const { rows } = await query(
    `SELECT id, name, village, balance, created_at
     FROM deposit_accounts
     WHERE deposit_type = 'dp'
     ORDER BY name`
  )
  const items = rows.map((r) => ({
    name: r.name,
    village: r.village || '',
    balance: Number(r.balance || 0),
    created: iso(r.created_at),
  }))
  return pack({
    title: 'Deposits Report (DP)',
    subtitle: 'DP (deposit-principal) accounts. Add them under Deposits (DP).',
    columns: [
      col('name', 'Name'),
      col('village', 'Village'),
      col('balance', 'Balance', 'money'),
      col('created', 'Opened'),
    ],
    rows: items,
    totals: moneyTotals(items, [['balance', 'Balance']]),
  })
}

async function vehiclePending(column, title, asOf) {
  const { rows } = await query(
    `SELECT id, hp_no, name, village, mobile, reg_no, makers_no, model,
            insurance_expiry, tax_expiry, pollution_expiry, rta_token_date
     FROM customers
     WHERE closed = 'NO'
       AND (${column} IS NULL OR ${column} < $1::date)
     ORDER BY ${column} NULLS FIRST, hp_no`,
    [asOf]
  )
  const field = column === 'insurance_expiry'
    ? 'insuranceExpiry'
    : column === 'tax_expiry'
      ? 'taxExpiry'
      : 'pollutionExpiry'
  const items = rows.map((r) => ({
    customerId: r.id,
    hpNo: r.hp_no,
    name: r.name,
    village: r.village || '',
    mobile: r.mobile || '',
    regNo: r.reg_no || '',
    vehicle: [r.makers_no, r.model].filter(Boolean).join(' '),
    expiry: iso(r[column]),
    reason: r[column] ? 'Expired' : 'Not entered',
    insuranceExpiry: iso(r.insurance_expiry),
    taxExpiry: iso(r.tax_expiry),
    pollutionExpiry: iso(r.pollution_expiry),
  }))
  return pack({
    title,
    subtitle: `Open HPs with a missing or expired ${field.replace('Expiry', '')} date as of ${asOf}. Set dates on the customer overview.`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('regNo', 'Reg No'),
      col('vehicle', 'Vehicle'),
      col('expiry', 'Expiry'),
      col('reason', 'Reason'),
    ],
    rows: items,
  })
}

async function hpRta(asOf) {
  const { rows } = await query(
    `SELECT id, hp_no, name, village, mobile, reg_no, makers_no, rta_token_date, closed
     FROM customers
     WHERE closed = 'NO'
     ORDER BY hp_no`
  )
  const items = rows.map((r) => {
    const valid = isValidReg(r.reg_no)
    const token = iso(r.rta_token_date)
    const pending = !valid && !token
    return {
      customerId: r.id,
      hpNo: r.hp_no,
      name: r.name,
      village: r.village || '',
      mobile: r.mobile || '',
      regNo: r.reg_no || '',
      vehicle: r.makers_no || '',
      tokenDate: token,
      reason: pending ? 'RC / token pending' : (valid ? 'RC received' : 'Token dated'),
      pending,
    }
  })

  const tokens = await query(
    `SELECT id FROM generic_module_rows WHERE module_key = 'rta'`
  ).catch(() => ({ rows: [] }))

  return pack({
    title: 'HP RTA Token Report',
    subtitle: `Open HPs. Pending = no valid AP registration and no RTA token date (as of ${asOf}). RTA module has ${tokens.rows.length} token row(s).`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('regNo', 'Reg No'),
      col('tokenDate', 'Token Date'),
      col('reason', 'Reason'),
    ],
    rows: items,
    totals: [
      { label: 'Pending', value: items.filter((r) => r.pending).length },
      { label: 'Done', value: items.filter((r) => !r.pending).length },
    ],
  })
}

async function consultancyRta(asOf) {
  const { rows } = await query(
    `SELECT id, rc_no, makers, model, purchase_date, status, rta_token_date
     FROM bike_purchases
     ORDER BY id`
  )
  const items = rows.map((r) => {
    const valid = isValidReg(r.rc_no)
    const token = iso(r.rta_token_date)
    const pending = !valid && !token
    return {
      rcNo: r.rc_no || '',
      makers: r.makers || '',
      model: r.model || '',
      purchaseDate: iso(r.purchase_date),
      status: r.status || '',
      tokenDate: token,
      reason: pending ? 'RC pending' : (valid ? 'RC received' : 'Token dated'),
      pending,
    }
  })

  return pack({
    title: 'Consultancy RTA Token Report',
    subtitle: `Consultancy stock. Pending = no valid RC and no RTA token date (as of ${asOf}).`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('rcNo', 'RC No'),
      col('makers', 'Vehicle'),
      col('model', 'Model'),
      col('purchaseDate', 'Purchase'),
      col('status', 'Status'),
      col('tokenDate', 'Token Date'),
      col('reason', 'Reason'),
    ],
    rows: items,
    totals: [
      { label: 'Pending', value: items.filter((r) => r.pending).length },
      { label: 'Done', value: items.filter((r) => !r.pending).length },
    ],
  })
}

async function hpInterest() {
  const { rows } = await query(
    `SELECT c.id, c.hp_no, c.name, c.village, c.closed,
            COALESCE(SUM(e.interest_component), 0) AS billed,
            COALESCE(SUM(e.paid_interest), 0) AS paid,
            COALESCE(SUM(e.interest_component - e.paid_interest), 0) AS pending
     FROM customers c
     LEFT JOIN emi_schedules e ON e.customer_id = c.id
     GROUP BY c.id
     ORDER BY c.hp_no`
  )
  const items = rows.map((r) => ({
    customerId: r.id,
    hpNo: r.hp_no,
    name: r.name,
    village: r.village || '',
    billed: round2(r.billed),
    paid: round2(r.paid),
    pending: round2(r.pending),
    status: r.closed === 'YES' ? 'closed' : 'open',
  }))
  return pack({
    title: 'HP Interest Report',
    subtitle: 'Finance interest built into the EMI schedule versus interest marked paid on EMI rows.',
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('billed', 'Interest Billed', 'money'),
      col('paid', 'Interest Paid', 'money'),
      col('pending', 'Interest Pending', 'money'),
      col('status', 'Status'),
    ],
    rows: items,
    totals: moneyTotals(items, [
      ['billed', 'Billed'],
      ['paid', 'Paid'],
      ['pending', 'Pending'],
    ]),
  })
}

async function customerMobiles() {
  const { rows } = await query(
    `SELECT id, hp_no, name, village, mobile, alternate_mobile, closed
     FROM customers
     ORDER BY name`
  )
  const items = rows.map((r) => ({
    customerId: r.id,
    hpNo: r.hp_no,
    name: r.name,
    village: r.village || '',
    mobile: r.mobile || '',
    alternateMobile: r.alternate_mobile || '',
    status: r.closed === 'YES' ? 'closed' : 'open',
  }))
  return pack({
    title: "Customer's Mobiles",
    subtitle: 'Contact list for all HP accounts.',
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('mobile', 'Mobile'),
      col('alternateMobile', 'Alternate'),
      col('status', 'Status'),
    ],
    rows: items,
    totals: [
      { label: 'With mobile', value: items.filter((r) => r.mobile).length },
      { label: 'Missing mobile', value: items.filter((r) => !r.mobile).length },
    ],
  })
}

async function delinquency(asOf) {
  const settings = await getSettingsData()
  const odRate = Number(settings.odInterest ?? 0.1)
  const { rows } = await query(
    `SELECT c.id, c.hp_no, c.name, c.village, c.emi_amount,
            MIN(e.due_date) FILTER (WHERE e.status <> 'paid') AS oldest_due,
            COALESCE(SUM(e.balance) FILTER (WHERE e.status <> 'paid' AND e.due_date < $1::date), 0) AS overdue
     FROM customers c
     LEFT JOIN emi_schedules e ON e.customer_id = c.id
     WHERE c.closed = 'NO'
     GROUP BY c.id
     ORDER BY oldest_due NULLS LAST, c.hp_no`,
    [asOf]
  )

  function bucketOf(days) {
    if (days <= 0) return 'Current'
    if (days <= 30) return '1-30'
    if (days <= 60) return '31-60'
    if (days <= 90) return '61-90'
    if (days <= 180) return '91-180'
    return '180+'
  }

  const items = rows.map((r) => {
    const overdue = round2(r.overdue)
    const oldestDue = iso(r.oldest_due)
    const od = oldestDue && overdue > 0 ? calcOdInterest(overdue, oldestDue, odRate) : { days: 0, interest: 0 }
    return {
      customerId: r.id,
      hpNo: r.hp_no,
      name: r.name,
      village: r.village || '',
      emiAmount: Number(r.emi_amount || 0),
      oldestDue,
      daysOverdue: od.days,
      overdue,
      odInterest: od.interest,
      bucket: bucketOf(od.days),
    }
  })

  const order = ['Current', '1-30', '31-60', '61-90', '91-180', '180+']
  const summary = order.map((bucket) => {
    const part = items.filter((r) => r.bucket === bucket)
    return {
      label: bucket,
      value: `${part.length} HP · ₹${round2(part.reduce((s, r) => s + r.overdue, 0)).toLocaleString('en-IN')}`,
    }
  })

  return pack({
    title: 'Delinquency Bucket Report',
    subtitle: `Open HPs grouped by days overdue as of ${asOf}.`,
    dateMode: 'asOf',
    extra: { asOf },
    columns: [
      col('hpNo', 'HP No', 'hpLink'),
      col('name', 'Name'),
      col('village', 'Village'),
      col('bucket', 'Bucket'),
      col('daysOverdue', 'Days', 'number'),
      col('oldestDue', 'Oldest Due'),
      col('overdue', 'Overdue', 'money'),
      col('odInterest', 'OD Int.', 'money'),
    ],
    rows: items.sort((a, b) => b.daysOverdue - a.daysOverdue || String(a.hpNo).localeCompare(String(b.hpNo))),
    totals: [
      ...summary,
      { label: 'Overdue principal', value: round2(items.reduce((s, r) => s + r.overdue, 0)), money: true },
    ],
  })
}
