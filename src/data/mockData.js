// All the "back end" data for the demo lives in this one file.
// It mirrors the tables described in the technical analysis doc
// (customers, emi_schedules, out_payments, sub_masters/accounts, etc.)
// so that swapping this file for real API calls later is a drop-in job.

export const dashboardStats = {
  income: 500,
  expenses: 0,
  emiCollection: 565205,
  hlCollection: 0.0,
  odCollection: 500.0,
  closedHp: 14,
}

export const customers = [
  { id: 4817, hpNo: 'TYRE0025', name: 'GOLLAPALLI JEEVA', mobile: '9948693719', regNo: '825-20 FIFTY PLAS R / TR', village: 'TADEPALLIGUDEM', emiPeriod: 6, emiAmount: 8213, makersNo: 'MRF', model: '2026', chasisNo: 'ASDF', engNo: 'ASDF', cb: false, clrDate: '2026-06-29', emiDate: '2026-08-05', seized: 'NO', closed: 'NO' },
  { id: 4818, hpNo: 'FCSAFTPG0049', name: 'NEKKALAPUDI MOHAN NAGA AN', mobile: '9948412510', regNo: 'TR', village: 'CHEBROLU', emiPeriod: 12, emiAmount: 6533, makersNo: 'HERO', model: '2025', chasisNo: 'HRZX21', engNo: 'ENGX21', cb: true, clrDate: '2026-05-11', emiDate: '2026-06-15', seized: 'NO', closed: 'NO' },
  { id: 4819, hpNo: 'SAFNDD0386', name: 'TRIPURARI NISSI KUMARI', mobile: '9705256995', regNo: 'AP40CS4173', village: 'BUTTAYAGUDEM', emiPeriod: 18, emiAmount: 3362, makersNo: 'BAJAJ', model: '2024', chasisNo: 'BJX9182', engNo: 'ENGB918', cb: true, clrDate: '2026-01-02', emiDate: '2026-02-05', seized: 'NO', closed: 'NO' },
  { id: 4820, hpNo: 'SAFTNK0421', name: 'K VENKATA RAMANA', mobile: '9866123450', regNo: 'AP37BT2201', village: 'TANUKU', emiPeriod: 12, emiAmount: 5100, makersNo: 'TVS', model: '2023', chasisNo: 'TVX7712', engNo: 'ENGT771', cb: false, clrDate: '2025-11-20', emiDate: '2025-12-05', seized: 'YES', closed: 'NO' },
  { id: 4821, hpNo: 'SAFNDD0512', name: 'P SATYAVATHI', mobile: '9963321440', regNo: 'AP05Q9981', village: 'ELURU', emiPeriod: 6, emiAmount: 9020, makersNo: 'HONDA', model: '2026', chasisNo: 'HDX5541', engNo: 'ENGH554', cb: true, clrDate: '2026-04-14', emiDate: '2026-05-01', seized: 'NO', closed: 'YES' },
  { id: 4822, hpNo: 'FCSAFTPG0091', name: 'D RAMESH BABU', mobile: '9848002211', regNo: 'AP39NF0499', village: 'NIDADAVOLU', emiPeriod: 24, emiAmount: 2890, makersNo: 'MRF', model: '2022', chasisNo: 'MRX3321', engNo: 'ENGM332', cb: false, clrDate: '2025-08-09', emiDate: '2025-09-05', seized: 'NO', closed: 'NO' },
]

// EMI schedules keyed by customer id
export function buildEmiSchedule(customer) {
  const rows = []
  let cumulative = 0
  const principal = customer.emiAmount * customer.emiPeriod * 0.85
  const interestPerEmi = Math.round((principal * 0.01 * customer.emiPeriod) / customer.emiPeriod * 100) / 100
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

export function emiSummary(customer) {
  const schedule = buildEmiSchedule(customer)
  const totalLoan = schedule.reduce((s, r) => s + r.amount, 0)
  return {
    paidAmount: 0,
    pendingBalance: 0,
    balance: totalLoan,
    totalBalance: totalLoan,
    totalEmis: schedule.length,
    paidEmis: 0,
    remainingEmis: schedule.length,
    totalLoan: 0,
    schedule,
  }
}

export const outPaymentsByCustomer = {
  4818: [
    { sno: 1, amount: 4000, date: '2026-06-02', interest: 2.5, paidAmount: 4000, status: 'paid' },
  ],
}

export const usersList = [
  { id: 1760, name: 'RAJA', mobile: '9347222370', type: 'LINE EXECUTIVE', date: '13-03-2025' },
  { id: 1761, name: 'DURGA', mobile: '6301549033', type: 'CLERK', date: '20-06-2024' },
  { id: 1762, name: 'TEJA', mobile: '7013945700', type: 'CLERK', date: '20-06-2024' },
  { id: 1763, name: 'NANDH', mobile: '9014596648', type: 'CLERK', date: '14-06-2024' },
  { id: 1764, name: 'NABHI', mobile: '8074045692', type: 'CLERK', date: '13-06-2024' },
  { id: 1765, name: 'JANARDAN', mobile: '9398311141', type: 'LINE EXECUTIVE', date: '12-02-2024' },
  { id: 1766, name: 'KONDA', mobile: '7780560493', type: 'LINE EXECUTIVE', date: '04-11-2023' },
  { id: 1767, name: 'VANI', mobile: '7032662533', type: 'LINE EXECUTIVE', date: '16-06-1999' },
  { id: 1768, name: 'KISHORE', mobile: '7780697177', type: 'LINE EXECUTIVE', date: '01-03-2022' },
  { id: 1769, name: 'MANI', mobile: '6304674007', type: 'LINE EXECUTIVE', date: '05-01-2022' },
  { id: 1770, name: 'SUBBU', mobile: '7075455447', type: 'LINE EXECUTIVE', date: '29-12-2021' },
  { id: 1771, name: 'BALAJI', mobile: '8008374901', type: 'LINE EXECUTIVE', date: '29-12-2021' },
]

export const bikePurchases = [
  { id: 202, rcNo: 'AP39NF0499', makers: 'HONDA ACTIVA 125', model: '2022', purchaseDate: '19-06-2026', purchaseAmount: 45000, repairCost: 2800, sellingPrice: 0 },
  { id: 203, rcNo: 'AP39DC2190', makers: 'ACTIVA 5G', model: '2019', purchaseDate: '26-06-2026', purchaseAmount: 27000, repairCost: 11000, sellingPrice: 48000 },
  { id: 204, rcNo: 'AP37BF7712', makers: 'TVS JUPITER', model: '2020', purchaseDate: '02-07-2026', purchaseAmount: 32000, repairCost: 4500, sellingPrice: 0 },
]

// Generic "sub master" style transaction modules (Transactions + Others dropdowns).
// Each entry drives GenericModuleList so we don't hand-write near-identical pages.
export const genericModules = {
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

export const reportMenu = {
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

export const balanceSheet = {
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

export const pnl = {
  income: [
    ['RECEIVED INTEREST', 23141365], ['AGREEMENTS', 23], ["OD'S", 9], ["EMI TA's", 1912934],
    ['RTA', 0], ['Consultancy', 0], ['SALE PROFIT', 0],
  ],
  expenses: [
    ['HL RECEIVED INTEREST', 0], ['CAPITALS INTEREST', 0.0], ['DEPOSITS INTEREST', 0.0],
  ],
}

export const dayReportRows = [
  { sno: 1, name: 'OPENING BALANCE', rcNo: '----', hp: '----', desc: '----', createdBy: '', receiptAmt: 4769695 },
  { sno: 2, name: 'GUNTU SRINU', rcNo: '00/4770135', hp: 'SAFNDD0135', desc: 'EMI - AP04AD4966', createdBy: 'RAJA', receiptAmt: 7800 },
  { sno: 3, name: 'K VENKATA RAMANA', rcNo: '00/4770136', hp: 'SAFTNK0421', desc: 'EMI - AP37BT2201', createdBy: 'DURGA', receiptAmt: 5100 },
  { sno: 4, name: 'P SATYAVATHI', rcNo: '00/4770137', hp: 'SAFNDD0512', desc: 'EMI - AP05Q9981', createdBy: 'RAJA', receiptAmt: 9020 },
]

export const chartsData = {
  hps: [
    { name: 'Open', value: 1362 }, { name: 'Closed', value: 14 },
  ],
  financedAmount: [
    { month: 'Feb', amount: 4200000 }, { month: 'Mar', amount: 4600000 }, { month: 'Apr', amount: 5100000 },
    { month: 'May', amount: 4950000 }, { month: 'Jun', amount: 5320000 }, { month: 'Jul', amount: 5800000 },
  ],
  collection: [
    { month: 'Feb', collected: 480000 }, { month: 'Mar', collected: 512000 }, { month: 'Apr', collected: 498000 },
    { month: 'May', collected: 540000 }, { month: 'Jun', collected: 552000 }, { month: 'Jul', collected: 565205 },
  ],
}

export const settingsData = {
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
