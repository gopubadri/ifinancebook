import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

export default function Settings() {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    api.getSettings().then((d) => { if (alive) setForm(d) })
    return () => { alive = false }
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function submit(e) {
    e.preventDefault()
    setSaving(true)
    api.saveSettings(form).then(() => { setSaving(false); setSaved(true) })
  }

  if (!form) return <Loader label="Loading settings..." />

  const yn = (field) => (
    <select value={form[field]} onChange={(e) => set(field, e.target.value)}>
      <option value="YES">YES</option>
      <option value="NO">NO</option>
    </select>
  )

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }]} />
      <h1 style={{ marginBottom: 16 }}>Settings</h1>

      <form onSubmit={submit}>
        {saved && <div className="login-error" style={{ background: '#e9f5ec', color: 'var(--success)' }}>Settings saved.</div>}

        <div className="panel">
          <div className="panel-header">EMI &amp; Interest Rules</div>
          <div className="panel-body field-grid">
            <div className="field"><label>EMI Frequency</label>{yn('emiFrequency')}</div>
            <div className="field"><label>Day Scroll Protect</label>{yn('dayScrollProtect')}</div>
            <div className="field"><label>Auto Date</label>{yn('autoDate')}</div>
            <div className="field"><label>Out Payment Interest</label><input type="number" value={form.outPaymentInterest} onChange={(e) => set('outPaymentInterest', e.target.value)} /></div>
            <div className="field"><label>OD Interest</label><input type="number" step="0.01" value={form.odInterest} onChange={(e) => set('odInterest', e.target.value)} /></div>
            <div className="field"><label>Settlement Interest</label><input type="number" value={form.settlementInterest} onChange={(e) => set('settlementInterest', e.target.value)} /></div>
            <div className="field"><label>Consultancy Interest</label><input type="number" value={form.consultancyInterest} onChange={(e) => set('consultancyInterest', e.target.value)} /></div>
            <div className="field">
              <label>Handloan Type</label>
              <select value={form.handloanType} onChange={(e) => set('handloanType', e.target.value)}>
                <option>Type 1</option><option>Type 2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Receipt Series</div>
          <div className="panel-body field-grid">
            <div className="field"><label>HP Rcpt Series</label><input value={form.hpRcptSeries} onChange={(e) => set('hpRcptSeries', e.target.value)} /></div>
            <div className="field"><label>HPHL Rcpt Series</label><input value={form.hphlRcptSeries} onChange={(e) => set('hphlRcptSeries', e.target.value)} /></div>
            <div className="field"><label>HPOP Rcpt Series</label><input value={form.hpopRcptSeries} onChange={(e) => set('hpopRcptSeries', e.target.value)} /></div>
            <div className="field"><label>HP OD Rcpt Series</label><input value={form.hpOdRcptSeries} onChange={(e) => set('hpOdRcptSeries', e.target.value)} /></div>
            <div className="field"><label>HL Rcpt Series</label><input value={form.hlRcptSeries} onChange={(e) => set('hlRcptSeries', e.target.value)} /></div>
            <div className="field"><label>HP OP Due Date</label>{yn('hpOpDueDate')}</div>
            <div className="field"><label>Messages Count</label><input value={form.messagesCount} readOnly /></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Business Address</div>
          <div className="panel-body field-grid">
            <div className="field"><label>City / Town</label><input value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
            <div className="field"><label>Street</label><input value={form.street} onChange={(e) => set('street', e.target.value)} /></div>
            <div className="field"><label>Mobile</label><input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></div>
            <div className="field"><label>Alternate Mobile</label><input value={form.alternateMobile} onChange={(e) => set('alternateMobile', e.target.value)} /></div>
            <div className="field"><label>State</label><input value={form.state} onChange={(e) => set('state', e.target.value)} /></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Bank Details</div>
          <div className="panel-body field-grid">
            <div className="field"><label>Bank Acc No</label><input value={form.bankAccNo} onChange={(e) => set('bankAccNo', e.target.value)} /></div>
            <div className="field"><label>Bank Name</label><input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></div>
            <div className="field"><label>IFSC Code</label><input value={form.ifscCode} onChange={(e) => set('ifscCode', e.target.value)} /></div>
            <div className="field"><label>Branch Name</label><input value={form.branchName} onChange={(e) => set('branchName', e.target.value)} /></div>
          </div>
        </div>

        <button className="btn brass" disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
      </form>
    </div>
  )
}
