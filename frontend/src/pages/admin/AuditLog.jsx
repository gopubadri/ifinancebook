import { useEffect, useState } from 'react'
import * as api from '../../api/api.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function AuditLog() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAudit()
      .then(setRows)
      .catch((err) => setError(err.message || 'Could not load activity.'))
  }, [])

  const columns = [
    { key: 'at', label: 'When', render: (r) => String(r.at).replace('T', ' ').slice(0, 19) },
    { key: 'actor', label: 'Who' },
    { key: 'action', label: 'Action' },
    { key: 'entity', label: 'Record' },
    { key: 'entityId', label: 'Id' },
    { key: 'detail', label: 'Detail', render: (r) => JSON.stringify(r.detail) },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Activity' }]} />
      <h1 style={{ marginBottom: 12 }}>Activity</h1>
      {error && <div className="login-error">{error}</div>}
      {!rows && !error ? <Loader label="Loading activity..." /> : rows && (
        <DataTable columns={columns} rows={rows} emptyMessage="No activity recorded yet." />
      )}
    </div>
  )
}
