import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

export default function BalanceSheet() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    api.getBalanceSheet().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  if (!data) return <Loader label="Consolidating ledger balances..." />

  const totalLiabilities = data.liabilities.reduce((s, [, v]) => s + v, 0)
  const totalAssets = data.assets.reduce((s, [, v]) => s + v, 0)

  function onExport() {
    const rows = [
      ...data.liabilities.map(([name, amount]) => ({ side: 'Liabilities', name, amount })),
      { side: 'Liabilities', name: 'Total Liabilities', amount: totalLiabilities },
      ...data.assets.map(([name, amount]) => ({ side: 'Assets', name, amount })),
      { side: 'Assets', name: 'Total Assets', amount: totalAssets },
    ]
    exportCsv('balance-sheet', [
      { label: 'Side', key: 'side' },
      { label: 'Particulars', key: 'name' },
      { label: 'Amount', key: 'amount' },
    ], rows)
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'Balance Sheet' }]} />
      <div className="page-header">
        <h1>Balance Sheet
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>From ledger</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn outline sm" onClick={onExport}>Excel</button>
          <Link className="btn outline sm" to="/accounting/trial-balance">Trial Balance</Link>
          <Link className="btn outline sm" to="/accounting/journals">Journals</Link>
        </div>
      </div>

      <div className="bs-columns">
        <div className="panel" style={{ margin: 0 }}>
          <div className="bs-col-title">Liabilities</div>
          {data.liabilities.map(([name, value]) => (
            <div className="bs-row" key={name}><span>{name}</span><span className="amt">{inr(value)}</span></div>
          ))}
          <div className="bs-row total"><span>Total</span><span className="amt">{inr(totalLiabilities)}</span></div>
        </div>
        <div className="panel" style={{ margin: 0 }}>
          <div className="bs-col-title">Assets</div>
          {data.assets.map(([name, value]) => (
            <div className="bs-row" key={name}><span>{name}</span><span className="amt">{inr(value)}</span></div>
          ))}
          <div className="bs-row total"><span>Total</span><span className="amt">{inr(totalAssets)}</span></div>
        </div>
      </div>
    </div>
  )
}
