/** Maps frontend /module/:key values to Phase-2 resources */

export const MODULE_MAP = {
  'handloans-new': {
    resource: 'handloans',
    title: 'HandLoans',
    columns: ['name', 'village', 'balance'],
    filter: { loanType: '1' },
  },
  'hand-loans': {
    resource: 'handloans',
    title: 'Hand Loans Type 2',
    columns: ['name', 'village', 'balance'],
    filter: { loanType: '2' },
  },
  capitals: {
    resource: 'capitals',
    title: 'Capitals',
    columns: ['name', 'village', 'balance'],
  },
  deposits: {
    resource: 'deposits',
    title: 'Deposits',
    columns: ['name', 'village', 'balance'],
    filter: { depositType: 'normal' },
  },
  'deposits-dp-new': {
    resource: 'deposits',
    title: 'Deposits (DP) New',
    columns: ['name', 'village', 'balance'],
    filter: { depositType: 'dp' },
  },
  cheques: {
    resource: 'cheques',
    title: 'Cheques',
    columns: ['cheque', 'description', 'date', 'amount', 'status'],
  },
  'banks-new': {
    resource: 'banks',
    title: 'Bank',
    columns: ['name', 'balance'],
  },
  'chits-new': {
    resource: 'chits',
    title: 'Chits',
    columns: ['name', 'balance'],
  },
  'loans-new': {
    resource: 'loans',
    title: 'Loans',
    columns: ['name', 'village', 'mobile'],
  },
  'credit-transactions-new': {
    resource: 'credits',
    title: 'Credit Transactions',
    columns: ['name', 'village', 'balance'],
  },
  'investments-new': {
    resource: 'investments',
    title: 'Investments',
    columns: ['name', 'village', 'balance'],
  },
  'assets-new': {
    resource: 'assets',
    title: 'Assets',
    columns: ['name', 'village', 'balance'],
  },
  'income-expenses-new': {
    resource: 'ie-accounts',
    title: 'Inc & Exp Accounts',
    columns: ['name', 'balance'],
  },
  'income-expense-transactions': {
    resource: 'ie-bills',
    title: 'Income & Expense',
    columns: ['amount', 'type', 'paidDate', 'account', 'description'],
  },
}

export function isPhase2Module(key) {
  return Boolean(MODULE_MAP[key])
}
