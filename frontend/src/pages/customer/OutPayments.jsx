import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Loader from '../../components/Loader.jsx'
import DataTable from '../../components/DataTable.jsx'

export default function OutPayments() {
  const { customer } = useOutletContext()
  const [rows, setRows] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    amount: '',
    interest: 0,
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    status: 'paid',
  })
  const [useDueDate, setUseDueDate] = useState(false)

  async function load() {
    const data = await api.getOutPayments(customer.id)
    setRows(data)
  }

  useEffect(() => {
    let alive = true
    setRows(null)
    Promise.all([
      api.getOutPayments(customer.id),
      api.getSettings().catch(() => null),
    ]).then(([data, settings]) => {
      if (!alive) return
      setRows(data)
      const enabled = String(settings?.hpOpDueDate || '').toUpperCase() === 'YES'
      setUseDueDate(enabled)
      if (enabled) {
        const d = new Date()
        d.setMonth(d.getMonth() + 1)
        setForm((f) => ({ ...f, dueDate: d.toISOString().slice(0, 10) }))
      }
    })
    return () => { alive = false }
  }, [customer.id])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createOutPayment(customer.id, {
        ...form,
        amount: Number(form.amount),
        interest: Number(form.interest),
        paidAmount: Number(form.amount),
        dueDate: form.dueDate || undefined,
      })
      setShowForm(false)
      setForm((f) => ({ ...f, amount: '' }))
      await load()
    } catch (err) {
      setError(err.message || 'Could not save out payment.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'sno', label: 'SNo' },
    { key: 'amount', label: 'Amount', numeric: true, render: (r) => inr(r.amount) },
    { key: 'date', label: 'Date' },
    { key: 'dueDate', label: 'Due Date', render: (r) => r.dueDate || '—' },
    { key: 'interest', label: 'Interest', numeric: true, render: (r) => `${r.interest}%` },
    { key: 'paidAmount', label: 'Paid Amt', numeric: true, render: (r) => inr(r.paidAmount) },
    { key: 'status', label: 'Status', render: (r) => <span className={`stamp ${r.status}`}>{r.status}</span> },
  ]

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>Out Payment's — HP No: {customer.hpNo}</h1>
        <button className="btn brass" type="button" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add Out Payment'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Also syncs to Hand Loans tab and Transactions → HandLoans on the dashboard.
      </p>

      {showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-body">
            {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field-grid">
              <div className="field">
                <label>Amount</label>
                <input required type="number" min="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="field">
                <label>Interest %</label>
                <input type="number" step="0.1" value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              {useDueDate && (
                <div className="field">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              )}
              <div className="field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="paid">paid</option>
                  <option value="pending">pending</option>
                </select>
              </div>
            </div>
            <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {!rows ? <Loader label="Fetching out payments..." /> : (
        <DataTable columns={columns} rows={rows} emptyMessage="No out payments recorded for this finance." />
      )}
      <p style={{ marginTop: 12, fontSize: 13 }}>
        <Link className="row-link" to="/module/handloans-new">View HandLoans module →</Link>
      </p>
    </div>
  )
}
