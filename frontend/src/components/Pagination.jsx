export default function Pagination({ page = 1, totalPages = 1, total = 0, limit = 20, onPageChange }) {
  if (total === 0) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  return (
    <div className="pagination">
      <span className="pagination-meta">
        {from}–{to} of {total}
      </span>
      <div className="pagination-controls">
        <button type="button" className="btn outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </button>
        <span className="pagination-meta">Page {page} / {totalPages}</span>
        <button type="button" className="btn outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}
