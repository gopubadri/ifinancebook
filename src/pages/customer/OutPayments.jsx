import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Loader from '../../components/Loader.jsx'
import DataTable from '../../components/DataTable.jsx'

export default function OutPayments() {
  const { customer } = useOutletContext()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    let alive = true
    setRows(null)
    api.getOutPayments(customer.id).then((data) => { if (alive) setRows(data) })
    return () => { alive = false }
  }, [customer.id])

  const columns = [
    { key: 'sno', label: 'SNo' },
    { key: 'amount', label: 'Amount', numeric: true, render: (r) => inr(r.amount) },
    { key: 'date', label: 'Date' },
    { key: 'interest', label: 'Interest', numeric: true, render: (r) => `${r.interest}%` },
    { key: 'paidAmount', label: 'Paid Amt', numeric: true, render: (r) => inr(r.paidAmount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`stamp ${r.status}`}>{r.status}</span> },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Out Payment's — HP No: {customer.hpNo}</h1>
      {!rows ? <Loader label="Fetching out payments..." /> : (
        <DataTable columns={columns} rows={rows} emptyMessage="No out payments recorded for this finance." />
      )}
    </div>
  )
}
