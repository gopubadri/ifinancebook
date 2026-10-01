import { useEffect, useState } from 'react'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

export default function DayReport() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [applied, setApplied] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  function load(d = date) {
    setLoading(true)
    api.getDayReport(d)
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : payload.rows
        setData({
          date: payload.date || d,
          city: payload.city || 'TADEPALLIGUDEM',
          rows,
        })
        setApplied(d)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(today) }, [])

  const rows = data?.rows || []
  const emiCollection = rows.slice(1).reduce((s, r) => s + Number(r.receiptAmt || 0), 0)
  const openingBalance = rows[0]?.receiptAmt || 0

  function shiftDay(delta) {
    const d = new Date(`${applied}T00:00:00`)
    d.setDate(d.getDate() + delta)
    const next = d.toISOString().slice(0, 10)
    setDate(next)
    load(next)
  }

  function onExport() {
    exportCsv(`day-report-${applied}`, [
      { label: 'SNo', key: 'sno' },
      { label: 'Name', key: 'name' },
      { label: 'Rc No', key: 'rcNo' },
      { label: 'HP', key: 'hp' },
      { label: 'Description', key: 'desc' },
      { label: 'Created By', key: 'createdBy' },
      { label: 'Receipt / Payment', key: 'receiptAmt' },
    ], rows)
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Reports', to: '/reports' }, { label: 'Day Report' }]} />
      <div className="page-header">
        <h1>Day Report</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn outline sm" type="button" onClick={onExport}>Excel</button>
          <button className="btn outline sm" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="panel no-print" style={{ marginBottom: 12 }}>
        <div className="panel-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ fontSize: 12.5 }}>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <button className="btn sm" type="button" onClick={() => load(date)}>Apply</button>
          <button className="btn outline sm" type="button" onClick={() => shiftDay(-1)}>Previous day</button>
          <button className="btn outline sm" type="button" onClick={() => shiftDay(1)}>Next day</button>
          {applied !== today && (
            <button className="btn outline sm" type="button" onClick={() => { setDate(today); load(today) }}>Today</button>
          )}
        </div>
      </div>

      {loading || !data ? (
        <Loader label="Compiling day's collections..." />
      ) : (
        <>
          <div className="panel">
            <div className="panel-body" style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 16 }}>SRI ADITYA FINANCE</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{data.city}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Day Report Details — {applied}</div>
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
        </>
      )}
    </div>
  )
}
