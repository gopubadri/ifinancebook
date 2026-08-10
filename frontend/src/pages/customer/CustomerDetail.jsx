import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'

function Panel({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="panel">
      <div className="panel-header">
        {title}
        <button type="button" onClick={() => setOpen((o) => !o)}>{open ? 'Hide ▲' : 'Show ▼'}</button>
      </div>
      {open && <div className="panel-body">{children}</div>}
    </div>
  )
}

export default function CustomerDetail() {
  const { customer, refreshCustomer } = useOutletContext()
  const [form, setForm] = useState(customer)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(customer)
  }, [customer])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const updated = await api.updateCustomer(customer.id, form)
      setForm(updated)
      if (refreshCustomer) await refreshCustomer()
      setMessage('Customer updated. Closed/Seized status now syncs across dashboard stats and reports.')
    } catch (err) {
      setError(err.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>{form.name}</h1>
      {message && <div className="login-error" style={{ background: '#e9f5ec', color: 'var(--success)', marginBottom: 12 }}>{message}</div>}
      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      <form onSubmit={submit}>
        <Panel title="Vehicle Details" defaultOpen>
          <div className="field-grid">
            <div className="field"><label>HP #</label><input value={form.hpNo} readOnly /></div>
            <div className="field"><label>Reg. No</label><input value={form.regNo || ''} onChange={(e) => set('regNo', e.target.value)} /></div>
            <div className="field"><label>Makers #</label><input value={form.makersNo || ''} onChange={(e) => set('makersNo', e.target.value)} /></div>
            <div className="field"><label>Model</label><input value={form.model || ''} onChange={(e) => set('model', e.target.value)} /></div>
            <div className="field"><label>Chasis No</label><input value={form.chasisNo || ''} onChange={(e) => set('chasisNo', e.target.value)} /></div>
            <div className="field"><label>Eng No</label><input value={form.engNo || ''} onChange={(e) => set('engNo', e.target.value)} /></div>
            <div className="field"><label>CLR H.P.N. Date</label><input type="date" value={form.clrDate || ''} onChange={(e) => set('clrDate', e.target.value)} /></div>
            <div className="field"><label>EMI Date</label><input type="date" value={form.emiDate || ''} onChange={(e) => set('emiDate', e.target.value)} /></div>
            <div className="field">
              <label>Seized</label>
              <select value={form.seized} onChange={(e) => set('seized', e.target.value)}>
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
            </div>
            <div className="field">
              <label>Seized Date</label>
              <input type="date" value={form.seizedDate || ''} onChange={(e) => set('seizedDate', e.target.value)} disabled={form.seized !== 'YES'} />
            </div>
            <div className="field">
              <label>Closed</label>
              <select value={form.closed} onChange={(e) => set('closed', e.target.value)}>
                <option value="NO">NO</option>
                <option value="YES">YES</option>
              </select>
            </div>
            <div className="field">
              <label>Closed Date</label>
              <input type="date" value={form.closedDate || ''} onChange={(e) => set('closedDate', e.target.value)} disabled={form.closed !== 'YES'} />
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={!!form.cb} onChange={(e) => set('cb', e.target.checked)} />
              <label style={{ margin: 0 }}>C-Book received</label>
            </div>
          </div>
        </Panel>

        <Panel title="Finance Information">
          <div className="field-grid">
            <div className="field"><label>EMI Period (months)</label><input value={form.emiPeriod} readOnly /></div>
            <div className="field"><label>EMI Amount</label><input value={form.emiAmount} readOnly /></div>
            <div className="field"><label>Name</label><input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="field"><label>Village</label><input value={form.village || ''} onChange={(e) => set('village', e.target.value)} /></div>
            <div className="field"><label>Street</label><input value={form.street || ''} onChange={(e) => set('street', e.target.value)} /></div>
            <div className="field"><label>City</label><input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
            <div className="field"><label>State</label><input value={form.state || ''} onChange={(e) => set('state', e.target.value)} /></div>
            <div className="field"><label>Mobile</label><input value={form.mobile || ''} onChange={(e) => set('mobile', e.target.value)} /></div>
            <div className="field"><label>Alternate Mobile</label><input value={form.alternateMobile || ''} onChange={(e) => set('alternateMobile', e.target.value)} /></div>
          </div>
        </Panel>

        <Panel title="Communications">
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No SMS or call logs recorded for this account yet.</p>
        </Panel>

        <Panel title="Attachments">
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No KYC documents or vehicle photos uploaded yet.</p>
        </Panel>

        <button className="btn brass" style={{ marginTop: 6 }} disabled={saving} type="submit">
          {saving ? 'Updating...' : 'Update'}
        </button>
      </form>
    </div>
  )
}
