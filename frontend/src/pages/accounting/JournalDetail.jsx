import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function JournalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [reversing, setReversing] = useState(false)

  useEffect(() => {
    api.getJournal(id).then(setData).catch((err) => setError(err.message))
  }, [id])

  async function onReverse() {
    if (!window.confirm(`Reverse journal #${data.id}? This posts an opposite entry.`)) return
    setReversing(true)
    setError('')
    try {
      const result = await api.reverseJournal(data.id)
      navigate(`/accounting/journals/${result.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setReversing(false)
    }
  }

  function onExport() {
    exportCsv(`journal-${data.id}`, [
      { label: 'Account', key: 'accountName' },
      { label: 'Description', key: 'description' },
      { label: 'Debit', key: 'debit' },
      { label: 'Credit', key: 'credit' },
    ], data.lines)
  }

  if (error && !data) return <div className="login-error">{error}</div>
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
        <h1>
          Journal #{data.id}
          {data.referenceType === 'REVERSE' && (
            <span className="stamp" style={{ marginLeft: 10, fontSize: 11 }}>Reversal</span>
          )}
          {data.reversedById && (
            <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Reversed</span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn outline sm" onClick={onExport}>Excel</button>
          {data.canReverse && (
            <button type="button" className="btn outline sm" disabled={reversing} onClick={onReverse}>
              {reversing ? 'Reversing…' : 'Reverse'}
            </button>
          )}
          {data.reversedById && (
            <Link className="btn outline sm" to={`/accounting/journals/${data.reversedById}`}>
              View reversal #{data.reversedById}
            </Link>
          )}
          <Link className="btn outline sm" to="/accounting/journals">Back</Link>
        </div>
      </div>
      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
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
