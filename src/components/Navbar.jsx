import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

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
  ['Journels', '/module/journels'],
  ['Hand Loans Type 2', '/module/hand-loans'],
]

const OTHERS = [
  ['Income & Expense', '/module/income-expense-transactions'],
  ['RTA', '/module/rta'],
  ['All Accounts', '/module/all-accounts'],
  ['Masters', '/module/masters'],
  ['Sub Masters', '/module/sub-masters'],
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

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    if (query.trim()) navigate(`/finance?q=${encodeURIComponent(query.trim())}`)
  }

  const initial = user?.name?.charAt(0) || '?'

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="brand">
          <span className="brand-mark">iF</span> iFinance
        </Link>
        <NavDropdown label="Transactions" items={TRANSACTIONS} />
        <NavDropdown label="Others" items={OTHERS} />
        <Link to="/finance" className="nav-item">Finance's</Link>

        <div className="nav-spacer" />

        <form className="nav-search" onSubmit={handleSearch}>
          <span style={{ opacity: 0.7, fontSize: 12 }}>⌕</span>
          <input
            placeholder="Search customer, HP no..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>

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
