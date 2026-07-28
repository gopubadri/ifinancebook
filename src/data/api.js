// This file stands in for a real backend. Every function returns a Promise
// and takes 250-500ms, the same shape a real `fetch('/api/...')` call would
// have. That's why pages show a loading state when you click a tab/card -
// they're "awaiting" this layer exactly like they would await a network call.
//
// TO CONNECT A REAL BACKEND: keep every function signature the same, replace
// the body with a `fetch(...)` call, and nothing in the pages/components
// needs to change.

import * as mock from './mockData.js'

function wait(data, ms = 350) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

export function getDashboardStats() {
  return wait(mock.dashboardStats)
}

export function getCustomers() {
  return wait(mock.customers)
}

export function getCustomerById(id) {
  const customer = mock.customers.find((c) => String(c.id) === String(id))
  return wait(customer || null)
}

export function getEmiSummary(id) {
  const customer = mock.customers.find((c) => String(c.id) === String(id))
  if (!customer) return wait(null)
  return wait(mock.emiSummary(customer))
}

export function getOutPayments(id) {
  return wait(mock.outPaymentsByCustomer[id] || [])
}

export function getUsers() {
  return wait(mock.usersList)
}

export function getBikePurchases() {
  return wait(mock.bikePurchases)
}

export function getGenericModule(key) {
  return wait(mock.genericModules[key] || { title: key, columns: [], rows: [] })
}

export function getReportMenu() {
  return wait(mock.reportMenu)
}

export function getBalanceSheet() {
  return wait(mock.balanceSheet)
}

export function getPnl() {
  return wait(mock.pnl)
}

export function getDayReport() {
  return wait(mock.dayReportRows)
}

export function getChartsData() {
  return wait(mock.chartsData)
}

export function getSettings() {
  return wait(mock.settingsData)
}

// Fake "write" endpoints - they resolve successfully but don't persist,
// since this is a front-end only demo. Swap for real POST/PUT calls later.
export function recordEmiPayment(payload) {
  return wait({ ok: true, receiptNo: Math.floor(400000 + Math.random() * 9000), ...payload }, 450)
}

export function saveSettings(payload) {
  return wait({ ok: true, ...payload }, 450)
}
