import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

function cellValue(col, row) {
  const v = row[col.key]
  if (col.type === 'money') return inr(v || 0)
  if (v == null || v === '') return '—'
  return v
}

export default function SpecialReport() {
  const { key } = useParams()
  const [params, setParams] = useSearchParams()
  const today = new Date().toISOString().slice(0, 10)
  const from = params.get('from') || today.slice(0, 8) + '01'
  const to = params.get('to') || today
  const asOf = params.get('asOf') || today

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromInput, setFromInput] = useState(from)
  const [toInput, setToInput] = useState(to)
  const [asOfInput, setAsOfInput] = useState(asOf)

  useEffect(() => {
    setFromInput(from)
    setToInput(to)
    setAsOfInput(asOf)
  }, [from, to, asOf])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    api.getSpecialReport(key, { from, to, asOf })
      .then((d) => { if (alive) setData(d) })
      .catch((err) => { if (alive) setError(err.message || 'Failed to load report.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [key, from, to, asOf])

  function apply(e) {
    e?.preventDefault?.()
    const next = new URLSearchParams(params)
    if (data?.dateMode === 'range') {
      next.set('from', fromInput)
      next.set('to', toInput)
    }
    if (data?.dateMode === 'asOf') next.set('asOf', asOfInput)
    setParams(next)
  }

  function onExport() {
    if (!data) return
    exportCsv(`${key}-report`, data.columns.map((c) => ({ label: c.label, key: c.key })), data.rows)
  }

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Reports', to: '/reports' },
        { label: data?.title || 'Report' },
      ]} />
      <div className="page-header">
        <h1>{data?.title || 'Report'}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {data && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{data.count} row(s)</span>
          )}
          <button type="button" className="btn outline sm" onClick={onExport} disabled={!data}>Excel</button>
          <button type="button" className="btn outline sm" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {data?.subtitle && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>{data.subtitle}</p>
      )}

      {data?.dateMode && data.dateMode !== 'none' && (
        <div className="panel no-print" style={{ marginBottom: 12 }}>
          <form className="panel-body" onSubmit={apply} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            {data.dateMode === 'range' && (
              <>
                <label style={{ fontSize: 12.5 }}>
                  From
                  <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12.5 }}>
                  To
                  <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
                </label>
              </>
            )}
            {data.dateMode === 'asOf' && (
              <label style={{ fontSize: 12.5 }}>
                As of
                <input type="date" value={asOfInput} onChange={(e) => setAsOfInput(e.target.value)} style={{ display: 'block', marginTop: 4 }} />
              </label>
            )}
            <button className="btn sm" type="submit">Apply</button>
          </form>
        </div>
      )}

      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      {data?.totals?.length > 0 && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-body" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13.5 }}>
            {data.totals.map((t) => (
              <div key={t.label}>
                {t.label}: <strong>{t.money ? inr(t.value) : t.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading || !data ? (
        <Loader label="Building report..." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {data.columns.map((c) => (
                  <th key={c.key} className={c.type === 'money' || c.type === 'number' ? 'num' : ''}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={data.columns.length} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No rows for this report.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={`${r.sno}-${r.hpNo || r.rcNo || r.name || r.village}`}>
                  {data.columns.map((c) => (
                    <td key={c.key} className={c.type === 'money' || c.type === 'number' ? 'num' : ''}>
                      {c.type === 'hpLink' && r.customerId ? (
                        <Link className="row-link" to={`/finance/${r.customerId}`}>{r[c.key]}</Link>
                      ) : cellValue(c, r)}
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
