export default function Pagination({
  page = 1,
  totalPages = 1,
  total = 0,
  limit = 20,
  onPageChange,
  disabled = false,
}) {
  if (total === 0 && totalPages <= 1) return null

  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  function go(next) {
    if (disabled) return
    const p = Math.min(totalPages, Math.max(1, next))
    if (p !== page) onPageChange?.(p)
  }

  const pages = []
  const window = 2
  const start = Math.max(1, page - window)
  const end = Math.min(totalPages, page + window)
  for (let i = start; i <= end; i += 1) pages.push(i)

  return (
    <div className="pagination">
      <span className="pagination-meta">
        {total > 0 ? `Showing ${from}–${to} of ${total}` : 'No results'}
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn outline" disabled={disabled || page <= 1} onClick={() => go(1)}>
          «
        </button>
        <button type="button" className="btn outline" disabled={disabled || page <= 1} onClick={() => go(page - 1)}>
          Prev
        </button>
        {start > 1 && <span className="pagination-ellipsis">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${p === page ? 'brass' : 'outline'}`}
            disabled={disabled}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="pagination-ellipsis">…</span>}
        <button type="button" className="btn outline" disabled={disabled || page >= totalPages} onClick={() => go(page + 1)}>
          Next
        </button>
        <button type="button" className="btn outline" disabled={disabled || page >= totalPages} onClick={() => go(totalPages)}>
          »
        </button>
      </div>
    </div>
  )
}
