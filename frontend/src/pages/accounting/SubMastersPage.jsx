import { useEffect, useState } from 'react'
import * as api from '../../data/api.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import DataTable from '../../components/DataTable.jsx'
import Loader from '../../components/Loader.jsx'

export default function SubMastersPage() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.getSubMasters().then(setRows)
  }, [])

  if (!rows) return <Loader label="Loading sub masters..." />

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Sub Master' },
    { key: 'masterName', label: 'Master' },
    { key: 'normalBalance', label: 'Normal Bal' },
    { key: 'statement', label: 'Statement' },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Sub Masters' }]} />
      <div className="page-header">
        <h1>Sub Masters <span className="count">({rows.length})</span>
          <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 3</span>
        </h1>
      </div>
      <DataTable columns={columns} rows={rows} />
    </div>
  )
}
