export function inr(value) {
  if (value === null || value === undefined || value === '') return '--'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function titleCase(str) {
  return String(str)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
