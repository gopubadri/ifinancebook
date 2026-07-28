import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'

export default function Users() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    api.getUsers().then((data) => { if (alive) setRows(data) })
    return () => { alive = false }
  }, [])

  const columns = [
    { key: 'sno', label: 'SNo', render: (_, i) => i + 1 },
    { key: 'name', label: 'Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'type', label: 'Type' },
    { key: 'date', label: 'Date' },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Users' }]} />
      <div className="page-header">
        <h1>Users {rows && <span className="count">({rows.length})</span>}</h1>
        <button className="btn brass">+ New User</button>
      </div>
      {!rows ? <Loader label="Fetching users..." /> : <DataTable columns={columns} rows={rows} />}
    </div>
  )
}
