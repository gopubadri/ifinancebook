import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../data/api.js'
import { inr, titleCase } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'

const LABELS = {
  name: 'Name', village: 'Village', balance: 'Balance', mobile: 'Mobile',
  cheque: 'Cheque', description: 'Description', date: 'Date', amount: 'Amount', status: 'Status',
  type: 'Type', paidDate: 'Paid Date', account: 'Account', customer: 'Customer', hpNo: 'HP No',
  agent: 'Agent', bikeBrand: 'Bike Brand', accountType: 'Account Type',
}
const NUMERIC = new Set(['balance', 'amount'])

export default function GenericModuleList() {
  const { key } = useParams()
  const [mod, setMod] = useState(null)

  useEffect(() => {
    let alive = true
    setMod(null)
    api.getGenericModule(key).then((data) => { if (alive) setMod(data) })
    return () => { alive = false }
  }, [key])

  if (!mod) return <Loader label={`Loading ${titleCase(key)}...`} />

  const columns = mod.columns.map((c) => ({
    key: c,
    label: LABELS[c] || titleCase(c),
    numeric: NUMERIC.has(c),
    render: NUMERIC.has(c) ? (row) => inr(row[c]) : undefined,
  }))

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: mod.title }]} />
      <div className="page-header">
        <h1>{mod.title} <span className="count">({mod.rows.length})</span></h1>
        <button className="btn brass">+ New Account</button>
      </div>
      <DataTable columns={columns} rows={mod.rows} emptyMessage={`No ${mod.title.toLowerCase()} recorded yet.`} />
    </div>
  )
}
