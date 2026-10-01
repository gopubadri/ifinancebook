import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

function line(view, { layout = 'print', type = '1' } = {}) {
  const p = new URLSearchParams({ view, layout, type })
  return `/reports/line?${p}`
}

const LINKABLE = {
  'Day Report': '/reports/day-report',
  'Multi Day Report': '/reports/collection',
  'Balance Sheet': '/reports/balance-sheet',
  'Trail Balance Sheet': '/accounting/trial-balance',
  'Ledgers Balance Report': '/accounting/accounts',
  'P&L Report(Final)': '/reports/pnl',
  'Monthly P&L Report': '/reports/pnl?preset=month',
  'P&L Report (Trail Preview)': '/reports/pnl?preset=preview',
  'Trading Account': '/reports/pnl?preset=trading',
  'Closed HP Report': '/reports/closed-hp',
  'Seized HP Report': '/reports/seized-hp',
  'Collection Report': '/reports/collection',
  'Vehicles Report': '/consultancy',
  'Bike Purchases Report': '/consultancy',
  'Handloan Report': '/module/handloans-new',
  'OD Report': '/reports/od',
  'capitals Report': '/module/capitals',
  'Deposits Report': '/module/deposits',

  'Demand Collection Report': '/reports/special/demand-collection',
  'Line Demand Collection Report': '/reports/special/line-demand-collection',
  'C Book Report(HP)': '/reports/special/cbook-hp',
  'C Book Report(CNSLT)': '/reports/special/cbook-cnslt',
  'C Book Report(ALL)': '/reports/special/cbook-all',
  'Bike Repairs Report': '/reports/special/bike-repairs',
  'HL Type 2 Collection Report': '/reports/special/hl-type2',
  'Reminders': '/reports/special/reminders',
  'Non Closed Report': '/reports/special/non-closed',
  'Hp Handloan Report': '/reports/special/hp-handloan',
  'Deposits Report(DP)': '/reports/special/deposits-dp',
  'HP Insurance Pending Report': '/reports/special/hp-insurance',
  'HP Tax Pending Report': '/reports/special/hp-tax',
  'HP Pollution Report': '/reports/special/hp-pollution',
  'HP RTA Token Report': '/reports/special/hp-rta',
  'Consultancy RTA Token Report': '/reports/special/consultancy-rta',
  'HP Interest Report': '/reports/special/hp-interest',
  "Customer's Mobiles": '/reports/special/customer-mobiles',
  'Delinquency Bucket Report': '/reports/special/delinquency',

  'Line Report': line('all'),
  'Line Report Print': line('all'),
  'Line Report(HP)': line('hp'),
  'Line Report(Demand)': line('demand'),
  'Line Report Print(Demand)': line('demand'),
  'Line Report Print(XL)': line('all', { layout: 'xl' }),
  'Line Report Print(S)': line('all', { layout: 's' }),
  'Line Report Print(XL)(S)': line('all', { layout: 's' }),
  'Line Report (AC)': line('ac'),
  'Line Report Print (AC)': line('ac'),
  'Line Report Print (AC)(S)': line('ac', { layout: 's' }),
  'Line Report(SPL)': line('spl'),
  'Line Report Print(SPL)': line('spl'),
  'Line Report Print(SPL)(S)': line('spl', { layout: 's' }),
  'Line Report Print(Zero)': line('zero'),
  'Line Report Print(Zero)(S)': line('zero', { layout: 's' }),
  'Line Report Print(Today)': line('today'),
  'Line Report Print(Today)(S)': line('today', { layout: 's' }),

  'Line Report 2': line('all', { type: '2' }),
  'Line Report Print 2': line('all', { type: '2' }),
  'Line Report(HP) 2': line('hp', { type: '2' }),
  'Line Report Print(S) 2': line('all', { layout: 's', type: '2' }),
  'Line Report (AC) 2': line('ac', { type: '2' }),
  'Line Report Print (AC) 2': line('ac', { type: '2' }),
  'Line Report Print (AC)(S) 2': line('ac', { layout: 's', type: '2' }),
  'Line Report Print(XL) 2': line('all', { layout: 'xl', type: '2' }),
  'Line Report Print(XL)(S) 2': line('all', { layout: 's', type: '2' }),
  'Line Report Print(Zero) 2': line('zero', { type: '2' }),
  'Line Report Print(Zero)(S) 2': line('zero', { layout: 's', type: '2' }),
  'Line Report Print(Today) 2': line('today', { type: '2' }),
  'Line Report Print(Today)(S) 2': line('today', { layout: 's', type: '2' }),
}

export default function ReportsMenu() {
  const { user } = useAuth()
  const canAccounts = user?.role === 'ADMIN' || user?.role === 'CLERK'
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
          {items.map((name) => {
            const to = LINKABLE[name]
            const blocked = to && to.startsWith('/accounting') && !canAccounts
            return to && !blocked ? (
              <Link key={name} to={to} className="report-chip">{name}</Link>
            ) : (
              <button key={name} className="report-chip" type="button" disabled>{name}</button>
            )
          })}
        </div>
      </>
    )
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports' }]} />
      <h1 style={{ marginBottom: 6 }}>Reports</h1>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>
        Linked chips open live reports. Line Reports share one engine (HP / Demand / Today / Zero / SPL / AC) with Print, XL and short layouts.
      </p>
      <Section title="Finance Reports" items={menu.finance} />
      <Section title="Finance Line Reports Type 2" items={menu.financeType2} />
      <Section title="Accounts Reports" items={menu.accounts} />
    </div>
  )
}
