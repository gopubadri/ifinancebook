const EXPORT_LIMIT = 5000

/** Parse page/limit query params with safe defaults. */
export function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const exporting = query.export === '1' || query.export === 'true' || String(query.limit || '').toLowerCase() === 'all'
  const cap = exporting ? EXPORT_LIMIT : maxLimit
  const page = exporting ? 1 : Math.max(1, Number.parseInt(query.page, 10) || 1)
  let limit = exporting ? cap : (Number.parseInt(query.limit, 10) || defaultLimit)
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit
  limit = Math.min(cap, limit)
  const offset = (page - 1) * limit
  return { page, limit, offset, export: exporting }
}

export function pageResult(items, total, page, limit) {
  const safeTotal = Number(total) || 0
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit) || 1)
  return {
    items,
    total: safeTotal,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
