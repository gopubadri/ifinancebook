import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { pool } from '../src/db.js'

dotenv.config()

const customers = [
  { id: 4817, hpNo: 'TYRE0025', name: 'GOLLAPALLI JEEVA', mobile: '9948693719', regNo: '825-20 FIFTY PLAS R / TR', village: 'TADEPALLIGUDEM', emiPeriod: 6, emiAmount: 8213, makersNo: 'MRF', model: '2026', chasisNo: 'ASDF', engNo: 'ASDF', cb: false, clrDate: '2026-06-29', emiDate: '2026-08-05', seized: 'NO', closed: 'NO' },
  { id: 4818, hpNo: 'FCSAFTPG0049', name: 'NEKKALAPUDI MOHAN NAGA AN', mobile: '9948412510', regNo: 'TR', village: 'CHEBROLU', emiPeriod: 12, emiAmount: 6533, makersNo: 'HERO', model: '2025', chasisNo: 'HRZX21', engNo: 'ENGX21', cb: true, clrDate: '2026-05-11', emiDate: '2026-06-15', seized: 'NO', closed: 'NO' },
  { id: 4819, hpNo: 'SAFNDD0386', name: 'TRIPURARI NISSI KUMARI', mobile: '9705256995', regNo: 'AP40CS4173', village: 'BUTTAYAGUDEM', emiPeriod: 18, emiAmount: 3362, makersNo: 'BAJAJ', model: '2024', chasisNo: 'BJX9182', engNo: 'ENGB918', cb: true, clrDate: '2026-01-02', emiDate: '2026-02-05', seized: 'NO', closed: 'NO' },
  { id: 4820, hpNo: 'SAFTNK0421', name: 'K VENKATA RAMANA', mobile: '9866123450', regNo: 'AP37BT2201', village: 'TANUKU', emiPeriod: 12, emiAmount: 5100, makersNo: 'TVS', model: '2023', chasisNo: 'TVX7712', engNo: 'ENGT771', cb: false, clrDate: '2025-11-20', emiDate: '2025-12-05', seized: 'YES', closed: 'NO' },
  { id: 4821, hpNo: 'SAFNDD0512', name: 'P SATYAVATHI', mobile: '9963321440', regNo: 'AP05Q9981', village: 'ELURU', emiPeriod: 6, emiAmount: 9020, makersNo: 'HONDA', model: '2026', chasisNo: 'HDX5541', engNo: 'ENGH554', cb: true, clrDate: '2026-04-14', emiDate: '2026-05-01', seized: 'NO', closed: 'YES' },
  { id: 4822, hpNo: 'FCSAFTPG0091', name: 'D RAMESH BABU', mobile: '9848002211', regNo: 'AP39NF0499', village: 'NIDADAVOLU', emiPeriod: 24, emiAmount: 2890, makersNo: 'MRF', model: '2022', chasisNo: 'MRX3321', engNo: 'ENGM332', cb: false, clrDate: '2025-08-09', emiDate: '2025-09-05', seized: 'NO', closed: 'NO' },
]

const bikePurchases = [
  { id: 202, rcNo: 'AP39NF0499', makers: 'HONDA ACTIVA 125', model: '2022', purchaseDate: '2026-06-19', purchaseAmount: 45000, repairCost: 2800, sellingPrice: 0 },
  { id: 203, rcNo: 'AP39DC2190', makers: 'ACTIVA 5G', model: '2019', purchaseDate: '2026-06-26', purchaseAmount: 27000, repairCost: 11000, sellingPrice: 48000 },
  { id: 204, rcNo: 'AP37BF7712', makers: 'TVS JUPITER', model: '2020', purchaseDate: '2026-07-02', purchaseAmount: 32000, repairCost: 4500, sellingPrice: 0 },
]

const genericModules = {
  'handloans-new': { title: 'HandLoans', columns: ['name', 'village', 'balance'], rows: [
    { name: 'M SRINIVASA RAO', village: 'TANUKU', balance: 12500 },
    { name: 'K LAKSHMI', village: 'ELURU', balance: 0 },
  ] },
  'hand-loans': { title: 'Hand Loans Type 2', columns: ['name', 'village', 'balance'], rows: [
    { name: 'B ANJANEYULU', village: 'NIDADAVOLU', balance: 6200 },
  ] },
  capitals: { title: 'Capitals', columns: ['name', 'village', 'balance'], rows: [
    { name: 'CHANDU CHILUKURI', village: 'TADEPALLIGUDEM', balance: 1500000 },
    { name: 'SRI ADITYA PARTNERS', village: 'TADEPALLIGUDEM', balance: 850000 },
  ] },
  deposits: { title: 'Deposits', columns: ['name', 'village', 'balance'], rows: [
    { name: 'G RAMA DEVI', village: 'CHEBROLU', balance: 40000 },
  ] },
  'deposits-dp-new': { title: 'Deposits (DP) New', columns: ['name', 'village', 'balance'], rows: [] },
  cheques: { title: 'Cheques', columns: ['cheque', 'description', 'date', 'amount', 'status'], rows: [
    { cheque: '004821', description: 'Vendor settlement', date: '2026-06-11', amount: 22000, status: 'cleared' },
    { cheque: '004822', description: 'Repair advance', date: '2026-07-01', amount: 4500, status: 'pending' },
  ] },
  'banks-new': { title: 'Bank', columns: ['name', 'balance'], rows: [
    { name: 'SBI - TADEPALLIGUDEM', balance: 4118408 },
    { name: 'GPay Collections', balance: 32100 },
    { name: 'PhonePe Collections', balance: 18650 },
  ] },
  'chits-new': { title: 'Chits', columns: ['name', 'balance'], rows: [
    { name: 'CHIT GROUP - A (20 Lakh)', balance: 620000 },
  ] },
  'loans-new': { title: 'Loans', columns: ['name', 'village', 'mobile'], rows: [
    { name: 'P VENKATESH', village: 'TANUKU', mobile: '9963321440' },
  ] },
  'credit-transactions-new': { title: 'Credit Transactions', columns: ['name', 'village', 'balance'], rows: [] },
  'investments-new': { title: 'Investments', columns: ['name', 'village', 'balance'], rows: [
    { name: 'FIXED DEPOSIT - SBI', village: '-', balance: 1200000 },
  ] },
  'assets-new': { title: 'Assets', columns: ['name', 'village', 'balance'], rows: [
    { name: 'OFFICE BUILDING', village: 'TADEPALLIGUDEM', balance: 3200000 },
    { name: 'TWO-WHEELER (OFFICE)', village: 'TADEPALLIGUDEM', balance: 65000 },
  ] },
  'income-expenses-new': { title: 'Inc & Exp Accounts', columns: ['name', 'balance'], rows: [
    { name: 'PROFIT OR LOSS', balance: 25054331 },
    { name: 'COMMISSIONS', balance: 0 },
    { name: 'SALARIES', balance: 0 },
    { name: 'RENTALS', balance: 0 },
  ] },
  journels: { title: 'Journels', columns: ['name', 'village', 'balance'], rows: [] },
  'income-expense-transactions': { title: 'Income & Expense', columns: ['amount', 'type', 'paidDate', 'account', 'description'], rows: [
    { amount: 15000, type: 'Expense', paidDate: '2026-07-01', account: 'RENTALS', description: 'Office rent - July' },
    { amount: 500, type: 'Income', paidDate: '2026-07-06', account: 'AGREEMENTS', description: 'New agreement fee' },
  ] },
  rta: { title: 'RTA', columns: ['customer', 'hpNo', 'agent', 'bikeBrand'], rows: [
    { customer: 'GOLLAPALLI JEEVA', hpNo: 'TYRE0025', agent: 'RAJA', bikeBrand: 'MRF' },
  ] },
  'all-accounts': { title: 'All Accounts', columns: ['name', 'village', 'mobile', 'accountType'], rows: [
    { name: 'PROFIT OR LOSS', village: 'NIL', mobile: '0000000000', accountType: 'PROFIT & EXPENSES' },
    { name: 'STATE BANK OF INDIA', village: 'TADEPALLIGUDEM', mobile: '0000000000', accountType: 'BANKS' },
  ] },
  masters: { title: 'Masters', columns: ['name'], rows: [
    { name: 'ASSETS' }, { name: 'LIABILITIES' },
  ] },
  'sub-masters': { title: 'Sub Masters', columns: ['name'], rows: [
    { name: 'CAPITAL' }, { name: 'UNSECURED LOANS' }, { name: 'BANKS' }, { name: 'CHITS' },
    { name: 'LOANS' }, { name: 'SUNDRY DEBTORS' }, { name: 'SUNDRY CREDITORS' }, { name: 'DEPOSITS DP' },
    { name: 'ASSETS' }, { name: 'PROFIT & EXPENSES' }, { name: 'HANDLOANS' }, { name: 'OTHER' },
  ] },
  routes: { title: 'Lines (Routes)', columns: ['name'], rows: [
    { name: 'VENKATESWARAO' }, { name: 'SWARNA' }, { name: 'SURYA' }, { name: 'SUBBU' }, { name: 'MOHAN' },
  ] },
  'branch-points': { title: 'Branch Points', columns: ['name', 'village'], rows: [
    { name: 'TADEPALLIGUDEM MAIN', village: 'TADEPALLIGUDEM' },
  ] },
  agents: { title: 'Agents', columns: ['name', 'date', 'description'], rows: [
    { name: 'RAJA', date: '13-03-2025', description: 'Field collection - Tanuku route' },
  ] },
  'bike-types': { title: 'Bike Types', columns: ['name'], rows: [
    { name: 'ACTIVA' }, { name: 'PULSAR' }, { name: 'JUPITER' }, { name: 'SPLENDOR' },
  ] },
  branches: { title: 'Branches', columns: ['name', 'village'], rows: [
    { name: 'HEAD OFFICE', village: 'TADEPALLIGUDEM' }, { name: 'ELURU BRANCH', village: 'ELURU' },
  ] },
  blacklist: { title: 'Blacklist', columns: ['name', 'mobile', 'village'], rows: [
    { name: 'K RAVI KUMAR', mobile: '9000011122', village: 'TANUKU' },
  ] },
}

const reportMenu = {
  finance: [
    'Line Report', 'Line Report Print', 'Line Report(HP)', 'Line Report(Demand)', 'Line Report Print(Demand)',
    'Demand Collection Report', 'Line Demand Collection Report', 'Line Report Print(XL)', 'Line Report Print(S)',
    'Line Report Print(XL)(S)', 'Line Report (AC)', 'Line Report Print (AC)', 'Line Report Print (AC)(S)',
    'Line Report(SPL)', 'Line Report Print(SPL)', 'Line Report Print(SPL)(S)', 'Line Report Print(Zero)',
    'Line Report Print(Zero)(S)', 'Line Report Print(Today)', 'Line Report Print(Today)(S)', 'C Book Report(HP)',
    'C Book Report(CNSLT)', 'Vehicles Report', 'Bike Purchases Report', 'Bike Repairs Report', 'Collection Report',
    'HL Type 2 Collection Report', 'OD Report', 'Reminders', 'Non Closed Report', 'Handloan Report',
    'Hp Handloan Report', 'Deposits Report', 'Deposits Report(DP)', 'capitals Report', 'Closed HP Report',
    'Seized HP Report', 'HP Insurance Pending Report', 'HP Tax Pending Report', 'HP Pollution Report',
    'HP RTA Token Report', 'Consultancy RTA Token Report', 'HP Interest Report', 'C Book Report(ALL)',
    "Customer's Mobiles", 'Delinquency Bucket Report',
  ],
  financeType2: [
    'Line Report 2', 'Line Report Print 2', 'Line Report(HP) 2', 'Line Report Print(S) 2', 'Line Report (AC) 2',
    'Line Report Print (AC) 2', 'Line Report Print (AC)(S) 2', 'Line Report Print(XL) 2', 'Line Report Print(XL)(S) 2',
    'Line Report Print(Zero) 2', 'Line Report Print(Zero)(S) 2', 'Line Report Print(Today) 2', 'Line Report Print(Today)(S) 2',
  ],
  accounts: [
    'Day Report', 'Multi Day Report', 'Ledgers Balance Report', 'Trading Account', 'Monthly P&L Report',
    'P&L Report (Trail Preview)', 'P&L Report(Final)', 'Trail Balance Sheet', 'Balance Sheet',
  ],
}

const balanceSheet = {
  liabilities: [
    ['CAPITAL', 0], ['DEPOSITS DP', 0], ['LOANS', 0], ['SUNDRY CREDITORS', 0], ['UNSECURED LOANS', 0],
    ['INTEREST RECEIVABLE', 15133629], ['RTA', 0], ['CASH IN HAND', 4118408], ['PROFIT', 25054331],
    ['GST Payable', 0], ['Difference', 29121196],
  ],
  assets: [
    ['ASSETS', 0], ['BANKS', 0], ['CHITS', 0], ['HANDLOANS', 0], ['OTHER', 0], ['SUNDRY DEBTORS', 0],
    ['HP OUTSTANDING', 73000000], ['CONSULTANCY STOCK', 0], ['Product Stock', 0],
  ],
}

const pnl = {
  income: [
    ['RECEIVED INTEREST', 23141365], ['AGREEMENTS', 23], ["OD'S", 9], ["EMI TA's", 1912934],
    ['RTA', 0], ['Consultancy', 0], ['SALE PROFIT', 0],
  ],
  expenses: [
    ['HL RECEIVED INTEREST', 0], ['CAPITALS INTEREST', 0], ['DEPOSITS INTEREST', 0],
  ],
}

const dayReportRows = [
  { sno: 1, name: 'OPENING BALANCE', rcNo: '----', hp: '----', desc: '----', createdBy: '', receiptAmt: 4769695 },
  { sno: 2, name: 'GUNTU SRINU', rcNo: '00/4770135', hp: 'SAFNDD0135', desc: 'EMI - AP04AD4966', createdBy: 'RAJA', receiptAmt: 7800 },
  { sno: 3, name: 'K VENKATA RAMANA', rcNo: '00/4770136', hp: 'SAFTNK0421', desc: 'EMI - AP37BT2201', createdBy: 'DURGA', receiptAmt: 5100 },
  { sno: 4, name: 'P SATYAVATHI', rcNo: '00/4770137', hp: 'SAFNDD0512', desc: 'EMI - AP05Q9981', createdBy: 'RAJA', receiptAmt: 9020 },
]

const settingsData = {
  emiFrequency: 'NO',
  dayScrollProtect: 'NO',
  autoDate: 'YES',
  outPaymentInterest: 0,
  odInterest: 0.1,
  settlementInterest: 0,
  consultancyInterest: 18,
  handloanType: 'Type 1',
  emiReportCbClr: 'No',
  hpRcptSeries: '00',
  hphlRcptSeries: '00',
  hpopRcptSeries: '00',
  hpOdRcptSeries: '00',
  hlRcptSeries: 'HL',
  hpOpDueDate: 'YES',
  messagesCount: 31383,
  city: 'TADEPALLIGUDEM',
  street: 'TANUKU ROAD',
  mobile: '9014596648',
  alternateMobile: '9346912432',
  state: 'Andhra Pradesh',
  bankAccNo: '62447611080',
  bankName: 'STATE BANK OF INDIA',
  ifscCode: 'SBIN0020342',
  branchName: 'TADEPALLIGUDEM',
}

function buildEmiSchedule(customer) {
  const rows = []
  let cumulative = 0
  const principal = customer.emiAmount * customer.emiPeriod * 0.85
  const interestPerEmi = Math.round(((principal * 0.01 * customer.emiPeriod) / customer.emiPeriod) * 100) / 100
  const start = new Date(customer.emiDate)
  for (let i = 0; i < customer.emiPeriod; i++) {
    const due = new Date(start)
    due.setMonth(start.getMonth() + i)
    cumulative += customer.emiAmount
    rows.push({
      sno: i + 1,
      dueDate: due.toISOString().slice(0, 10),
      amount: customer.emiAmount,
      interestComponent: interestPerEmi,
      paidInterest: 0,
      paidAmount: 0,
      balance: customer.emiAmount,
      cumulativeBalance: cumulative,
      status: 'pending',
    })
  }
  return rows
}

async function clearAll(client) {
  await client.query(`
    TRUNCATE
      receipts, emi_schedules, out_payments, customers,
      staff_users, auth_users, bike_purchases,
      generic_module_rows, generic_modules, report_menu,
      ledger_lines, day_report_rows, chart_hps,
      chart_financed, chart_collection, settings, dashboard_stats
    RESTART IDENTITY CASCADE
  `)
}

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await clearAll(client)

    const passwordHash = await bcrypt.hash('demo123', 10)
    const authUsers = [
      { username: 'admin', name: 'RAJA', role: 'ADMIN' },
      { username: 'clerk', name: 'DURGA', role: 'CLERK' },
      { username: 'line', name: 'KISHORE', role: 'LINE EXECUTIVE' },
    ]
    for (const u of authUsers) {
      await client.query(
        `INSERT INTO auth_users (username, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        [u.username, passwordHash, u.name, u.role]
      )
    }

    for (const c of customers) {
      await client.query(
        `INSERT INTO customers (
          id, hp_no, name, mobile, reg_no, village, emi_period, emi_amount,
          makers_no, model, chasis_no, eng_no, cb, clr_date, emi_date, seized, closed
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          c.id, c.hpNo, c.name, c.mobile, c.regNo, c.village, c.emiPeriod, c.emiAmount,
          c.makersNo, c.model, c.chasisNo, c.engNo, c.cb, c.clrDate, c.emiDate, c.seized, c.closed,
        ]
      )

      for (const row of buildEmiSchedule(c)) {
        await client.query(
          `INSERT INTO emi_schedules (
            customer_id, sno, due_date, amount, interest_component,
            paid_interest, paid_amount, balance, cumulative_balance, status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            c.id, row.sno, row.dueDate, row.amount, row.interestComponent,
            row.paidInterest, row.paidAmount, row.balance, row.cumulativeBalance, row.status,
          ]
        )
      }
    }

    await client.query(
      `INSERT INTO out_payments (customer_id, sno, amount, paid_date, interest, paid_amount, status)
       VALUES (4818, 1, 4000, '2026-06-02', 2.5, 4000, 'paid')`
    )

    for (const b of bikePurchases) {
      await client.query(
        `INSERT INTO bike_purchases (
          id, rc_no, makers, model, purchase_date, purchase_amount, repair_cost, selling_price
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [b.id, b.rcNo, b.makers, b.model, b.purchaseDate, b.purchaseAmount, b.repairCost, b.sellingPrice]
      )
    }

    for (const [key, mod] of Object.entries(genericModules)) {
      await client.query(
        `INSERT INTO generic_modules (module_key, title, columns) VALUES ($1,$2,$3::jsonb)`,
        [key, mod.title, JSON.stringify(mod.columns)]
      )
      for (const row of mod.rows) {
        await client.query(
          `INSERT INTO generic_module_rows (module_key, row_data) VALUES ($1,$2::jsonb)`,
          [key, JSON.stringify(row)]
        )
      }
    }

    for (const [category, labels] of Object.entries(reportMenu)) {
      for (const label of labels) {
        await client.query(
          `INSERT INTO report_menu (category, label) VALUES ($1,$2)`,
          [category, label]
        )
      }
    }

    let order = 0
    for (const [label, amount] of balanceSheet.liabilities) {
      await client.query(
        `INSERT INTO ledger_lines (statement, side, label, amount, sort_order) VALUES ('balance_sheet','liabilities',$1,$2,$3)`,
        [label, amount, order++]
      )
    }
    order = 0
    for (const [label, amount] of balanceSheet.assets) {
      await client.query(
        `INSERT INTO ledger_lines (statement, side, label, amount, sort_order) VALUES ('balance_sheet','assets',$1,$2,$3)`,
        [label, amount, order++]
      )
    }
    order = 0
    for (const [label, amount] of pnl.income) {
      await client.query(
        `INSERT INTO ledger_lines (statement, side, label, amount, sort_order) VALUES ('pnl','income',$1,$2,$3)`,
        [label, amount, order++]
      )
    }
    order = 0
    for (const [label, amount] of pnl.expenses) {
      await client.query(
        `INSERT INTO ledger_lines (statement, side, label, amount, sort_order) VALUES ('pnl','expenses',$1,$2,$3)`,
        [label, amount, order++]
      )
    }

    for (const r of dayReportRows) {
      await client.query(
        `INSERT INTO day_report_rows (sno, name, rc_no, hp, description, created_by, receipt_amt)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.sno, r.name, r.rcNo, r.hp, r.desc, r.createdBy, r.receiptAmt]
      )
    }

    for (const row of [{ name: 'Open', value: 1362 }, { name: 'Closed', value: 14 }]) {
      await client.query(`INSERT INTO chart_hps (name, value) VALUES ($1,$2)`, [row.name, row.value])
    }
    for (const row of [
      { month: 'Feb', amount: 4200000 }, { month: 'Mar', amount: 4600000 }, { month: 'Apr', amount: 5100000 },
      { month: 'May', amount: 4950000 }, { month: 'Jun', amount: 5320000 }, { month: 'Jul', amount: 5800000 },
    ]) {
      await client.query(`INSERT INTO chart_financed (month, amount) VALUES ($1,$2)`, [row.month, row.amount])
    }
    for (const row of [
      { month: 'Feb', collected: 480000 }, { month: 'Mar', collected: 512000 }, { month: 'Apr', collected: 498000 },
      { month: 'May', collected: 540000 }, { month: 'Jun', collected: 552000 }, { month: 'Jul', collected: 565205 },
    ]) {
      await client.query(`INSERT INTO chart_collection (month, collected) VALUES ($1,$2)`, [row.month, row.collected])
    }

    await client.query(
      `INSERT INTO settings (id, data) VALUES (1, $1::jsonb)`,
      [JSON.stringify(settingsData)]
    )

    await client.query(
      `INSERT INTO dashboard_stats (id, income, expenses, emi_collection, hl_collection, od_collection, closed_hp)
       VALUES (1, 500, 0, 565205, 0, 500, 14)`
    )

    await client.query('COMMIT')
    console.log('Seed complete')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
