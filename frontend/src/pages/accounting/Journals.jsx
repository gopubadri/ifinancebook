import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'
import Pagination from '../../components/Pagination.jsx'

const emptyLine = () => ({ accountId: '', debit: '', credit: '', description: '' })

export default function Journals() {
  const [rows, setRows] = useState(null)
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showOpening, setShowOpening] = useState(false)
  const [opening, setOpening] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    accountId: '',
    contraAccountId: '',
    amount: '',
    side: 'debit',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [narration, setNarration] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState([emptyLine(), emptyLine()])

  async function load(nextPage = page) {
    const [journals, accs] = await Promise.all([
      api.getJournals({ page: nextPage, limit: 50 }),
      api.getAccounts(),
    ])
    setRows(journals.items || [])
    setMeta(journals)
    setPage(journals.page || nextPage)
    setAccounts(accs)
  }

  useEffect(() => {
    load(1).catch((err) => setError(err.message))
  }, [])

  function setLine(i, field, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createJournal({
        entryDate,
        narration,
        lines: lines.map((l) => ({
          accountId: Number(l.accountId),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description,
        })),
      })
      setShowForm(false)
      setNarration('')
      setLines([emptyLine(), emptyLine()])
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!rows) return <Loader label="Loading journals..." />

  const columns = [
    { key: 'id', label: 'JE#' },
    { key: 'date', label: 'Date' },
    { key: 'narration', label: 'Narration', render: (r) => <Link className="row-link" to={`/accounting/journals/${r.id}`}>{r.narration || '(no narration)'}</Link> },
    { key: 'referenceType', label: 'Source' },
    { key: 'debit', label: 'Debit', numeric: true, render: (r) => inr(r.debit) },
    { key: 'credit', label: 'Credit', numeric: true, render: (r) => inr(r.credit) },
    { key: 'createdBy', label: 'By' },
  ]

  const totalDr = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalCr = lines.reduce((s, l) => s + Number(l.credit || 0), 0)

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Journals' }]} />
      <div className="page-header">
        <h1>Journals <span className="count">({meta?.total ?? rows.length})</span>
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 3</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {rows.length > 0 && (
            <button
              type="button"
              className="btn outline"
              onClick={() => exportCsv('journals', [
                { label: 'JE#', key: 'id' },
                { label: 'Date', key: 'date' },
                { label: 'Narration', key: 'narration' },
                { label: 'Source', key: 'referenceType' },
                { label: 'Debit', key: 'debit' },
                { label: 'Credit', key: 'credit' },
                { label: 'By', key: 'createdBy' },
              ], rows)}
            >
              Excel
            </button>
          )}
          <button className="btn outline" type="button" onClick={() => { setShowOpening((v) => !v); setShowForm(false) }}>
            {showOpening ? 'Cancel' : 'Opening balance'}
          </button>
          <button className="btn brass" type="button" onClick={() => { setShowForm((v) => !v); setShowOpening(false) }}>
            {showForm ? 'Cancel' : '+ Manual Entry'}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Auto posts are created from EMI receipts and Income/Expense bills. You can also enter manual journals (must balance).
      </p>

      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      {showOpening && (
        <form
          className="panel"
          style={{ marginBottom: 16 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            setError('')
            try {
              await api.postOpening({
                ...opening,
                accountId: Number(opening.accountId),
                contraAccountId: Number(opening.contraAccountId),
                amount: Number(opening.amount),
              })
              setShowOpening(false)
              await load(page)
            } catch (err) {
              setError(err.message)
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="panel-header">Opening balance</div>
          <div className="panel-body field-grid">
            <div className="field"><label>Date</label><input type="date" value={opening.entryDate} onChange={(e) => setOpening((f) => ({ ...f, entryDate: e.target.value }))} /></div>
            <div className="field">
              <label>Account</label>
              <select required value={opening.accountId} onChange={(e) => setOpening((f) => ({ ...f, accountId: e.target.value }))}>
                <option value="">Select...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Contra account</label>
              <select required value={opening.contraAccountId} onChange={(e) => setOpening((f) => ({ ...f, contraAccountId: e.target.value }))}>
                <option value="">Select...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Side</label>
              <select value={opening.side} onChange={(e) => setOpening((f) => ({ ...f, side: e.target.value }))}>
                <option value="debit">Debit the account</option>
                <option value="credit">Credit the account</option>
              </select>
            </div>
            <div className="field"><label>Amount</label><input required type="number" min="1" step="0.01" value={opening.amount} onChange={(e) => setOpening((f) => ({ ...f, amount: e.target.value }))} /></div>
            <button className="btn brass" disabled={saving} type="submit">{saving ? 'Posting...' : 'Post opening'}</button>
          </div>
        </form>
      )}

      {showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-header">Manual journal entry</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field"><label>Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Narration</label><input required value={narration} onChange={(e) => setNarration(e.target.value)} /></div>
            </div>
            {lines.map((line, i) => (
              <div className="field-grid" key={i} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--rule)' }}>
                <div className="field">
                  <label>Account</label>
                  <select required value={line.accountId} onChange={(e) => setLine(i, 'accountId', e.target.value)}>
                    <option value="">Select...</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Debit</label><input type="number" min="0" step="0.01" value={line.debit} onChange={(e) => setLine(i, 'debit', e.target.value)} /></div>
                <div className="field"><label>Credit</label><input type="number" min="0" step="0.01" value={line.credit} onChange={(e) => setLine(i, 'credit', e.target.value)} /></div>
                <div className="field"><label>Description</label><input value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)} /></div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn outline sm" onClick={() => setLines((l) => [...l, emptyLine()])}>+ Line</button>
              <span style={{ fontSize: 13, color: totalDr === totalCr ? 'var(--success)' : 'var(--danger)' }}>
                Dr {inr(totalDr)} / Cr {inr(totalCr)} {totalDr === totalCr ? '✓ balanced' : '✗ not balanced'}
              </span>
              <button className="btn brass" disabled={saving || totalDr !== totalCr || totalDr === 0} type="submit">
                {saving ? 'Posting...' : 'Post journal'}
              </button>
            </div>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={rows} emptyMessage="No journal entries yet." />
      {meta && (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={(p) => load(p).catch((err) => setError(err.message))}
        />
      )}
    </div>
  )
}
