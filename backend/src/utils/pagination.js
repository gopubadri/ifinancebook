/** Parse page/limit query params with safe defaults. */
export function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  let limit = Number.parseInt(query.limit, 10) || defaultLimit
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit
  limit = Math.min(maxLimit, limit)
  const offset = (page - 1) * limit
  return { page, limit, offset }
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
