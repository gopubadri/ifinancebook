import React, { createContext, useContext, useEffect, useState } from 'react'

// AuthContext is the single source of truth for "is someone logged in, and who".
// In this demo build there is no real backend: logging in just stores a small
// user object in localStorage so a page refresh doesn't kick you back to /login.
// Swap `login()` below for a real API call when you wire up a backend.

const AuthContext = createContext(null)

const DEMO_USERS = [
  { username: 'admin', password: 'demo123', name: 'RAJA', role: 'ADMIN' },
  { username: 'clerk', password: 'demo123', name: 'DURGA', role: 'CLERK' },
  { username: 'line', password: 'demo123', name: 'KISHORE', role: 'LINE EXECUTIVE' },
]

const STORAGE_KEY = 'ifinance_session'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { /* ignore corrupt session */ }
    }
    setReady(true)
  }, [])

  function login(username, password) {
    const match = DEMO_USERS.find(
      (u) => u.username === username.trim().toLowerCase() && u.password === password
    )
    if (!match) return { ok: false, error: 'Invalid username or password.' }
    const session = { name: match.name, role: match.role, username: match.username }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
    return { ok: true }
  }

  function loginDemo() {
    const session = { name: 'RAJA', role: 'ADMIN', username: 'admin' }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    setUser(session)
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, loginDemo, logout, demoUsers: DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
