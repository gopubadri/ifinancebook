import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'

export default function Consultancy() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    api.getBikePurchases().then((data) => { if (alive) setRows(data) })
    return () => { alive = false }
  }, [])

  const columns = [
    { key: 'sno', label: 'SNo', render: (_, i) => i + 1 },
    { key: 'rcNo', label: 'RC No', render: (r) => <span className="mono">{r.rcNo}</span> },
    { key: 'makers', label: 'Makers' },
    { key: 'model', label: 'Model' },
    { key: 'purchaseDate', label: 'Date' },
    { key: 'purchaseAmount', label: 'Amount', numeric: true, render: (r) => inr(r.purchaseAmount) },
    { key: 'repairCost', label: 'Repair', numeric: true, render: (r) => inr(r.repairCost) },
    {
      key: 'sellingPrice', label: 'Selled', numeric: true,
      render: (r) => r.sellingPrice ? inr(r.sellingPrice) : <span className="stamp pending">unsold</span>,
    },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Consultancy' }]} />
      <div className="page-header">
        <h1>Consultancy {rows && <span className="count">({rows.length})</span>}</h1>
        <button className="btn brass">+ New Bike</button>
      </div>
      {!rows ? <Loader label="Fetching vehicle purchases..." /> : (
        <DataTable columns={columns} rows={rows} emptyMessage="No vehicle purchases recorded yet." />
      )}
    </div>
  )
}
