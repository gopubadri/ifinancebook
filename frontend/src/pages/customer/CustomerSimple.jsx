import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'
import Loader from '../../components/Loader.jsx'
import DataTable from '../../components/DataTable.jsx'

export default function CustomerSimple({ title }) {
  const { customer, refreshCustomer } = useOutletContext()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [outPayments, setOutPayments] = useState([])
  const [handloans, setHandloans] = useState([])
  const [bills, setBills] = useState([])
  const [reminders, setReminders] = useState([])
  const [settlement, setSettlement] = useState(null)
  const [showHlForm, setShowHlForm] = useState(false)
  const [showRmdForm, setShowRmdForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [hlForm, setHlForm] = useState({
    loanAmount: '',
    interestRate: 0,
    issuedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [rmdForm, setRmdForm] = useState({
    remindDate: new Date().toISOString().slice(0, 10),
    message: '',
  })
  const [stmForm, setStmForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    waiverAmount: 0,
    amountCollected: '',
    notes: '',
  })

  async function load() {
    const [emi, outs, hls] = await Promise.all([
      api.getEmiSummary(customer.id),
      api.getOutPayments(customer.id),
      api.getCustomerHandloans(customer.id).catch(() => []),
    ])
    setSummary(emi)
    setOutPayments(outs || [])
    setHandloans(hls || [])

    if (title === 'Bills') {
      setBills(await api.getCustomerBills(customer.id))
    }
    if (title === 'Reminders') {
      setReminders(await api.getCustomerReminders(customer.id))
    }
    if (title === 'Clearance / STM') {
      const preview = await api.getSettlementPreview(customer.id)
      setSettlement(preview)
      setStmForm((f) => ({
        ...f,
        amountCollected: preview.totalDue != null ? String(preview.totalDue) : '',
      }))
    }
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setMessage('')
    load().then(() => { if (alive) setLoading(false) }).catch((err) => {
      if (alive) {
        setError(err.message || 'Failed to load.')
        setLoading(false)
      }
    })
    return () => { alive = false }
  }, [customer.id, title])

  async function submitHl(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createCustomerHandloan(customer.id, {
        loanAmount: Number(hlForm.loanAmount),
        interestRate: Number(hlForm.interestRate),
        issuedDate: hlForm.issuedDate,
        notes: hlForm.notes,
      })
      setShowHlForm(false)
      setHlForm((f) => ({ ...f, loanAmount: '', notes: '' }))
      await load()
    } catch (err) {
      setError(err.message || 'Could not save handloan.')
    } finally {
      setSaving(false)
    }
  }

  async function submitReminder(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createCustomerReminder(customer.id, rmdForm)
      setShowRmdForm(false)
      setRmdForm((f) => ({ ...f, message: '' }))
      await load()
    } catch (err) {
      setError(err.message || 'Could not save reminder.')
    } finally {
      setSaving(false)
    }
  }

  async function markReminder(id, status) {
    setError('')
    try {
      await api.updateCustomerReminder(customer.id, id, { status })
      await load()
    } catch (err) {
      setError(err.message || 'Could not update reminder.')
    }
  }

  async function submitSettlement(e) {
    e.preventDefault()
    if (!window.confirm('Close this finance with settlement? This cannot be undone from here.')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await api.createSettlement(customer.id, {
        date: stmForm.date,
        waiverAmount: Number(stmForm.waiverAmount || 0),
        amountCollected: Number(stmForm.amountCollected || 0),
        notes: stmForm.notes,
      })
      setMessage(`Settled. Collected ${inr(result.amountCollected)}. Finance closed.`)
      if (refreshCustomer) await refreshCustomer()
      await load()
    } catch (err) {
      setError(err.message || 'Settlement failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader label={`Loading ${title}...`} />

  const today = new Date().toISOString().slice(0, 10)
  const overdue = (summary?.schedule || []).filter((r) => r.status !== 'paid' && r.dueDate < today)

  if (title === "OD's") {
    const columns = [
      { key: 'sno', label: 'EMI #' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'daysOverdue', label: 'Days', numeric: true },
      { key: 'balance', label: 'Overdue', numeric: true, render: (r) => inr(r.balance) },
      { key: 'odInterest', label: 'OD Int.', numeric: true, render: (r) => inr(r.odInterest || 0) },
      { key: 'odTotal', label: 'Total Due', numeric: true, render: (r) => inr(r.odTotal || r.balance) },
      { key: 'status', label: 'Status', render: (r) => <span className={`stamp ${r.status}`}>{r.status}</span> },
    ]
    return (
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>OD&apos;s — HP No: {customer.hpNo}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Rate {summary?.odInterestRate ?? 0}% / day.
          Principal OD: <strong className="mono">{inr(summary?.overdueAmount || 0)}</strong>
          {' · '}Interest: <strong className="mono">{inr(summary?.odInterestTotal || 0)}</strong>
          {' · '}Grand: <strong className="mono">{inr(summary?.odGrandTotal || 0)}</strong>
        </p>
        <DataTable columns={columns} rows={overdue} emptyMessage="No overdue amount for this finance." />
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <Link className="row-link" to={`/finance/${customer.id}/receipt`}>Record a receipt →</Link>
        </p>
      </div>
    )
  }

  if (title === 'Bills') {
    const columns = [
      { key: 'billNo', label: 'Bill / Rec. No' },
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount', numeric: true, render: (r) => inr(r.amount) },
      { key: 'ta', label: 'TA', numeric: true, render: (r) => inr(r.ta) },
      { key: 'total', label: 'Total', numeric: true, render: (r) => inr(r.total) },
      { key: 'createdBy', label: 'By' },
    ]
    return (
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>Bills — HP No: {customer.hpNo}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Receipt history for this finance ({bills.length} bill(s)).
        </p>
        <DataTable columns={columns} rows={bills} emptyMessage="No receipts yet for this finance." />
        <p style={{ marginTop: 12, fontSize: 13 }}>
          <Link className="row-link" to={`/finance/${customer.id}/receipt`}>+ New receipt →</Link>
        </p>
      </div>
    )
  }

  if (title === 'Reminders') {
    const columns = [
      { key: 'remindDate', label: 'Remind Date' },
      { key: 'message', label: 'Message' },
      { key: 'status', label: 'Status', render: (r) => <span className={`stamp ${r.status === 'done' ? 'paid' : 'pending'}`}>{r.status}</span> },
      { key: 'createdBy', label: 'By' },
      {
        key: 'actions',
        label: '',
        render: (r) => r.status === 'pending' ? (
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn outline" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => markReminder(r.id, 'done')}>Done</button>
            <button type="button" className="btn outline" style={{ padding: '2px 8px', fontSize: 12 }} onClick={() => markReminder(r.id, 'cancelled')}>Cancel</button>
          </span>
        ) : null,
      },
    ]
    return (
      <div>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>Reminders — HP No: {customer.hpNo}</h1>
          <button className="btn brass" type="button" onClick={() => setShowRmdForm((v) => !v)}>
            {showRmdForm ? 'Cancel' : '+ Add Reminder'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          Outstanding: {inr(summary?.balance || 0)}. Overdue EMIs: {summary?.overdueCount || 0}.
        </p>
        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        {showRmdForm && (
          <form className="panel" style={{ marginBottom: 16 }} onSubmit={submitReminder}>
            <div className="panel-body">
              <div className="field-grid">
                <div className="field">
                  <label>Remind Date</label>
                  <input required type="date" value={rmdForm.remindDate} onChange={(e) => setRmdForm((f) => ({ ...f, remindDate: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Message</label>
                  <input required value={rmdForm.message} onChange={(e) => setRmdForm((f) => ({ ...f, message: e.target.value }))} placeholder="Call customer / send notice…" />
                </div>
              </div>
              <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
                {saving ? 'Saving...' : 'Save reminder'}
              </button>
            </div>
          </form>
        )}
        <DataTable columns={columns} rows={reminders} emptyMessage="No reminders yet." />
      </div>
    )
  }

  if (title === 'Hand Loans') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'loanAmount', label: 'Loan Amt', numeric: true, render: (r) => inr(r.loanAmount) },
      { key: 'interestRate', label: 'Interest', numeric: true, render: (r) => `${r.interestRate}%` },
      { key: 'issuedDate', label: 'Issued' },
      { key: 'balance', label: 'Balance', numeric: true, render: (r) => inr(r.balance) },
      { key: 'status', label: 'Status', render: (r) => <span className={`stamp ${r.status === 'open' ? 'pending' : 'paid'}`}>{r.status}</span> },
    ]
    return (
      <div>
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>Hand Loans — HP No: {customer.hpNo}</h1>
          <button className="btn brass" type="button" onClick={() => setShowHlForm((v) => !v)}>
            {showHlForm ? 'Cancel' : '+ New Handloan'}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
          Customer-specific handloans (Phase 2). Also appear under Transactions → HandLoans.
        </p>

        {showHlForm && (
          <form className="panel" style={{ marginBottom: 16 }} onSubmit={submitHl}>
            <div className="panel-body">
              {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
              <div className="field-grid">
                <div className="field">
                  <label>Loan Amount</label>
                  <input required type="number" min="1" value={hlForm.loanAmount} onChange={(e) => setHlForm((f) => ({ ...f, loanAmount: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Interest %</label>
                  <input type="number" step="0.1" value={hlForm.interestRate} onChange={(e) => setHlForm((f) => ({ ...f, interestRate: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Issued Date</label>
                  <input type="date" value={hlForm.issuedDate} onChange={(e) => setHlForm((f) => ({ ...f, issuedDate: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input value={hlForm.notes} onChange={(e) => setHlForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
                {saving ? 'Saving...' : 'Save handloan'}
              </button>
            </div>
          </form>
        )}

        <DataTable columns={columns} rows={handloans} emptyMessage="No customer handloans yet." />
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Out payments: <Link className="row-link" to={`/finance/${customer.id}/out-payments`}>{outPayments.length} record(s)</Link>
          {' · '}
          <Link className="row-link" to="/module/handloans-new">All HandLoans module →</Link>
        </p>
      </div>
    )
  }

  if (title === 'Seized Reports') {
    return (
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 16 }}>Seized Reports — HP No: {customer.hpNo}</h1>
        <div className="panel"><div className="panel-body">
          <p>Seized status: <span className={`stamp ${customer.seized === 'YES' ? 'pending' : 'paid'}`}>{customer.seized}</span></p>
          {customer.seizedDate && <p style={{ marginTop: 8, fontSize: 13 }}>Seized date: <strong>{customer.seizedDate}</strong></p>}
          <Link className="btn outline" style={{ marginTop: 12 }} to={`/finance/${customer.id}`}>Go to Overview</Link>
        </div></div>
      </div>
    )
  }

  if (title === 'Closed Reports') {
    return (
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 16 }}>Closed Reports — HP No: {customer.hpNo}</h1>
        <div className="panel"><div className="panel-body">
          <p>Closed status: <span className={`stamp ${customer.closed === 'YES' ? 'paid' : 'pending'}`}>{customer.closed}</span></p>
          {customer.closedDate && <p style={{ marginTop: 8, fontSize: 13 }}>Closed date: <strong>{customer.closedDate}</strong></p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Link className="btn outline" to={`/finance/${customer.id}`}>Overview</Link>
            <Link className="btn brass" to={`/finance/${customer.id}/emi-reports`}>EMI Reports</Link>
          </div>
        </div></div>
      </div>
    )
  }

  if (title === 'Clearance / STM') {
    const closed = customer.closed === 'YES' || settlement?.closed === 'YES'
    return (
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 16 }}>Clearance / STM — HP No: {customer.hpNo}</h1>
        {message && <div className="login-error" style={{ background: '#e9f5ec', color: 'var(--success)', marginBottom: 12 }}>{message}</div>}
        {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="panel"><div className="panel-body">
          <div className="field-grid">
            <div className="field"><label>Outstanding EMI balance</label><input readOnly value={inr(settlement?.outstanding ?? summary?.balance ?? 0)} /></div>
            <div className="field"><label>Settlement interest ({settlement?.settlementInterestRate ?? 0}%)</label><input readOnly value={inr(settlement?.settlementInterest || 0)} /></div>
            <div className="field"><label>Total due</label><input readOnly value={inr(settlement?.totalDue ?? 0)} /></div>
            <div className="field"><label>Paid so far</label><input readOnly value={inr(summary?.paidAmount || 0)} /></div>
            <div className="field"><label>Remaining EMIs</label><input readOnly value={summary?.remainingEmis ?? 0} /></div>
            <div className="field"><label>CLR Date</label><input readOnly value={customer.clrDate || '—'} /></div>
          </div>

          {closed ? (
            <p style={{ fontSize: 13, marginTop: 14 }}>
              Finance is closed{customer.closedDate ? ` since ${customer.closedDate}` : ''}.
            </p>
          ) : (
            <form onSubmit={submitSettlement} style={{ marginTop: 16 }}>
              <div className="field-grid">
                <div className="field">
                  <label>Settlement date</label>
                  <input type="date" required value={stmForm.date} onChange={(e) => setStmForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Waiver amount</label>
                  <input type="number" min="0" step="0.01" value={stmForm.waiverAmount} onChange={(e) => setStmForm((f) => ({ ...f, waiverAmount: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Amount collected</label>
                  <input type="number" min="0" step="0.01" required value={stmForm.amountCollected} onChange={(e) => setStmForm((f) => ({ ...f, amountCollected: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Notes</label>
                  <input value={stmForm.notes} onChange={(e) => setStmForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
                {saving ? 'Settling...' : 'Settle & Close Finance'}
              </button>
            </form>
          )}
        </div></div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>{title} — HP No: {customer.hpNo}</h1>
      <div className="panel"><div className="panel-body">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
          Linked customer {customer.name}.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn brass" to={`/finance/${customer.id}/receipt`}>Receipt</Link>
          <Link className="btn outline" to={`/finance/${customer.id}/emi-reports`}>EMI Reports</Link>
        </div>
      </div></div>
    </div>
  )
}
