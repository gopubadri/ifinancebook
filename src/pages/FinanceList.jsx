import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'

export default function FinanceList() {
  const [customers, setCustomers] = useState(null)
  const [params] = useSearchParams()
  const q = (params.get('q') || '').toLowerCase()

  useEffect(() => {
    let alive = true
    api.getCustomers().then((data) => { if (alive) setCustomers(data) })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    if (!customers) return null
    if (!q) return customers
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.hpNo.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.village.toLowerCase().includes(q)
    )
  }, [customers, q])

  const columns = [
    { key: 'sno', label: 'SNo', render: (_, i) => i + 1 },
    { key: 'hpNo', label: 'HP No', render: (r) => <Link className="row-link" to={`/finance/${r.id}`}>{r.hpNo}</Link> },
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile', render: (r) => <a href={`tel:${r.mobile}`}>{r.mobile}</a> },
    { key: 'regNo', label: 'Reg No' },
    { key: 'village', label: 'Village' },
    { key: 'emiPeriod', label: 'EMI Period', numeric: true },
    { key: 'emiAmount', label: 'EMI Amount', numeric: true, render: (r) => inr(r.emiAmount) },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: "Finance's" }]} />
      <div className="page-header">
        <h1>Finance's {customers && <span className="count">({customers.length})</span>}</h1>
        <button className="btn brass">+ New Finance</button>
      </div>
      {q && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -10, marginBottom: 14 }}>
          Showing results for "{q}" {filtered && `(${filtered.length} match${filtered.length === 1 ? '' : 'es'})`}
        </p>
      )}
      {!customers ? <Loader label="Fetching customer records..." /> : (
        <DataTable columns={columns} rows={filtered} emptyMessage="No finances match your search." />
      )}
    </div>
  )
}
