import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import * as api from '../data/api.js'

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
  ['Journels', '/accounting/journals'],
  ['Hand Loans Type 2', '/module/hand-loans'],
]

const OTHERS = [
  ['Income & Expense', '/module/income-expense-transactions'],
  ['RTA', '/module/rta'],
  ['All Accounts', '/accounting/accounts'],
  ['Masters', '/accounting/sub-masters'],
  ['Sub Masters', '/accounting/sub-masters'],
  ['Trial Balance', '/accounting/trial-balance'],
  ['Lines', '/module/routes'],
  ['Branch Points', '/module/branch-points'],
  ['Agents', '/module/agents'],
  ['Bike Types', '/module/bike-types'],
  ['Branches', '/module/branches'],
  ['Blacklist', '/module/blacklist'],
]

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="nav-item" ref={ref} onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>
      {label} <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      {open && (
        <div className="nav-dropdown" onClick={() => setOpen(false)}>
          {items.map(([text, to]) => (
            <Link key={text} to={to}>{text}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestGroup({ title, items, onPick }) {
  if (!items?.length) return null
  return (
    <>
      <div className="nav-search-heading">{title}</div>
      {items.map((item) => (
        <button
          key={`${title}-${item.to}-${item.id || item.title}`}
          type="button"
          className="nav-search-item"
          onClick={() => onPick(item.to)}
        >
          <strong>{item.title}</strong>
          <span>{item.subtitle}</span>
        </button>
      ))}
    </>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults(null)
      return undefined
    }
    let alive = true
    const timer = setTimeout(() => {
      api.globalSearch(term, 4)
        .then((data) => {
          if (!alive) return
          setResults(data)
          setOpen(true)
        })
        .catch(() => {
          if (alive) setResults(null)
        })
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [query])

  function goFullSearch(e) {
    e?.preventDefault?.()
    const term = query.trim()
    if (!term) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  function pick(to) {
    setOpen(false)
    setQuery('')
    navigate(to)
  }

  const initial = user?.name?.charAt(0) || '?'
  const modulePreview = (results?.modules || []).flatMap((m) =>
    (m.items || []).slice(0, 2).map((item) => ({ ...item, _group: m.label }))
  ).slice(0, 6)

  const hasHits = results && (
    (results.pages?.length || 0) +
    (results.customers?.length || 0) +
    (results.bikes?.length || 0) +
    (results.users?.length || 0) +
    (results.accounts?.length || 0) +
    (results.journals?.length || 0) +
    modulePreview.length
  ) > 0

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">iF</span> iFinance
        </Link>
        <NavDropdown label="Transactions" items={TRANSACTIONS} />
        <NavDropdown label="Others" items={OTHERS} />
        <Link to="/finance" className="nav-item">Finance&apos;s</Link>

        <div className="nav-spacer" />

        <div className="nav-search-wrap" ref={searchRef}>
          <form className="nav-search" onSubmit={goFullSearch}>
            <span style={{ opacity: 0.7, fontSize: 12 }}>⌕</span>
            <input
              placeholder="Search folders, HP, modules…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results) setOpen(true) }}
            />
          </form>
          {open && query.trim().length >= 2 && (
            <div className="nav-search-results">
              {!results && <div className="nav-search-empty">Searching…</div>}
              {results && !hasHits && (
                <div className="nav-search-empty">No matches. Press Enter for full search.</div>
              )}
              <SuggestGroup title="Folders" items={results?.pages} onPick={pick} />
              <SuggestGroup title="Finances" items={results?.customers} onPick={pick} />
              <SuggestGroup title="Consultancy" items={results?.bikes} onPick={pick} />
              <SuggestGroup title="Modules" items={modulePreview} onPick={pick} />
              <SuggestGroup title="Accounts" items={results?.accounts} onPick={pick} />
              <SuggestGroup title="Users" items={results?.users} onPick={pick} />
              <SuggestGroup title="Journals" items={results?.journals} onPick={pick} />
              {results && (
                <button type="button" className="nav-search-footer" onClick={goFullSearch}>
                  View all results for &quot;{query.trim()}&quot; ({results.totals?.all || 0}) →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="nav-item" ref={userRef} onClick={() => setUserMenuOpen((o) => !o)} style={{ cursor: 'pointer', padding: 0 }}>
          <div className="nav-user">
            <span className="nav-avatar">{initial}</span>
            {user?.name} <span style={{ fontSize: 10 }}>▼</span>
          </div>
          {userMenuOpen && (
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
