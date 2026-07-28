import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

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

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'Balance Sheet' }]} />
      <div className="page-header">
        <h1>Balance Sheet</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn outline sm">XL</button>
          <button className="btn outline sm">Print</button>
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
