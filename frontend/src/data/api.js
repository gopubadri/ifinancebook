// Frontend API client. Talks to the Express + PostgreSQL backend.
// In Vite dev, requests go through the /api proxy (see vite.config.js).

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  try {
    const saved = window.localStorage.getItem('ifinance_session')
    if (!saved) return null
    return JSON.parse(saved)?.token || null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Cannot reach API. Start the server with: cd server && npm run dev')
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (res.status === 401) {
    try { window.localStorage.removeItem('ifinance_session') } catch { /* ignore */ }
    if (!path.includes('/auth/login') && !path.includes('/auth/register')) {
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    throw new Error(data?.error || 'Session expired. Please log in again.')
  }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`
    throw new Error(message)
  }
  return data
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getDashboardStats() {
  return request('/dashboard')
}

export function getCustomers(q, { page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/customers?${params.toString()}`)
}

export function globalSearch(q, limit = 8) {
  const params = new URLSearchParams()
  params.set('q', q)
  params.set('limit', String(limit))
  return request(`/search?${params.toString()}`)
}


export function getCustomerById(id) {
  return request(`/customers/${id}`)
}

export function createCustomer(payload) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(id, payload) {
  return request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getEmiSummary(id) {
  return request(`/customers/${id}/emi-summary`)
}

export function getCustomerBills(id) {
  return request(`/customers/${id}/bills`)
}

export function getCustomerReminders(id) {
  return request(`/customers/${id}/reminders`)
}

export function createCustomerReminder(id, payload) {
  return request(`/customers/${id}/reminders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomerReminder(id, reminderId, payload) {
  return request(`/customers/${id}/reminders/${reminderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getSettlementPreview(id) {
  return request(`/customers/${id}/settlement-preview`)
}

export function createSettlement(id, payload) {
  return request(`/customers/${id}/settlement`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getOutPayments(id) {
  return request(`/customers/${id}/out-payments`)
}

export function createOutPayment(id, payload) {
  return request(`/customers/${id}/out-payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getUsers() {
  return request('/users')
}

export function createUser(payload) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getBikePurchases() {
  return request('/consultancy')
}

export function createBikePurchase(payload) {
  return request('/consultancy', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBikePurchase(id, payload) {
  return request(`/consultancy/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function getCustomerHandloans(id) {
  return request(`/customers/${id}/handloans`)
}

export function createCustomerHandloan(id, payload) {
  return request(`/customers/${id}/handloans`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getGenericModule(key, { q = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('page', String(page))
  params.set('limit', String(limit))
  return request(`/modules/${encodeURIComponent(key)}?${params.toString()}`)
}

export function createModuleRow(key, payload) {
  return request(`/modules/${encodeURIComponent(key)}/rows`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getReportMenu() {
  return request('/reports/menu')
}

export function getBalanceSheet() {
  return request('/accounting/balance-sheet')
}

export function getPnl() {
  return request('/accounting/pnl')
}

export function getAccounts() {
  return request('/accounting/accounts')
}

export function createAccount(payload) {
  return request('/accounting/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSubMasters() {
  return request('/accounting/sub-masters')
}

export function getMasters() {
  return request('/accounting/masters')
}

export function getJournals() {
  return request('/accounting/journals')
}

export function getJournal(id) {
  return request(`/accounting/journals/${id}`)
}

export function createJournal(payload) {
  return request('/accounting/journals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getTrialBalance() {
  return request('/accounting/trial-balance')
}

export function getAccountLedger(id) {
  return request(`/accounting/accounts/${id}/ledger`)
}

export function getDayReport() {
  return request('/reports/day-report')
}

export function getChartsData() {
  return request('/charts')
}

export function getSettings() {
  return request('/settings')
}

export function recordEmiPayment(payload) {
  return request(`/customers/${payload.customerId}/receipts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function saveSettings(payload) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
