import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Loader from '../components/Loader.jsx'

const MODULES = [
  { icon: '?', title: "Support", desc: 'Details of the software, contact & payment info', to: '/support' },
  { icon: '₹', title: "Finance's", desc: 'All finances based on EMI schedule', to: '/finance' },
  { icon: '⟳', title: 'Handloans', desc: 'Loans given by note or on trust', to: '/module/handloans-new' },
  { icon: '☰', title: 'Day Report', desc: 'A daily report of all collections & bills', to: '/reports/day-report' },
  { icon: '▤', title: 'Reports', desc: 'All 50+ finance, line & account reports', to: '/reports' },
  { icon: '⚖', title: 'Ledger Reports', desc: 'All ledgers, trial balance & summaries', to: '/reports' },
  { icon: '◔', title: 'Charts', desc: 'Graphical representation of HPs & collection', to: '/charts' },
  { icon: '🏍', title: 'Consultancy', desc: 'Vehicle purchase and sale tracking', to: '/consultancy' },
  { icon: '☺', title: 'Users', desc: 'Admin, clerk & line executive accounts', to: '/users' },
  { icon: '⊕', title: 'Capitals', desc: 'Shareholder investment tracking', to: '/module/capitals' },
  { icon: '🏦', title: "Bank's", desc: 'Bank, GPay & PhonePe account balances', to: '/module/banks-new' },
  { icon: '↗', title: 'Finance Collection', desc: 'EMI collection totals by period', to: '/reports' },
  { icon: '▣', title: 'Assets', desc: 'Fixed asset register', to: '/module/assets-new' },
  { icon: '−', title: 'Expenses', desc: 'Operating expense accounts', to: '/module/income-expenses-new' },
  { icon: '⚙', title: 'Settings', desc: 'Interest rates, receipt series, company info', to: '/settings' },
  { icon: '◎', title: 'Chits', desc: 'Chit fund scheme management', to: '/module/chits-new' },
  { icon: '☎', title: 'Agents', desc: 'Field collection agent directory', to: '/module/agents' },
  { icon: '∑', title: 'P&L', desc: "Profit and loss statement", to: '/reports/pnl' },
  { icon: '▦', title: 'Balance Sheet', desc: 'Assets vs. liabilities summary', to: '/reports/balance-sheet' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let alive = true
    api.getDashboardStats().then((data) => { if (alive) setStats(data) })
    return () => { alive = false }
  }, [])

  return (
    <div>
      {!stats ? (
        <Loader label="Fetching dashboard stats..." />
      ) : (
        <div className="stat-bar">
          <div className="stat-cell">
            <div className="stat-label">Income</div>
            <div className="stat-value">₹{inr(stats.income)}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Expenses</div>
            <div className="stat-value">₹{inr(stats.expenses)}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">EMI Collection</div>
            <div className="stat-value">₹{inr(stats.emiCollection)}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">HP HL Collection</div>
            <div className="stat-value">₹{inr(stats.hlCollection)}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">OD Collection</div>
            <div className="stat-value">₹{inr(stats.odCollection)}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">Closed HP's</div>
            <div className="stat-value">{stats.closedHp}</div>
          </div>
        </div>
      )}

      <div className="module-grid">
        {MODULES.map((m) => (
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
