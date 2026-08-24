import { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../api/api.js'

const AuthContext = createContext(null)
const KEY = 'ifinance_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
      if (saved?.token && saved?.user) {
        setUser({ ...saved.user, token: saved.token })
      }
    } catch {
      // ignore bad session
    }
    setReady(true)
  }, [])

  function save(result) {
    localStorage.setItem(KEY, JSON.stringify({ token: result.token, user: result.user }))
    setUser({ ...result.user, token: result.token })
  }

  async function login(username, password) {
    try {
      const result = await api.login(username, password)
      if (!result.ok) return { ok: false, error: result.error || 'Login failed' }
      save(result)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  async function register(data) {
    try {
      const result = await api.register(data)
      if (!result.ok) return { ok: false, error: result.error || 'Register failed' }
      save(result)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }

  function logout() {
    localStorage.removeItem(KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
