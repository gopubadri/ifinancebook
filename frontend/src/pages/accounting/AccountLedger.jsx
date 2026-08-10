import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function AccountLedger() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAccountLedger(id).then(setData).catch((err) => setError(err.message))
  }, [id])

  if (error) return <div className="login-error">{error}</div>
  if (!data) return <Loader label="Loading ledger..." />

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'narration', label: 'Narration', render: (r) => <Link className="row-link" to={`/accounting/journals/${r.entryId}`}>{r.narration || r.description || '—'}</Link> },
    { key: 'referenceType', label: 'Source' },
    { key: 'debit', label: 'Debit', numeric: true, render: (r) => (r.debit ? inr(r.debit) : '') },
    { key: 'credit', label: 'Credit', numeric: true, render: (r) => (r.credit ? inr(r.credit) : '') },
    { key: 'balance', label: 'Balance', numeric: true, render: (r) => inr(r.balance) },
  ]

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'All Accounts', to: '/accounting/accounts' },
        { label: data.account.name },
      ]} />
      <div className="page-header">
        <h1>{data.account.name}
          <span className="count"> · {data.account.subMaster}</span>
        </h1>
        <Link className="btn outline" to="/accounting/accounts">Back</Link>
      </div>
      <DataTable columns={columns} rows={data.lines} emptyMessage="No postings on this account yet." />
    </div>
  )
}
