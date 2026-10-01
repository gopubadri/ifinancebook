import { useEffect, useState } from 'react'
import * as api from '../../api/api.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function SubMastersPage() {
  const [rows, setRows] = useState(null)
  const [masters, setMasters] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', masterId: '', normalBalance: 'debit', statement: 'balance_sheet' })

  function load() {
    return Promise.all([api.getSubMasters(), api.getMasters()]).then(([subs, masterRows]) => {
      setRows(subs)
      setMasters(masterRows)
      if (!form.masterId && masterRows[0]) setForm((f) => ({ ...f, masterId: masterRows[0].id }))
    })
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  if (!rows) return <Loader label="Loading sub masters..." />

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Sub Master' },
    { key: 'masterName', label: 'Master' },
    { key: 'normalBalance', label: 'Normal Bal' },
    { key: 'statement', label: 'Statement' },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Sub Masters' }]} />
      <div className="page-header">
        <h1>Sub Masters <span className="count">({rows.length})</span>
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 3</span>
        </h1>
        <button className="btn brass" type="button" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : '+ Sub master'}</button>
      </div>
      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
      {showForm && (
        <form
          className="panel"
          style={{ marginBottom: 16 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            setError('')
            try {
              await api.createSubMaster({ ...form, masterId: Number(form.masterId) })
              setForm((f) => ({ ...f, name: '' }))
              setShowForm(false)
              await load()
            } catch (err) {
              setError(err.message || 'Could not save.')
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="panel-body field-grid">
            <div className="field"><label>Name</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="field">
              <label>Master</label>
              <select value={form.masterId} onChange={(e) => setForm((f) => ({ ...f, masterId: e.target.value }))}>
                {masters.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Normal balance</label>
              <select value={form.normalBalance} onChange={(e) => setForm((f) => ({ ...f, normalBalance: e.target.value }))}>
                <option value="debit">debit</option>
                <option value="credit">credit</option>
              </select>
            </div>
            <div className="field">
              <label>Statement</label>
              <select value={form.statement} onChange={(e) => setForm((f) => ({ ...f, statement: e.target.value }))}>
                <option value="balance_sheet">balance_sheet</option>
                <option value="pnl">pnl</option>
              </select>
            </div>
            <button className="btn brass" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}
      <DataTable columns={columns} rows={rows} />
    </div>
  )
}
