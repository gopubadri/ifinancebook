import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function ChartOfAccounts() {
  const [rows, setRows] = useState(null)
  const [subs, setSubs] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', subMasterId: '', village: 'NIL', code: '' })

  async function load() {
    const [accounts, subMasters] = await Promise.all([api.getAccounts(), api.getSubMasters()])
    setRows(accounts)
    setSubs(subMasters)
    if (!form.subMasterId && subMasters[0]) {
      setForm((f) => ({ ...f, subMasterId: String(subMasters[0].id) }))
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createAccount({
        name: form.name,
        subMasterId: Number(form.subMasterId),
        village: form.village,
        code: form.code || null,
      })
      setShowForm(false)
      setForm((f) => ({ ...f, name: '', code: '' }))
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!rows) return <Loader label="Loading chart of accounts..." />

  const columns = [
    { key: 'code', label: 'Code', render: (r) => r.code || '—' },
    { key: 'name', label: 'Account', render: (r) => <Link className="row-link" to={`/accounting/accounts/${r.id}`}>{r.name}</Link> },
    { key: 'subMaster', label: 'Sub Master' },
    { key: 'master', label: 'Master' },
    { key: 'balance', label: 'Balance', numeric: true, render: (r) => inr(r.balance) },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'All Accounts' }]} />
      <div className="page-header">
        <h1>Chart of Accounts <span className="count">({rows.length})</span>
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 3</span>
        </h1>
        <button className="btn brass" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Account'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Double-entry ledger accounts. Balances come from journal postings (receipts, income/expense, manual journals).
      </p>

      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      {showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-header">New ledger account</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="field"><label>Code</label><input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
              <div className="field">
                <label>Sub Master</label>
                <select required value={form.subMasterId} onChange={(e) => setForm((f) => ({ ...f, subMasterId: e.target.value }))}>
                  {subs.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.masterName})</option>)}
                </select>
              </div>
              <div className="field"><label>Village</label><input value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))} /></div>
            </div>
            <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">{saving ? 'Saving...' : 'Save account'}</button>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={rows} />
    </div>
  )
}
