import { query } from '../db.js'
import { mapBike, mapAuthUser, mapCustomer } from '../mappers.js'

/** Dashboard folders + nav destinations searchable by title/description/keywords */
export const APP_PAGES = [
  { title: "Support", desc: 'Software contact & payment info', to: '/support', keywords: 'support help contact payment' },
  { title: "Finance's", desc: 'All finances based on EMI schedule', to: '/finance', keywords: 'finance hp emi customer loan' },
  { title: 'New Finance', desc: 'Create a new hire-purchase finance', to: '/finance/new', keywords: 'new finance create hp' },
  { title: 'Handloans', desc: 'Loans given by note or on trust', to: '/module/handloans-new', keywords: 'handloan hl loan trust' },
  { title: 'Hand Loans Type 2', desc: 'Type 2 handloan accounts', to: '/module/hand-loans', keywords: 'handloan type 2' },
  { title: 'Day Report', desc: 'Daily collections & bills', to: '/reports/day-report', keywords: 'day report collection bill' },
  { title: 'Reports', desc: 'Finance, line & account reports', to: '/reports', keywords: 'reports catalogue' },
  { title: 'Ledger Reports', desc: 'Trial balance & ledger summaries', to: '/accounting/trial-balance', keywords: 'ledger trial balance' },
  { title: 'Charts', desc: 'Graphical HPs & collection', to: '/charts', keywords: 'charts graph collection' },
  { title: 'Consultancy', desc: 'Vehicle purchase and sale', to: '/consultancy', keywords: 'consultancy bike vehicle rc' },
  { title: 'Users', desc: 'Admin, clerk & line accounts', to: '/users', keywords: 'users staff admin clerk' },
  { title: 'Capitals', desc: 'Shareholder investment tracking', to: '/module/capitals', keywords: 'capital shareholder' },
  { title: "Bank's", desc: 'Bank, GPay & PhonePe balances', to: '/module/banks-new', keywords: 'bank gpay phonepe' },
  { title: 'Deposits', desc: 'Deposit accounts', to: '/module/deposits', keywords: 'deposit' },
  { title: 'Deposits (DP)', desc: 'DP deposit accounts', to: '/module/deposits-dp-new', keywords: 'deposit dp' },
  { title: 'Cheques', desc: 'Cheque register', to: '/module/cheques', keywords: 'cheque check' },
  { title: 'Chits', desc: 'Chit fund schemes', to: '/module/chits-new', keywords: 'chit fund' },
  { title: 'Loans', desc: 'Loan accounts', to: '/module/loans-new', keywords: 'loans' },
  { title: 'Credit Transactions', desc: 'Credit accounts', to: '/module/credit-transactions-new', keywords: 'credit' },
  { title: 'Investments', desc: 'Investment accounts', to: '/module/investments-new', keywords: 'investment' },
  { title: 'Assets', desc: 'Fixed asset register', to: '/module/assets-new', keywords: 'assets fixed' },
  { title: 'Expenses', desc: 'Inc & Exp accounts', to: '/module/income-expenses-new', keywords: 'expense income account' },
  { title: 'Income & Expense', desc: 'Income & expense bills', to: '/module/income-expense-transactions', keywords: 'income expense bill ie' },
  { title: 'Settings', desc: 'Rates, series, company info', to: '/settings', keywords: 'settings config interest' },
  { title: 'Agents', desc: 'Field collection agents', to: '/module/agents', keywords: 'agents collector' },
  { title: 'RTA', desc: 'RTA token / registration tracking', to: '/module/rta', keywords: 'rta token registration' },
  { title: 'P&L', desc: 'Profit and loss statement', to: '/reports/pnl', keywords: 'pnl profit loss' },
  { title: 'Balance Sheet', desc: 'Assets vs liabilities', to: '/reports/balance-sheet', keywords: 'balance sheet' },
  { title: 'Journals', desc: 'Double-entry journal postings', to: '/accounting/journals', keywords: 'journal voucher entry' },
  { title: 'All Accounts', desc: 'Chart of accounts & ledgers', to: '/accounting/accounts', keywords: 'accounts chart coa ledger' },
  { title: 'Sub Masters', desc: 'Account sub-masters', to: '/accounting/sub-masters', keywords: 'sub master masters' },
  { title: 'Trial Balance', desc: 'Account trial balance', to: '/accounting/trial-balance', keywords: 'trial balance' },
  { title: 'Lines', desc: 'Collection route lines', to: '/module/routes', keywords: 'lines routes' },
  { title: 'Branch Points', desc: 'Branch points directory', to: '/module/branch-points', keywords: 'branch points' },
  { title: 'Branches', desc: 'Branch master', to: '/module/branches', keywords: 'branches' },
  { title: 'Bike Types', desc: 'Bike type master', to: '/module/bike-types', keywords: 'bike types' },
  { title: 'Blacklist', desc: 'Blacklisted parties', to: '/module/blacklist', keywords: 'blacklist' },
]

function matchesText(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(needle)
}

function pageHits(q, limit) {
  const needle = q.toLowerCase()
  return APP_PAGES
    .filter((p) =>
      matchesText(p.title, needle) ||
      matchesText(p.desc, needle) ||
      matchesText(p.keywords, needle) ||
      matchesText(p.to, needle)
    )
    .slice(0, limit)
    .map((p) => ({
      type: 'page',
      title: p.title,
      subtitle: p.desc,
      to: p.to,
    }))
}

async function searchNamedTable({
  table,
  label,
  to,
  like,
  q,
  limit,
  fields = ['name'],
  extraWhere = '',
}) {
  const cols = fields.map((f) => {
    if (f === 'mobile') return `COALESCE(mobile, '') LIKE $1`
    return `lower(COALESCE(${f}, '')) LIKE $1`
  })
  const whereSql = extraWhere
    ? `(${extraWhere}) AND (${cols.join(' OR ')})`
    : `(${cols.join(' OR ')})`

  try {
    const countRes = await query(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${whereSql}`,
      [like]
    )
    const rows = await query(
      `SELECT * FROM ${table} WHERE ${whereSql} ORDER BY id LIMIT $2`,
      [like, limit]
    )
    return {
      label,
      to,
      total: countRes.rows[0].count,
      items: rows.rows.map((r) => ({
        type: 'module',
        id: r.id,
        title: r.name || r.cheque_no || `#${r.id}`,
        subtitle: [r.village, r.mobile, r.balance != null ? `Bal ${r.balance}` : null]
          .filter(Boolean)
          .join(' · '),
        to: `${to}?q=${encodeURIComponent(q)}`,
      })),
    }
  } catch {
    return { label, to, total: 0, items: [] }
  }
}

export async function runGlobalSearch(qRaw, limit = 6) {
  const q = String(qRaw || '').trim()
  if (!q) {
    return {
      q: '',
      pages: [],
      customers: [],
      bikes: [],
      users: [],
      accounts: [],
      journals: [],
      modules: [],
      totals: {
        pages: 0, customers: 0, bikes: 0, users: 0, accounts: 0, journals: 0, modules: 0, all: 0,
      },
    }
  }

  const like = `%${q.toLowerCase()}%`
  const pages = pageHits(q, limit)

  const [
    customers,
    custCount,
    bikes,
    bikeCount,
    users,
    userCount,
    accounts,
    accountCount,
    journals,
    journalCount,
  ] = await Promise.all([
    query(
      `SELECT * FROM customers
       WHERE lower(name) LIKE $1 OR lower(hp_no) LIKE $1
          OR COALESCE(mobile, '') LIKE $1 OR lower(COALESCE(reg_no, '')) LIKE $1
          OR lower(COALESCE(village, '')) LIKE $1 OR COALESCE(alternate_mobile, '') LIKE $1
       ORDER BY id LIMIT $2`,
      [like, limit]
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM customers
       WHERE lower(name) LIKE $1 OR lower(hp_no) LIKE $1
          OR COALESCE(mobile, '') LIKE $1 OR lower(COALESCE(reg_no, '')) LIKE $1
          OR lower(COALESCE(village, '')) LIKE $1 OR COALESCE(alternate_mobile, '') LIKE $1`,
      [like]
    ),
    query(
      `SELECT * FROM bike_purchases
       WHERE lower(rc_no) LIKE $1 OR lower(COALESCE(makers, '')) LIKE $1
          OR lower(COALESCE(model, '')) LIKE $1
       ORDER BY id DESC LIMIT $2`,
      [like, limit]
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM bike_purchases
       WHERE lower(rc_no) LIKE $1 OR lower(COALESCE(makers, '')) LIKE $1
          OR lower(COALESCE(model, '')) LIKE $1`,
      [like]
    ),
    query(
      `SELECT id, username, name, role, created_at FROM auth_users
       WHERE username NOT IN ('admin', 'clerk', 'line')
         AND (lower(username) LIKE $1 OR lower(name) LIKE $1 OR lower(role) LIKE $1)
       ORDER BY id DESC LIMIT $2`,
      [like, limit]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT COUNT(*)::int AS count FROM auth_users
       WHERE username NOT IN ('admin', 'clerk', 'line')
         AND (lower(username) LIKE $1 OR lower(name) LIKE $1 OR lower(role) LIKE $1)`,
      [like]
    ).catch(() => ({ rows: [{ count: 0 }] })),
    query(
      `SELECT a.id, a.name, a.code, s.name AS sub_master
       FROM acc_accounts a
       LEFT JOIN acc_sub_masters s ON s.id = a.sub_master_id
       WHERE lower(a.name) LIKE $1 OR lower(COALESCE(a.code, '')) LIKE $1
          OR lower(COALESCE(s.name, '')) LIKE $1
       ORDER BY a.name LIMIT $2`,
      [like, limit]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT COUNT(*)::int AS count
       FROM acc_accounts a
       LEFT JOIN acc_sub_masters s ON s.id = a.sub_master_id
       WHERE lower(a.name) LIKE $1 OR lower(COALESCE(a.code, '')) LIKE $1
          OR lower(COALESCE(s.name, '')) LIKE $1`,
      [like]
    ).catch(() => ({ rows: [{ count: 0 }] })),
    query(
      `SELECT id, entry_date, narration, reference_type, reference_id
       FROM journal_entries
       WHERE lower(COALESCE(narration, '')) LIKE $1
          OR lower(COALESCE(reference_type, '')) LIKE $1
          OR lower(COALESCE(reference_id, '')) LIKE $1
       ORDER BY id DESC LIMIT $2`,
      [like, limit]
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT COUNT(*)::int AS count FROM journal_entries
       WHERE lower(COALESCE(narration, '')) LIKE $1
          OR lower(COALESCE(reference_type, '')) LIKE $1
          OR lower(COALESCE(reference_id, '')) LIKE $1`,
      [like]
    ).catch(() => ({ rows: [{ count: 0 }] })),
  ])

  const moduleSearches = await Promise.all([
    searchNamedTable({
      table: 'handloan_accounts', label: 'Handloans', to: '/module/handloans-new',
      like, q, limit, fields: ['name', 'village'], extraWhere: `loan_type = '1'`,
    }),
    searchNamedTable({
      table: 'handloan_accounts', label: 'Hand Loans Type 2', to: '/module/hand-loans',
      like, q, limit, fields: ['name', 'village'], extraWhere: `loan_type = '2'`,
    }),
    searchNamedTable({
      table: 'capital_accounts', label: 'Capitals', to: '/module/capitals',
      like, q, limit, fields: ['name', 'village'],
    }),
    searchNamedTable({
      table: 'deposit_accounts', label: 'Deposits', to: '/module/deposits',
      like, q, limit, fields: ['name', 'village'], extraWhere: `deposit_type = 'normal'`,
    }),
    searchNamedTable({
      table: 'deposit_accounts', label: 'Deposits (DP)', to: '/module/deposits-dp-new',
      like, q, limit, fields: ['name', 'village'], extraWhere: `deposit_type = 'dp'`,
    }),
    searchNamedTable({
      table: 'bank_accounts', label: "Bank's", to: '/module/banks-new',
      like, q, limit, fields: ['name'],
    }),
    searchNamedTable({
      table: 'chit_accounts', label: 'Chits', to: '/module/chits-new',
      like, q, limit, fields: ['name'],
    }),
    searchNamedTable({
      table: 'loan_accounts', label: 'Loans', to: '/module/loans-new',
      like, q, limit, fields: ['name', 'village', 'mobile'],
    }),
    searchNamedTable({
      table: 'credit_accounts', label: 'Credits', to: '/module/credit-transactions-new',
      like, q, limit, fields: ['name', 'village'],
    }),
    searchNamedTable({
      table: 'investment_accounts', label: 'Investments', to: '/module/investments-new',
      like, q, limit, fields: ['name', 'village'],
    }),
    searchNamedTable({
      table: 'asset_accounts', label: 'Assets', to: '/module/assets-new',
      like, q, limit, fields: ['name', 'village'],
    }),
    searchNamedTable({
      table: 'ie_accounts', label: 'Expenses / I&E Accounts', to: '/module/income-expenses-new',
      like, q, limit, fields: ['name'],
    }),
  ])

  let cheques = { label: 'Cheques', to: '/module/cheques', total: 0, items: [] }
  try {
    const cCount = await query(
      `SELECT COUNT(*)::int AS count FROM cheques
       WHERE lower(cheque_no) LIKE $1 OR lower(COALESCE(description,'')) LIKE $1 OR lower(status) LIKE $1`,
      [like]
    )
    const cRows = await query(
      `SELECT * FROM cheques
       WHERE lower(cheque_no) LIKE $1 OR lower(COALESCE(description,'')) LIKE $1 OR lower(status) LIKE $1
       ORDER BY id DESC LIMIT $2`,
      [like, limit]
    )
    cheques = {
      label: 'Cheques',
      to: `/module/cheques?q=${encodeURIComponent(q)}`,
      total: cCount.rows[0].count,
      items: cRows.rows.map((r) => ({
        type: 'module',
        id: r.id,
        title: r.cheque_no,
        subtitle: `${r.description || ''} · ${r.status} · ${r.amount}`,
        to: `/module/cheques?q=${encodeURIComponent(q)}`,
      })),
    }
  } catch { /* ignore */ }

  let ieBills = { label: 'Income & Expense', to: '/module/income-expense-transactions', total: 0, items: [] }
  try {
    const iCount = await query(
      `SELECT COUNT(*)::int AS count FROM ie_bills
       WHERE lower(COALESCE(account,'')) LIKE $1
          OR lower(COALESCE(description,'')) LIKE $1
          OR lower(bill_type) LIKE $1`,
      [like]
    )
    const iRows = await query(
      `SELECT * FROM ie_bills
       WHERE lower(COALESCE(account,'')) LIKE $1
          OR lower(COALESCE(description,'')) LIKE $1
          OR lower(bill_type) LIKE $1
       ORDER BY id DESC LIMIT $2`,
      [like, limit]
    )
    ieBills = {
      label: 'Income & Expense',
      to: `/module/income-expense-transactions?q=${encodeURIComponent(q)}`,
      total: iCount.rows[0].count,
      items: iRows.rows.map((r) => ({
        type: 'module',
        id: r.id,
        title: `${r.bill_type} · ${r.account || 'Account'}`,
        subtitle: `${r.description || ''} · ${r.amount}`,
        to: `/module/income-expense-transactions?q=${encodeURIComponent(q)}`,
      })),
    }
  } catch { /* ignore */ }

  let generic = { label: 'Other Modules (Agents, RTA, …)', to: '/dashboard', total: 0, items: [] }
  try {
    const gCount = await query(
      `SELECT COUNT(*)::int AS count FROM generic_module_rows WHERE row_data::text ILIKE $1`,
      [like]
    )
    const gRows = await query(
      `SELECT r.id, r.module_key, r.row_data, m.title
       FROM generic_module_rows r
       LEFT JOIN generic_modules m ON m.module_key = r.module_key
       WHERE r.row_data::text ILIKE $1
       ORDER BY r.id DESC LIMIT $2`,
      [like, limit]
    )
    generic = {
      label: 'Other Modules (Agents, RTA, …)',
      to: '/dashboard',
      total: gCount.rows[0].count,
      items: gRows.rows.map((r) => {
        const data = r.row_data || {}
        const title = data.name || data.customer || data.agent || data.hpNo || `#${r.id}`
        return {
          type: 'module',
          id: r.id,
          title: String(title),
          subtitle: r.title || r.module_key,
          to: `/module/${r.module_key}?q=${encodeURIComponent(q)}`,
        }
      }),
    }
  } catch { /* ignore */ }

  const modules = [
    ...moduleSearches.filter((m) => m.total > 0),
    ...(cheques.total > 0 ? [cheques] : []),
    ...(ieBills.total > 0 ? [ieBills] : []),
    ...(generic.total > 0 ? [generic] : []),
  ]

  const totals = {
    pages: pages.length,
    customers: custCount.rows[0].count,
    bikes: bikeCount.rows[0].count,
    users: userCount.rows[0].count,
    accounts: accountCount.rows[0].count,
    journals: journalCount.rows[0].count,
    modules: modules.reduce((s, m) => s + m.total, 0),
  }
  totals.all = totals.pages + totals.customers + totals.bikes + totals.users
    + totals.accounts + totals.journals + totals.modules

  return {
    q,
    pages,
    customers: customers.rows.map((r) => {
      const c = mapCustomer(r)
      return {
        type: 'customer',
        id: c.id,
        title: c.hpNo,
        subtitle: `${c.name}${c.mobile ? ` · ${c.mobile}` : ''}${c.village ? ` · ${c.village}` : ''}`,
        to: `/finance/${c.id}`,
      }
    }),
    bikes: bikes.rows.map((r) => {
      const b = mapBike(r)
      return {
        type: 'bike',
        id: b.id,
        title: b.rcNo,
        subtitle: `${b.makers || ''} ${b.model || ''} · ${b.status || ''}`.trim(),
        to: '/consultancy',
      }
    }),
    users: users.rows.map((r) => {
      const u = mapAuthUser(r)
      return {
        type: 'user',
        id: u.id,
        title: u.name,
        subtitle: `${u.username} · ${u.role}`,
        to: '/users',
      }
    }),
    accounts: accounts.rows.map((r) => ({
      type: 'account',
      id: r.id,
      title: r.name,
      subtitle: [r.code, r.sub_master].filter(Boolean).join(' · '),
      to: `/accounting/accounts/${r.id}`,
    })),
    journals: journals.rows.map((r) => ({
      type: 'journal',
      id: r.id,
      title: r.narration || `Journal #${r.id}`,
      subtitle: `${r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : String(r.entry_date).slice(0, 10)} · ${r.reference_type || ''}`,
      to: `/accounting/journals/${r.id}`,
    })),
    modules,
    totals,
  }
}
