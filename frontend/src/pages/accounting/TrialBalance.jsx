import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function TrialBalance() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getTrialBalance().then(setData).catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="login-error">{error}</div>
  if (!data) return <Loader label="Building trial balance..." />

  const columns = [
    { key: 'code', label: 'Code', render: (r) => r.code || '—' },
    { key: 'name', label: 'Account', render: (r) => <Link className="row-link" to={`/accounting/accounts/${r.id}`}>{r.name}</Link> },
    { key: 'subMaster', label: 'Sub Master' },
    { key: 'debit', label: 'Debit', numeric: true, render: (r) => (r.debit ? inr(r.debit) : '') },
    { key: 'credit', label: 'Credit', numeric: true, render: (r) => (r.credit ? inr(r.credit) : '') },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'Trial Balance' }]} />
      <div className="page-header">
        <h1>Trial Balance
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 3</span>
        </h1>
        <span className={`stamp ${data.balanced ? 'paid' : 'pending'}`}>
          {data.balanced ? 'Balanced' : 'Out of balance'}
        </span>
      </div>
      <DataTable columns={columns} rows={data.rows} />
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
          <span>Totals</span>
          <span>Dr {inr(data.totalDebit)} · Cr {inr(data.totalCredit)}</span>
        </div>
      </div>
    </div>
  )
}
