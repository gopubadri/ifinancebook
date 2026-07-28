import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

const LINKABLE = {
  'Day Report': '/reports/day-report',
  'Balance Sheet': '/reports/balance-sheet',
  'P&L Report(Final)': '/reports/pnl',
  'Monthly P&L Report': '/reports/pnl',
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
              <button key={name} className="report-chip" title="Demo report - not wired up yet">{name}</button>
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
        Chips linking to a built page (Day Report, Balance Sheet, P&amp;L) open real demo data.
        The rest are shown for completeness and match the report catalogue from the technical spec.
      </p>
      <Section title="Finance Reports" items={menu.finance} />
      <Section title="Finance Line Reports Type 2" items={menu.financeType2} />
      <Section title="Accounts Reports" items={menu.accounts} />
    </div>
  )
}
