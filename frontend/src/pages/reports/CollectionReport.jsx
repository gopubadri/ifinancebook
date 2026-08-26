import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

export default function CollectionReport() {
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function load(f = from, t = to) {
    setLoading(true)
    api.getCollectionReport({ from: f, to: t })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Reports', to: '/reports' },
        { label: 'Collection' },
      ]} />
      <div className="page-header">
        <h1>Collection Report</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {data && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {data.count} receipt(s) · Total {inr(data.totalCollected)}
            </span>
          )}
          {data && (
            <button
              type="button"
              className="btn outline sm"
              onClick={() => exportCsv(`collection-${from}-to-${to}`, [
                { label: 'SNo', key: 'sno' },
                { label: 'Date', key: 'paidDate' },
                { label: 'Rc No', key: 'receiptNo' },
                { label: 'HP No', key: 'hpNo' },
                { label: 'Name', key: 'name' },
                { label: 'Village', key: 'village' },
                { label: 'Created By', key: 'createdBy' },
                { label: 'Amount', key: 'amount' },
              ], data.rows)}
            >
              Excel
            </button>
          )}
          {data && (
            <button type="button" className="btn outline sm" onClick={() => window.print()}>Print</button>
          )}
        </div>
      </div>

      <div className="panel no-print" style={{ marginBottom: 12 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ fontSize: 12.5 }}>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12.5 }}>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <button className="btn sm" type="button" onClick={() => load(from, to)}>Apply</button>
        </div>
      </div>

      {loading || !data ? (
        <Loader label="Loading collection report..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SNo</th>
                <th>Date</th>
                <th>Rc No</th>
                <th>HP No</th>
                <th>Name</th>
                <th>Village</th>
                <th>Created By</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)' }}>No receipts in this range</td></tr>
              )}
              {data.rows.map((r) => (
                <tr key={`${r.receiptNo}-${r.sno}`}>
                  <td>{r.sno}</td>
                  <td>{r.paidDate}</td>
                  <td className="mono">{r.receiptNo}</td>
                  <td className="mono"><Link to={`/finance/${r.customerId}`}>{r.hpNo}</Link></td>
                  <td>{r.name}</td>
                  <td>{r.village}</td>
                  <td>{r.createdBy}</td>
                  <td className="num">{inr(r.amount)}</td>
                </tr>
              ))}
              {data.rows.length > 0 && (
                <tr style={{ fontWeight: 700, background: '#efe9d8' }}>
                  <td colSpan={7}>Total Collected</td>
                  <td className="num">{inr(data.totalCollected)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
