import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { user, login, loginDemo } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  function handleSubmit(e) {
    e.preventDefault()
    const result = login(username, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate('/dashboard')
  }

  function handleDemoLogin() {
    loginDemo()
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

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>
          <button type="submit" className="btn brass">Sign in</button>
        </form>

        <div className="login-divider">or</div>

        <button type="button" className="btn outline" onClick={handleDemoLogin}>
          Continue with demo login →
        </button>

        <p className="login-demo-note">
          Demo credentials: <strong>admin</strong> / <strong>demo123</strong> (also try{' '}
          <strong>clerk</strong> or <strong>line</strong>, same password).<br />
          No real account is needed — "Continue with demo login" signs you in instantly.
        </p>
      </div>
    </div>
  )
}
