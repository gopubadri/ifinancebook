import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

export default function PnL() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    api.getPnl().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  if (!data) return <Loader label="Rolling up income & expense accounts..." />

  const totalIncome = data.income.reduce((s, [, v]) => s + v, 0)
  const totalExpenses = data.expenses.reduce((s, [, v]) => s + v, 0)
  const rows = []
  const max = Math.max(data.income.length, data.expenses.length)
  for (let i = 0; i < max; i++) {
    rows.push([data.income[i], data.expenses[i]])
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'P & L Report' }]} />
      <div className="page-header">
        <h1>P&amp;L Report</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn outline sm">XL</button>
          <button className="btn outline sm">Print</button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Particulars (Income)</th><th className="num">Income</th><th>Particulars (Expenses)</th><th className="num">Expenses</th></tr>
          </thead>
          <tbody>
            {rows.map(([inc, exp], i) => (
              <tr key={i}>
                <td>{inc ? inc[0] : ''}</td>
                <td className="num">{inc ? inr(inc[1]) : ''}</td>
                <td>{exp ? exp[0] : ''}</td>
                <td className="num">{exp ? inr(exp[1]) : ''}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: '#efe9d8' }}>
              <td>Total</td><td className="num">{inr(totalIncome)}</td>
              <td>Total</td><td className="num">{inr(totalExpenses)}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={3}>Profit</td>
              <td className="num">{inr(totalIncome - totalExpenses)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
