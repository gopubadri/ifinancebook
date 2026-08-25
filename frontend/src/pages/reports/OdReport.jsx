import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

export default function OdReport() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    api.getOdReport().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  if (!data) return <Loader label="Loading OD report..." />

  function onExport() {
    exportCsv(`od-report-${data.asOf}`, [
      { label: 'SNo', key: 'sno' },
      { label: 'HP No', key: 'hpNo' },
      { label: 'Name', key: 'name' },
      { label: 'Village', key: 'village' },
      { label: 'EMI#', key: 'emiSno' },
      { label: 'Due Date', key: 'dueDate' },
      { label: 'Balance', key: 'balance' },
      { label: 'Days Overdue', key: 'daysOverdue' },
      { label: 'OD Interest', key: 'odInterest' },
      { label: 'Total', key: 'odTotal' },
    ], data.rows)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Reports', to: '/reports' },
        { label: 'OD Report' },
      ]} />
      <div className="page-header">
        <h1>OD Report</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            As of {data.asOf} · rate {data.odRatePerDay}% / day · {data.count} overdue EMI(s)
          </span>
          <button type="button" className="btn outline sm" onClick={onExport}>Excel</button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5 }}>
          <div>Overdue principal: <strong>{inr(data.overduePrincipal)}</strong></div>
          <div>OD interest: <strong>{inr(data.odInterestTotal)}</strong></div>
          <div>Grand total: <strong>{inr(data.grandTotal)}</strong></div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SNo</th>
              <th>HP No</th>
              <th>Name</th>
              <th>Village</th>
              <th>EMI#</th>
              <th>Due Date</th>
              <th className="num">Balance</th>
              <th className="num">Days</th>
              <th className="num">OD Int.</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)' }}>No overdue EMIs</td></tr>
            )}
            {data.rows.map((r) => (
              <tr key={`${r.customerId}-${r.emiSno}`}>
                <td>{r.sno}</td>
                <td className="mono"><Link to={`/finance/${r.customerId}`}>{r.hpNo}</Link></td>
                <td>{r.name}</td>
                <td>{r.village}</td>
                <td>{r.emiSno}</td>
                <td>{r.dueDate}</td>
                <td className="num">{inr(r.balance)}</td>
                <td className="num">{r.daysOverdue}</td>
                <td className="num">{inr(r.odInterest)}</td>
                <td className="num">{inr(r.odTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
