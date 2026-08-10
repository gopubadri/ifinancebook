import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function JournalDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getJournal(id).then(setData).catch((err) => setError(err.message))
  }, [id])

  if (error) return <div className="login-error">{error}</div>
  if (!data) return <Loader label="Loading journal..." />

  const columns = [
    { key: 'accountName', label: 'Account' },
    { key: 'description', label: 'Description' },
    { key: 'debit', label: 'Debit', numeric: true, render: (r) => (r.debit ? inr(r.debit) : '') },
    { key: 'credit', label: 'Credit', numeric: true, render: (r) => (r.credit ? inr(r.credit) : '') },
  ]

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Journals', to: '/accounting/journals' },
        { label: `JE#${data.id}` },
      ]} />
      <div className="page-header">
        <h1>Journal #{data.id}</h1>
        <Link className="btn outline" to="/accounting/journals">Back</Link>
      </div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-body">
          <div className="field-grid">
            <div className="field"><label>Date</label><input readOnly value={data.date} /></div>
            <div className="field"><label>Source</label><input readOnly value={`${data.referenceType || ''} ${data.referenceId || ''}`} /></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Narration</label><input readOnly value={data.narration || ''} /></div>
          </div>
        </div>
      </div>
      <DataTable columns={columns} rows={data.lines} />
    </div>
  )
}
