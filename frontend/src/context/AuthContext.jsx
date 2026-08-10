import React, { createContext, useContext, useEffect, useState } from 'react'
import * as api from '../data/api.js'

const AuthContext = createContext(null)
const STORAGE_KEY = 'ifinance_session'

function saveSession(result, setUser) {
  const session = { token: result.token, user: result.user }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  setUser({ ...result.user, token: result.token })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const session = JSON.parse(saved)
        if (session?.token && session?.user) {
          setUser({ ...session.user, token: session.token })
        }
      } catch {
        /* ignore corrupt session */
      }
    }
    setReady(true)
  }, [])

  async function login(username, password) {
    try {
      const result = await api.login(username, password)
      if (!result.ok) return { ok: false, error: result.error || 'Login failed.' }
      saveSession(result, setUser)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'Login failed.' }
    }
  }

  async function register({ username, password, name, role }) {
    try {
      const result = await api.register({ username, password, name, role })
      if (!result.ok) return { ok: false, error: result.error || 'Registration failed.' }
      saveSession(result, setUser)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message || 'Registration failed.' }
    }
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
