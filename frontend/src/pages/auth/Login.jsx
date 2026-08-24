import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'

export default function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('CLERK')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    const result = mode === 'login'
      ? await login(username, password)
      : await register({ username, password, name, role })

    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/dashboard')
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">iF</span>
          <h1>iFinance</h1>
          <p>Vehicle Finance &amp; Accounting</p>
        </div>

        <div className="login-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>
            Sign in
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError('') }}>
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          {mode === 'register' && (
            <>
              <div className="field">
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="CLERK">CLERK</option>
                  <option value="LINE EXECUTIVE">LINE EXECUTIVE</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </>
          )}

          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 6 : undefined}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>
          <button type="submit" className="btn brass" disabled={busy}>
            {busy ? 'Please wait...' : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>
      </div>
    </div>
  )
}
