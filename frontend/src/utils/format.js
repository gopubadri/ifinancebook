export function inr(value) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '--'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/** Format YYYY-MM-DD as DD-MM-YYYY for receipts and print. */
export function dmy(value) {
  if (!value) return ''
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (!d) return s
  return `${d}-${m}-${y}`
}

export function titleCase(str) {
  return String(str).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
