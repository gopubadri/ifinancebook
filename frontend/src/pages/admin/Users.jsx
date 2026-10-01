import { useEffect, useState } from 'react'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'

const emptyForm = {
  name: '',
  username: '',
  password: '',
  role: 'CLERK',
}

export default function Users() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [rows, setRows] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [staff, setStaff] = useState([])
  const [resetId, setResetId] = useState(null)
  const [resetPassword, setResetPassword] = useState('')

  async function loadUsers() {
    const data = await api.getUsers()
    setRows(data)
  }

  useEffect(() => {
    let alive = true
    api.getUsers().then((data) => { if (alive) setRows(data) })
    api.getStaff().then((data) => { if (alive) setStaff(data) }).catch(() => {})
    return () => { alive = false }
  }, [])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setError('')
    try {
      await api.createUser(form)
      setForm(emptyForm)
      setShowForm(false)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Could not create user.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'sno', label: 'SNo', render: (_, i) => i + 1 },
    { key: 'name', label: 'Name' },
    { key: 'username', label: 'Username' },
    { key: 'role', label: 'Role' },
    { key: 'date', label: 'Registered' },
    {
      key: 'reset',
      label: '',
      render: (r) => isAdmin ? (
        <button type="button" className="btn sm outline" onClick={() => { setResetId(r.id); setResetPassword(''); setError('') }}>
          Reset password
        </button>
      ) : null,
    },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Users' }]} />
      <div className="page-header">
        <h1>Users {rows && <span className="count">({rows.length})</span>}</h1>
        {isAdmin ? (
          <button className="btn brass" type="button" onClick={() => { setShowForm((v) => !v); setError('') }}>
            {showForm ? 'Cancel' : '+ New User'}
          </button>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>View only — ask an admin to add users</span>
        )}
      </div>

      {isAdmin && showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-header">Create user (Admin)</div>
          <div className="panel-body">
            {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field-grid">
              <div className="field">
                <label>Display name</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="field">
                <label>Username</label>
                <input required value={form.username} onChange={(e) => set('username', e.target.value)} />
              </div>
              <div className="field">
                <label>Password</label>
                <PasswordInput
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  autoComplete="new-password"
                  placeholder="min 6 characters"
                />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={form.role} onChange={(e) => set('role', e.target.value)}>
                  <option value="CLERK">CLERK</option>
                  <option value="LINE EXECUTIVE">LINE EXECUTIVE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save user'}
            </button>
          </div>
        </form>
      )}

      {isAdmin && resetId && (
        <form
          className="panel"
          style={{ marginBottom: 16 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            setError('')
            try {
              await api.resetUserPassword(resetId, resetPassword)
              setResetId(null)
              setResetPassword('')
            } catch (err) {
              setError(err.message || 'Could not reset the password.')
            } finally {
              setSaving(false)
            }
          }}
        >
          <div className="panel-body">
            <div className="field" style={{ maxWidth: 280 }}>
              <label>New password</label>
              <PasswordInput value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={6} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn brass" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save password'}</button>
              <button className="btn outline" type="button" onClick={() => setResetId(null)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {!rows ? (
        <Loader label="Fetching users..." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          emptyMessage={isAdmin
            ? 'No registered users yet. Use + New User or the Register tab on login.'
            : 'No registered users yet.'}
        />
      )}

      {staff.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: '22px 0 10px' }}>Office staff register</h2>
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'mobile', label: 'Mobile' },
              { key: 'type', label: 'Type' },
              { key: 'joinedOn', label: 'Joined' },
            ]}
            rows={staff}
          />
          <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>This register is not a login. Sign-in accounts are listed above.</p>
        </>
      )}
    </div>
  )
}
