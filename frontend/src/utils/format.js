export function inr(value) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return '--'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function titleCase(str) {
  return String(str).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
