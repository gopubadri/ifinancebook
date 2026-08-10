import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

const LINKABLE = {
  'Day Report': '/reports/day-report',
  'Multi Day Report': '/reports/day-report',
  'Balance Sheet': '/reports/balance-sheet',
  'Trail Balance Sheet': '/accounting/trial-balance',
  'Ledgers Balance Report': '/accounting/accounts',
  'P&L Report(Final)': '/reports/pnl',
  'Monthly P&L Report': '/reports/pnl',
  'P&L Report (Trail Preview)': '/reports/pnl',
  'Trading Account': '/reports/pnl',
  'Closed HP Report': '/charts',
  'Seized HP Report': '/finance',
  'Collection Report': '/reports/day-report',
  'Vehicles Report': '/consultancy',
  'Bike Purchases Report': '/consultancy',
  'Handloan Report': '/module/handloans-new',
  'OD Report': '/finance',
  'capitals Report': '/module/capitals',
  'Deposits Report': '/module/deposits',
}

export default function ReportsMenu() {
  const [menu, setMenu] = useState(null)

  useEffect(() => {
    let alive = true
    api.getReportMenu().then((data) => { if (alive) setMenu(data) })
    return () => { alive = false }
  }, [])

  if (!menu) return <Loader label="Loading report catalogue..." />

  function Section({ title, items }) {
    return (
      <>
        <div className="section-title">{title}</div>
        <div className="report-grid">
          {items.map((name) =>
            LINKABLE[name] ? (
              <Link key={name} to={LINKABLE[name]} className="report-chip">{name}</Link>
            ) : (
              <button key={name} className="report-chip" title="Opens related live modules when available" type="button">{name}</button>
            )
          )}
        </div>
      </>
    )
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports' }]} />
      <h1 style={{ marginBottom: 6 }}>Reports</h1>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
        Linked reports open live pages fed by finances, receipts, modules, and consultancy.
        Day Report, Balance Sheet, P&amp;L, and Charts update when you collect EMI or add accounts.
      </p>
      <Section title="Finance Reports" items={menu.finance} />
      <Section title="Finance Line Reports Type 2" items={menu.financeType2} />
      <Section title="Accounts Reports" items={menu.accounts} />
    </div>
  )
}
