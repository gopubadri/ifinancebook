import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'

const initial = {
  hpNo: '',
  name: '',
  mobile: '',
  regNo: '',
  village: '',
  emiPeriod: 12,
  emiAmount: '',
  makersNo: '',
  model: '',
  chasisNo: '',
  engNo: '',
  cb: false,
  clrDate: new Date().toISOString().slice(0, 10),
  emiDate: new Date().toISOString().slice(0, 10),
  seized: 'NO',
  closed: 'NO',
}

export default function NewFinance() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await api.createCustomer({
        ...form,
        emiPeriod: Number(form.emiPeriod),
        emiAmount: Number(form.emiAmount),
      })
      navigate(`/finance/${created.id}`)
    } catch (err) {
      setError(err.message || 'Could not create finance.')
      setSaving(false)
    }
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: "Finance's", to: '/finance' },
        { label: 'New Finance' },
      ]} />

      <div className="page-header">
        <h1>New Finance</h1>
        <Link to="/finance" className="btn outline">Cancel</Link>
      </div>

      <form onSubmit={submit}>
        {error && <div className="login-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-header">Customer &amp; Vehicle</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field">
                <label>HP No *</label>
                <input required value={form.hpNo} onChange={(e) => set('hpNo', e.target.value)} placeholder="e.g. SAFTPG0100" />
              </div>
              <div className="field">
                <label>Name *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Customer full name" />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="10-digit mobile" />
              </div>
              <div className="field">
                <label>Village</label>
                <input value={form.village} onChange={(e) => set('village', e.target.value)} />
              </div>
              <div className="field">
                <label>Reg. No</label>
                <input value={form.regNo} onChange={(e) => set('regNo', e.target.value)} />
              </div>
              <div className="field">
                <label>Makers #</label>
                <input value={form.makersNo} onChange={(e) => set('makersNo', e.target.value)} placeholder="HERO / HONDA / TVS" />
              </div>
              <div className="field">
                <label>Model</label>
                <input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="2026" />
              </div>
              <div className="field">
                <label>Chasis No</label>
                <input value={form.chasisNo} onChange={(e) => set('chasisNo', e.target.value)} />
              </div>
              <div className="field">
                <label>Eng No</label>
                <input value={form.engNo} onChange={(e) => set('engNo', e.target.value)} />
              </div>
              <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
                <input type="checkbox" style={{ width: 'auto' }} checked={form.cb} onChange={(e) => set('cb', e.target.checked)} />
                <label style={{ margin: 0 }}>C-Book received</label>
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">Finance Terms</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field">
                <label>EMI Period (months) *</label>
                <input required type="number" min="1" value={form.emiPeriod} onChange={(e) => set('emiPeriod', e.target.value)} />
              </div>
              <div className="field">
                <label>EMI Amount *</label>
                <input required type="number" min="1" step="0.01" value={form.emiAmount} onChange={(e) => set('emiAmount', e.target.value)} />
              </div>
              <div className="field">
                <label>EMI Start Date *</label>
                <input required type="date" value={form.emiDate} onChange={(e) => set('emiDate', e.target.value)} />
              </div>
              <div className="field">
                <label>CLR H.P.N. Date</label>
                <input type="date" value={form.clrDate} onChange={(e) => set('clrDate', e.target.value)} />
              </div>
              <div className="field">
                <label>Seized</label>
                <select value={form.seized} onChange={(e) => set('seized', e.target.value)}>
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>
              <div className="field">
                <label>Closed</label>
                <select value={form.closed} onChange={(e) => set('closed', e.target.value)}>
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button className="btn brass" disabled={saving} type="submit">
          {saving ? 'Creating...' : 'Create Finance'}
        </button>
      </form>
    </div>
  )
}
