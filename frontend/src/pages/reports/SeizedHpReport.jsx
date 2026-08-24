import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../api/api.js'
import { inr } from '../../utils/format.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import Loader from '../../components/Loader.jsx'

export default function SeizedHpReport() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    api.getSeizedHpReport().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  if (!data) return <Loader label="Loading seized HP report..." />

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Reports', to: '/reports' },
        { label: 'Seized HP' },
      ]} />
      <div className="page-header">
        <h1>Seized HP Report</h1>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{data.count} account(s)</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SNo</th>
              <th>HP No</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Reg No</th>
              <th>Village</th>
              <th className="num">EMI</th>
              <th>Seized Date</th>
              <th>Closed?</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)' }}>No seized HP accounts</td></tr>
            )}
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.sno}</td>
                <td className="mono"><Link to={`/finance/${r.id}`}>{r.hpNo}</Link></td>
                <td>{r.name}</td>
                <td>{r.mobile}</td>
                <td className="mono">{r.regNo}</td>
                <td>{r.village}</td>
                <td className="num">{inr(r.emiAmount)}</td>
                <td>{r.seizedDate || '—'}</td>
                <td>{r.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
