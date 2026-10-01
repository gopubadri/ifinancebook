const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken() {
  try {
    const saved = localStorage.getItem('ifinance_session')
    return saved ? JSON.parse(saved).token : null
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(API_BASE + path, { ...options, headers })
  } catch {
    throw new Error('API not running. Start backend: npm run dev:backend')
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (res.status === 401) {
    localStorage.removeItem('ifinance_session')
    if (!path.includes('/auth/') && !location.hash.includes('/login')) {
      location.hash = '#/login'
    }
    throw new Error(data?.error || 'Please log in again')
  }

  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error('API not running. Start backend: npm run dev:backend')
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export function login(username, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function register(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
}

export function getDashboardStats() {
  return request('/dashboard')
}

export function getCustomers(q, { page = 1, limit = 20, export: exporting = false } = {}) {
  const p = new URLSearchParams({ page, limit })
  if (q) p.set('q', q)
  if (exporting) p.set('export', '1')
  return request('/customers?' + p)
}

export function globalSearch(q, limit = 8) {
  return request(`/search?q=${encodeURIComponent(q)}&limit=${limit}`)
}

export function getCustomerById(id) {
  return request(`/customers/${id}`)
}

export function createCustomer(payload) {
  return request('/customers', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCustomer(id, payload) {
  return request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
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
  return request(`/customers/${id}/reminders`, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCustomerReminder(id, reminderId, payload) {
  return request(`/customers/${id}/reminders/${reminderId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function getSettlementPreview(id) {
  return request(`/customers/${id}/settlement-preview`)
}

export function createSettlement(id, payload) {
  return request(`/customers/${id}/settlement`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getOutPayments(id) {
  return request(`/customers/${id}/out-payments`)
}

export function createOutPayment(id, payload) {
  return request(`/customers/${id}/out-payments`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getUsers() {
  return request('/users')
}

export function createUser(payload) {
  return request('/users', { method: 'POST', body: JSON.stringify(payload) })
}

export function resetUserPassword(id, password) {
  return request(`/users/${id}/password`, { method: 'POST', body: JSON.stringify({ password }) })
}

export function changePassword(payload) {
  return request('/auth/password', { method: 'POST', body: JSON.stringify(payload) })
}

export function getStaff() {
  return request('/staff')
}

export function getAudit() {
  return request('/audit')
}

export function voidReceipt(customerId, receiptNo) {
  return request(`/customers/${customerId}/receipts/${receiptNo}/void`, { method: 'POST', body: '{}' })
}

export function repayHandloan(customerId, hlId, payload) {
  return request(`/customers/${customerId}/handloans/${hlId}/repay`, { method: 'POST', body: JSON.stringify(payload) })
}

export function rebuildSchedule(customerId, payload) {
  return request(`/customers/${customerId}/rebuild-schedule`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getBikePurchases() {
  return request('/consultancy')
}

export function createBikePurchase(payload) {
  return request('/consultancy', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateBikePurchase(id, payload) {
  return request(`/consultancy/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function getCustomerHandloans(id) {
  return request(`/customers/${id}/handloans`)
}

export function createCustomerHandloan(id, payload) {
  return request(`/customers/${id}/handloans`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getGenericModule(key, { q = '', page = 1, limit = 20, export: exporting = false } = {}) {
  const p = new URLSearchParams({ page, limit })
  if (q) p.set('q', q)
  if (exporting) p.set('export', '1')
  return request(`/modules/${encodeURIComponent(key)}?${p}`)
}

export function createModuleRow(key, payload) {
  return request(`/modules/${encodeURIComponent(key)}/rows`, { method: 'POST', body: JSON.stringify(payload) })
}

export function updateModuleRow(key, id, payload) {
  return request(`/modules/${encodeURIComponent(key)}/rows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteModuleRow(key, id) {
  return request(`/modules/${encodeURIComponent(key)}/rows/${id}`, { method: 'DELETE' })
}

export function getReportMenu() {
  return request('/reports/menu')
}

export function getBalanceSheet() {
  return request('/reports/balance-sheet')
}

export function getPnl({ preset, from, to } = {}) {
  const p = new URLSearchParams()
  if (preset) p.set('preset', preset)
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  const q = p.toString()
  return request('/reports/pnl' + (q ? `?${q}` : ''))
}

export function createSubMaster(payload) {
  return request('/accounting/sub-masters', { method: 'POST', body: JSON.stringify(payload) })
}

export function postOpening(payload) {
  return request('/accounting/opening', { method: 'POST', body: JSON.stringify(payload) })
}

export function getAccounts() {
  return request('/accounting/accounts')
}

export function createAccount(payload) {
  return request('/accounting/accounts', { method: 'POST', body: JSON.stringify(payload) })
}

export function getSubMasters() {
  return request('/accounting/sub-masters')
}

export function getMasters() {
  return request('/accounting/masters')
}

export function getJournals({ page = 1, limit = 50 } = {}) {
  const p = new URLSearchParams({ page, limit })
  return request('/accounting/journals?' + p)
}

export function getJournal(id) {
  return request(`/accounting/journals/${id}`)
}

export function createJournal(payload) {
  return request('/accounting/journals', { method: 'POST', body: JSON.stringify(payload) })
}

export function reverseJournal(id, payload = {}) {
  return request(`/accounting/journals/${id}/reverse`, {
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

export function getDayReport(date) {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return request('/reports/day-report' + q)
}

export function getLineReport({ view, type, village, asOf } = {}) {
  const q = new URLSearchParams()
  if (view) q.set('view', view)
  if (type) q.set('type', type)
  if (village) q.set('village', village)
  if (asOf) q.set('asOf', asOf)
  const qs = q.toString()
  return request(`/reports/line${qs ? `?${qs}` : ''}`)
}

export function getClosedHpReport() {
  return request('/reports/closed-hp')
}

export function getSeizedHpReport() {
  return request('/reports/seized-hp')
}

export function getOdReport() {
  return request('/reports/od')
}

export function getCollectionReport({ from, to } = {}) {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const qs = q.toString()
  return request(`/reports/collection${qs ? `?${qs}` : ''}`)
}

export function getSpecialReport(key, { from, to, asOf } = {}) {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  if (asOf) q.set('asOf', asOf)
  const qs = q.toString()
  return request(`/reports/special/${encodeURIComponent(key)}${qs ? `?${qs}` : ''}`)
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
  return request('/settings', { method: 'PUT', body: JSON.stringify(payload) })
}
