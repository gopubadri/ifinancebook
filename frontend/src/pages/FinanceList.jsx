import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'
import Pagination from '../components/Pagination.jsx'

const PAGE_SIZE = 20

export default function FinanceList() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)

  const [data, setData] = useState(null)
  const [searchInput, setSearchInput] = useState(q)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api.getCustomers(q, { page, limit: PAGE_SIZE })
      .then((res) => { if (alive) setData(res) })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'Failed to load finances.')
        setData({ items: [], total: 0, page: 1, totalPages: 1, limit: PAGE_SIZE })
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [q, page])

  function applySearch(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    const term = searchInput.trim()
    if (term) next.set('q', term)
    next.set('page', '1')
    setParams(next)
  }

  function setPage(nextPage) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    if (q) next.set('q', q)
    setParams(next)
  }

  const columns = [
    {
      key: 'sno',
      label: 'SNo',
      render: (_, i) => ((data?.page || page) - 1) * PAGE_SIZE + i + 1,
    },
    { key: 'hpNo', label: 'HP No', render: (r) => <Link className="row-link" to={`/finance/${r.id}`}>{r.hpNo}</Link> },
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile', render: (r) => r.mobile ? <a href={`tel:${r.mobile}`}>{r.mobile}</a> : '—' },
    { key: 'regNo', label: 'Reg No' },
    { key: 'village', label: 'Village' },
    { key: 'emiPeriod', label: 'EMI Period', numeric: true },
    { key: 'emiAmount', label: 'EMI Amount', numeric: true, render: (r) => inr(r.emiAmount) },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: "Finance's" }]} />
      <div className="page-header">
        <h1>Finance&apos;s {data && <span className="count">({data.total})</span>}</h1>
        <Link to="/finance/new" className="btn brass">+ New Finance</Link>
      </div>

      <form className="list-toolbar" onSubmit={applySearch}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search HP no, name, mobile, reg no, village…"
        />
        <button className="btn brass" type="submit">Search</button>
        {q && (
          <button
            className="btn outline"
            type="button"
            onClick={() => { setSearchInput(''); setParams({ page: '1' }) }}
          >
            Clear
          </button>
        )}
      </form>

      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      {q && !loading && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -6, marginBottom: 14 }}>
          Showing results for &quot;{q}&quot; ({data?.total || 0} match{(data?.total || 0) === 1 ? '' : 'es'})
        </p>
      )}

      {loading || !data ? <Loader label="Fetching customer records..." /> : (
        <>
          <DataTable columns={columns} rows={data.items} emptyMessage="No finances match your search." />
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
