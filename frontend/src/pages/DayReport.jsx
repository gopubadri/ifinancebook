import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

export default function DayReport() {
  const [rows, setRows] = useState(null)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    let alive = true
    api.getDayReport().then((d) => { if (alive) setRows(d) })
    return () => { alive = false }
  }, [])

  if (!rows) return <Loader label="Compiling today's collections..." />

  const emiCollection = rows.slice(1).reduce((s, r) => s + r.receiptAmt, 0)
  const openingBalance = rows[0]?.receiptAmt || 0

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'Day Report' }]} />
      <div className="page-header">
        <h1>Day Report</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn outline sm">XL</button>
          <button className="btn outline sm">USR</button>
          <button className="btn outline sm">Print</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>SRI ADITYA FINANCE</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>TADEPALLIGUDEM</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Day Report Details — {today}</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>SNo</th><th>Name</th><th>Rc No</th><th>HP</th><th>Description</th><th>Created By</th><th className="num">Receipt / Payment</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sno}>
                <td>{r.sno}</td><td>{r.name}</td><td className="mono">{r.rcNo}</td><td className="mono">{r.hp}</td>
                <td>{r.desc}</td><td>{r.createdBy}</td><td className="num">{inr(r.receiptAmt)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: '#efe9d8' }}>
              <td colSpan={5}>EMI Collection</td><td></td><td className="num">{inr(emiCollection)}</td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td colSpan={5}>Balance</td><td></td><td className="num">{inr(openingBalance + emiCollection)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
