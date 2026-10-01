import { useState } from 'react'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'

export default function Account() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await api.changePassword({ currentPassword, password })
      setCurrentPassword('')
      setPassword('')
      setMessage('Password updated.')
    } catch (err) {
      setError(err.message || 'Could not change the password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Account' }]} />
      <h1 style={{ marginBottom: 8 }}>Account</h1>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.name} · {user?.username} · {user?.role}</p>
      <form className="panel" style={{ maxWidth: 420 }} onSubmit={submit}>
        <div className="panel-header">Change password</div>
        <div className="panel-body">
          {error && <div className="login-error">{error}</div>}
          {message && <div className="login-error" style={{ background: '#e9f5ec', color: 'var(--success)' }}>{message}</div>}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Current password</label>
            <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>New password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn brass" disabled={saving} type="submit">{saving ? 'Saving...' : 'Update password'}</button>
        </div>
      </form>
    </div>
  )
}
