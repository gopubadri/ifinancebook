import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as api from '../api/api.js'

const TRANSACTIONS = [
  ['HandLoans', '/module/handloans-new'],
  ['Consultancy', '/consultancy'],
  ['Capitals', '/module/capitals'],
  ['Deposits', '/module/deposits'],
  ['Cheques', '/module/cheques'],
  ['Bank', '/module/banks-new'],
  ['Chits', '/module/chits-new'],
  ['Loans', '/module/loans-new'],
  ['Credit Transactions', '/module/credit-transactions-new'],
  ['Investments', '/module/investments-new'],
  ['Assets', '/module/assets-new'],
  ['Deposits(DP) New', '/module/deposits-dp-new'],
  ['Inc & Exp Accounts', '/module/income-expenses-new'],
  ['Journals', '/accounting/journals'],
  ['Hand Loans Type 2', '/module/hand-loans'],
]

const OTHERS = [
  ['Income & Expense', '/module/income-expense-transactions'],
  ['RTA', '/module/rta'],
  ['All Accounts', '/accounting/accounts'],
  ['Sub Masters', '/accounting/sub-masters'],
  ['Trial Balance', '/accounting/trial-balance'],
  ['Agents', '/module/agents'],
  ['Branches', '/module/branches'],
]

function Dropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="nav-item" ref={ref} onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>
      {label} <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      {open && (
        <div className="nav-dropdown" onClick={() => setOpen(false)}>
          {items.map(([text, to]) => <Link key={text} to={to}>{text}</Link>)}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setMenuOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    let alive = true
    const t = setTimeout(() => {
      api.globalSearch(q, 4)
        .then((data) => { if (alive) { setResults(data); setOpen(true) } })
        .catch(() => { if (alive) setResults(null) })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [query])

  function searchAll(e) {
    e?.preventDefault?.()
    const q = query.trim()
    if (!q) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  function go(to) {
    setOpen(false)
    setQuery('')
    navigate(to)
  }

  const modules = (results?.modules || [])
    .flatMap((m) => (m.items || []).slice(0, 2))
    .slice(0, 6)

  function group(title, items) {
    if (!items?.length) return null
    return (
      <>
        <div className="nav-search-heading">{title}</div>
        {items.map((item) => (
          <button
            key={title + (item.id || item.title) + item.to}
            type="button"
            className="nav-search-item"
            onClick={() => go(item.to)}
          >
            <strong>{item.title}</strong>
            <span>{item.subtitle}</span>
          </button>
        ))}
      </>
    )
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">iF</span> iFinance
        </Link>
        <Dropdown label="Transactions" items={TRANSACTIONS} />
        <Dropdown label="Others" items={OTHERS} />
        <Link to="/finance" className="nav-item">Finance&apos;s</Link>

        <div className="nav-spacer" />

        <div className="nav-search-wrap" ref={searchRef}>
          <form className="nav-search" onSubmit={searchAll}>
            <input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results) setOpen(true) }}
            />
          </form>
          {open && query.trim().length >= 2 && (
            <div className="nav-search-results">
              {!results && <div className="nav-search-empty">Searching...</div>}
              {results && !(results.pages?.length || results.customers?.length || modules.length) && (
                <div className="nav-search-empty">No matches. Press Enter for full search.</div>
              )}
              {group('Folders', results?.pages)}
              {group('Finances', results?.customers)}
              {group('Consultancy', results?.bikes)}
              {group('Modules', modules)}
              {group('Accounts', results?.accounts)}
              {group('Users', results?.users)}
              {results && (
                <button type="button" className="nav-search-footer" onClick={searchAll}>
                  View all for &quot;{query.trim()}&quot;
                </button>
              )}
            </div>
          )}
        </div>

        <div className="nav-item" ref={userRef} onClick={() => setMenuOpen(!menuOpen)} style={{ cursor: 'pointer', padding: 0 }}>
          <div className="nav-user">
            <span className="nav-avatar">{user?.name?.charAt(0) || '?'}</span>
            {user?.name} ▼
          </div>
          {menuOpen && (
            <div className="nav-dropdown" style={{ right: 0, left: 'auto', minWidth: 160 }}>
              <div style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--muted)' }}>{user?.role}</div>
              <Link to="/settings">Settings</Link>
              <button onClick={logout}>Log out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
