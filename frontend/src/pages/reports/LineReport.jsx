import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

const COLS = {
  s: [
    { label: 'SNo', key: 'sno' },
    { label: 'HP No', key: 'hpNo' },
    { label: 'Name', key: 'name' },
    { label: 'Village', key: 'village' },
    { label: 'EMI', key: 'emiAmount' },
    { label: 'Outstanding', key: 'outstanding' },
  ],
  print: [
    { label: 'SNo', key: 'sno' },
    { label: 'HP No', key: 'hpNo' },
    { label: 'Name', key: 'name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Village', key: 'village' },
    { label: 'EMI', key: 'emiAmount' },
    { label: 'Next Due', key: 'nextDue' },
    { label: 'Outstanding', key: 'outstanding' },
    { label: 'OD Days', key: 'daysOverdue' },
    { label: 'Status', key: 'status' },
  ],
  xl: [
    { label: 'SNo', key: 'sno' },
    { label: 'HP No', key: 'hpNo' },
    { label: 'Name', key: 'name' },
    { label: 'Mobile', key: 'mobile' },
    { label: 'Reg No', key: 'regNo' },
    { label: 'Village', key: 'village' },
    { label: 'Period', key: 'emiPeriod' },
    { label: 'EMI', key: 'emiAmount' },
    { label: 'Paid', key: 'paidAmount' },
    { label: 'Outstanding', key: 'outstanding' },
    { label: 'Demand', key: 'demandAmount' },
    { label: 'Overdue', key: 'overduePrincipal' },
    { label: 'OD Days', key: 'daysOverdue' },
    { label: 'OD Int.', key: 'odInterest' },
    { label: 'Total Due', key: 'odTotal' },
    { label: 'Next Due', key: 'nextDue' },
    { label: 'Status', key: 'status' },
  ],
}

const MONEY = new Set(['emiAmount', 'paidAmount', 'outstanding', 'demandAmount', 'overduePrincipal', 'odInterest', 'odTotal'])

export default function LineReport() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') || 'all'
  const type = params.get('type') || '1'
  const layout = params.get('layout') || 'print'
  const village = params.get('village') || ''
  const asOf = params.get('asOf') || new Date().toISOString().slice(0, 10)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [villageInput, setVillageInput] = useState(village)
  const [asOfInput, setAsOfInput] = useState(asOf)

  useEffect(() => {
    setVillageInput(village)
    setAsOfInput(asOf)
  }, [village, asOf])

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.getLineReport({ view, type, village, asOf })
      .then((d) => { if (alive) setData(d) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [view, type, village, asOf])

  function applyFilters(e) {
    e?.preventDefault?.()
    const next = new URLSearchParams(params)
    if (villageInput.trim()) next.set('village', villageInput.trim())
    else next.delete('village')
    next.set('asOf', asOfInput)
    setParams(next)
  }

  const columns = COLS[layout] || COLS.print
  const numeric = useMemo(() => new Set([...MONEY, 'daysOverdue', 'sno', 'emiPeriod']), [])

  function onExport() {
    if (!data) return
    exportCsv(`line-report-${view}-type${type}-${asOf}`, columns, data.rows)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Reports', to: '/reports' },
        { label: data?.title || 'Line Report' },
      ]} />
      <div className="page-header">
        <h1>{data?.title || 'Line Report'}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {data && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {data.count} HP(s) · Outstanding {inr(data.outstanding)} · Demand {inr(data.demand)}
            </span>
          )}
          <button type="button" className="btn outline sm" onClick={onExport}>Excel</button>
          <button type="button" className="btn outline sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="panel no-print" style={{ marginBottom: 12 }}>
        <form className="panel-body" onSubmit={applyFilters} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ fontSize: 12.5 }}>
            As of
            <input type="date" value={asOfInput} onChange={(e) => setAsOfInput(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12.5 }}>
            Village
            <input
              list="line-villages"
              value={villageInput}
              onChange={(e) => setVillageInput(e.target.value)}
              placeholder="All villages"
              style={{ display: 'block', marginTop: 4 }}
            />
            <datalist id="line-villages">
              {(data?.villages || []).map((v) => <option key={v} value={v} />)}
            </datalist>
          </label>
          <button className="btn sm" type="submit">Apply</button>
          {(village || asOf !== new Date().toISOString().slice(0, 10)) && (
            <button
              className="btn outline sm"
              type="button"
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('village')
                next.set('asOf', new Date().toISOString().slice(0, 10))
                setParams(next)
              }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {data && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5 }}>
            <div>Outstanding: <strong>{inr(data.outstanding)}</strong></div>
            <div>Demand: <strong>{inr(data.demand)}</strong></div>
            <div>Overdue principal: <strong>{inr(data.overduePrincipal)}</strong></div>
            <div>OD interest ({data.odRatePerDay}% / day): <strong>{inr(data.odInterest)}</strong></div>
          </div>
        </div>
      )}

      {loading || !data ? (
        <Loader label="Building line report..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={numeric.has(c.key) ? 'num' : ''}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No HPs match this line report.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c) => (
                    <td key={c.key} className={numeric.has(c.key) ? 'num' : ''}>
                      {c.key === 'hpNo' ? (
                        <Link className="row-link" to={`/finance/${r.id}`}>{r.hpNo}</Link>
                      ) : MONEY.has(c.key) ? inr(r[c.key]) : (r[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
