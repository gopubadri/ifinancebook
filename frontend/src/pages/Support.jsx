import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

export default function Support() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    let alive = true
    api.getSettings().then((data) => { if (alive) setSettings(data) })
    return () => { alive = false }
  }, [])

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Support' }]} />
      <div className="page-header">
        <h1>Support</h1>
        <Link to="/settings" className="btn outline">Edit in Settings</Link>
      </div>

      {!settings ? <Loader label="Loading support details..." /> : (
        <div className="panel">
          <div className="panel-header">Company &amp; contact</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field"><label>City</label><input readOnly value={settings.city || ''} /></div>
              <div className="field"><label>Street</label><input readOnly value={settings.street || ''} /></div>
              <div className="field"><label>Mobile</label><input readOnly value={settings.mobile || ''} /></div>
              <div className="field"><label>Alternate</label><input readOnly value={settings.alternateMobile || ''} /></div>
              <div className="field"><label>State</label><input readOnly value={settings.state || ''} /></div>
              <div className="field"><label>Bank</label><input readOnly value={settings.bankName || ''} /></div>
              <div className="field"><label>Account</label><input readOnly value={settings.bankAccNo || ''} /></div>
              <div className="field"><label>IFSC</label><input readOnly value={settings.ifscCode || ''} /></div>
              <div className="field"><label>Branch</label><input readOnly value={settings.branchName || ''} /></div>
              <div className="field"><label>Messages sent</label><input readOnly value={settings.messagesCount ?? ''} /></div>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 12 }}>
              These details come from Settings. Update them there and they appear here immediately.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
