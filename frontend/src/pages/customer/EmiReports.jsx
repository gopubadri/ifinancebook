import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Loader from '../../components/Loader.jsx'
import DataTable from '../../components/DataTable.jsx'

export default function EmiReports() {
  const { customer } = useOutletContext()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let alive = true
    setSummary(null)
    api.getEmiSummary(customer.id).then((data) => { if (alive) setSummary(data) })
    return () => { alive = false }
  }, [customer.id])

  if (!summary) return <Loader label="Calculating EMI schedule..." />

  const columns = [
    { key: 'sno', label: 'SNo' },
    { key: 'dueDate', label: 'Due Date' },
    {
      key: 'amount', label: 'Amount', numeric: true,
      render: (r) => <>{inr(r.amount)} <span style={{ color: 'var(--muted)' }}>({inr(r.interestComponent)})</span></>,
    },
    { key: 'paidInterest', label: 'Paid Int', numeric: true, render: (r) => inr(r.paidInterest) },
    { key: 'paidAmount', label: 'Paid Amt', numeric: true, render: (r) => inr(r.paidAmount) },
    {
      key: 'balance', label: 'Balance', numeric: true,
      render: (r) => <>{inr(r.balance)} <span style={{ color: 'var(--muted)' }}>({inr(r.cumulativeBalance)})</span></>,
    },
    {
      key: 'status', label: 'Status',
      render: (r) => <span className={`stamp ${r.status}`}>{r.status}</span>,
    },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>EMI's — HP No: {customer.hpNo}</h1>

      <div className="summary-grid">
        <div className="summary-cell"><div className="label">Paid Amount</div><div className="value">₹{inr(summary.paidAmount)}</div></div>
        <div className="summary-cell"><div className="label">Pending Balance</div><div className="value">₹{inr(summary.pendingBalance)}</div></div>
        <div className="summary-cell"><div className="label">Balance</div><div className="value">₹{inr(summary.balance)}</div></div>
        <div className="summary-cell"><div className="label">Total Balance</div><div className="value">₹{inr(summary.totalBalance)}</div></div>
        <div className="summary-cell"><div className="label">Total EMI's</div><div className="value">{summary.totalEmis}</div></div>
        <div className="summary-cell"><div className="label">Paid EMI's</div><div className="value">{summary.paidEmis}</div></div>
        <div className="summary-cell"><div className="label">Remaining EMI's</div><div className="value">{summary.remainingEmis}</div></div>
        <div className="summary-cell"><div className="label">Total Loan</div><div className="value">₹{inr(summary.totalLoan)}</div></div>
      </div>

      <DataTable columns={columns} rows={summary.schedule} />
      <p style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
        Amount column shows EMI (interest component) · Balance column shows due (cumulative balance)
      </p>
    </div>
  )
}
