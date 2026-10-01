import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { inr } from '../../utils/format.js'
import Loader from '../../components/Loader.jsx'

const STAT_TILES = [
  { key: 'income', label: 'Income', money: true, to: '/reports/pnl' },
  { key: 'expenses', label: 'Expenses', money: true, to: '/module/income-expense-transactions' },
  { key: 'emiCollection', label: 'EMI Collection', money: true, to: '/reports/collection?all=1' },
  { key: 'hlCollection', label: 'HP HL Collection', money: true, to: '/module/handloans-new' },
  { key: 'odCollection', label: 'OD Collection', money: true, to: '/reports/od' },
  { key: 'closedHp', label: "Closed HP's", money: false, to: '/reports/closed-hp' },
]

const MODULES = [
  { icon: '?', title: "Support", desc: 'Details of the software, contact & payment info', to: '/support' },
  { icon: '₹', title: "Finance's", desc: 'All finances based on EMI schedule', to: '/finance' },
  { icon: '⟳', title: 'Handloans', desc: 'Loans given by note or on trust', to: '/module/handloans-new' },
  { icon: '☰', title: 'Day Report', desc: 'A daily report of all collections & bills', to: '/reports/day-report' },
  { icon: '▤', title: 'Reports', desc: 'All 50+ finance, line & account reports', to: '/reports' },
  { icon: '⚖', title: 'Ledger Reports', desc: 'All ledgers, trial balance & summaries', to: '/accounting/trial-balance' },
  { icon: '◔', title: 'Charts', desc: 'Graphical representation of HPs & collection', to: '/charts' },
  { icon: '🏍', title: 'Consultancy', desc: 'Vehicle purchase and sale tracking', to: '/consultancy' },
  { icon: '☺', title: 'Users', desc: 'Admin, clerk & line executive accounts', to: '/users' },
  { icon: '⊕', title: 'Capitals', desc: 'Shareholder investment tracking', to: '/module/capitals' },
  { icon: '🏦', title: "Bank's", desc: 'Bank, GPay & PhonePe account balances', to: '/module/banks-new' },
  { icon: '↗', title: 'Finance Collection', desc: 'EMI collection totals by period', to: '/reports/collection' },
  { icon: '▣', title: 'Assets', desc: 'Fixed asset register', to: '/module/assets-new' },
  { icon: '−', title: 'Expenses', desc: 'Operating expense accounts', to: '/module/income-expenses-new' },
  { icon: '⚙', title: 'Settings', desc: 'Interest rates, receipt series, company info', to: '/settings' },
  { icon: '◎', title: 'Chits', desc: 'Chit fund scheme management', to: '/module/chits-new' },
  { icon: '☎', title: 'Agents', desc: 'Field collection agent directory', to: '/module/agents' },
  { icon: '∑', title: 'P&L', desc: "Profit and loss statement", to: '/reports/pnl' },
  { icon: '▦', title: 'Balance Sheet', desc: 'Assets vs. liabilities summary', to: '/reports/balance-sheet' },
  { icon: '📒', title: 'Journals', desc: 'Double-entry journal postings', to: '/accounting/journals' },
  { icon: '☰', title: 'All Accounts', desc: 'Chart of accounts & ledgers', to: '/accounting/accounts' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const isAdmin = user?.role === 'ADMIN'
  const canAccounts = user?.role === 'ADMIN' || user?.role === 'CLERK'
  const modules = MODULES.filter((m) => {
    if (m.to === '/settings' || m.to === '/users') return isAdmin
    if (m.to.startsWith('/accounting')) return canAccounts
    return true
  })

  useEffect(() => {
    let alive = true
    api.getDashboardStats()
      .then((data) => { if (alive) setStats(data) })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load dashboard.') })
    return () => { alive = false }
  }, [])

  return (
    <div>
      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
      {!stats && !error ? (
        <Loader label="Fetching dashboard stats..." />
      ) : stats ? (
        <div className="stat-bar">
          {STAT_TILES.map((tile) => (
            <Link key={tile.key} to={tile.to} className="stat-cell">
              <div className="stat-label">{tile.label}</div>
              <div className="stat-value">
                {tile.money ? `₹${inr(stats[tile.key])}` : stats[tile.key]}
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="module-grid">
        {modules.map((m) => (
          <Link key={m.title} to={m.to} className="module-card">
            <div className="module-icon">{m.icon}</div>
            <div>
              <div className="module-title">{m.title}</div>
              <div className="module-desc">{m.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
