import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { inr } from '../../utils/format.js'
import ReceiptSlip from '../../components/ReceiptSlip.jsx'

export default function Receipt() {
  const { customer, refreshCustomer } = useOutletContext()
  const { user } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(customer.emiAmount)
  const [ta, setTa] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(null)
  const [banks, setBanks] = useState([])
  const [bankId, setBankId] = useState('')

  useEffect(() => {
    let alive = true
    api.getSettings().then((data) => { if (alive) setSettings(data) }).catch(() => {})
    api.getGenericModule('banks-new', { limit: 100 })
      .then((data) => {
        if (!alive) return
        const rows = data?.rows || []
        setBanks(rows)
        if (rows[0]) setBankId(String(rows[0].id))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const total = Number(amount || 0) + Number(ta || 0)
  const series = settings?.hpRcptSeries || '00'
  const rcNo = result ? `${series}/${result.receiptNo}` : ''

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    setError('')
    try {
      const res = await api.recordEmiPayment({
        customerId: customer.id,
        date,
        amount,
        ta,
        total,
        bankId: bankId ? Number(bankId) : undefined,
      })
      setResult(res)
      if (refreshCustomer) await refreshCustomer()
    } catch (err) {
      setError(err.message || 'Could not record payment.')
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setResult(null)
    setError('')
    setAmount(customer.emiAmount)
    setTa(0)
    setDate(new Date().toISOString().slice(0, 10))
  }

  return (
    <div>
      <h1 className="no-print" style={{ fontSize: 18, marginBottom: 16 }}>EMI Payment — HP No: {customer.hpNo}</h1>

      {result?.overpayment > 0 && (
        <div className="login-error no-print" style={{ marginBottom: 12, background: '#fff6e0', color: '#7a5b10' }}>
          ₹{inr(result.overpayment)} is more than the unpaid EMIs. It is stored as overpayment and was not applied to the schedule.
        </div>
      )}

      {result?.ledgerWarning && (
        <div className="login-error no-print" style={{ marginBottom: 12 }}>
          Receipt saved. The cash book was updated, but the ledger was not posted: {result.ledgerWarning}
        </div>
      )}

      {result && (
        <ReceiptSlip
          settings={settings}
          rcNo={rcNo}
          date={result.date || date}
          customer={customer}
          amount={result.amount}
          ta={result.ta}
          total={result.total}
          receivedBy={user?.name}
          onClose={resetForm}
          closeLabel="New receipt"
        />
      )}

      <div className="panel no-print" style={{ maxWidth: 420 }}>
        <div className="panel-body">
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!result} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!!result} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>TA (Travelling Allowance)</label>
              <input type="number" value={ta} onChange={(e) => setTa(e.target.value)} disabled={!!result} />
            </div>
            {banks.length > 0 && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Deposit to</label>
                <select value={bankId} onChange={(e) => setBankId(e.target.value)} disabled={!!result}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.balance != null ? ` · ${inr(b.balance)}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Total</label>
              <input value={inr(total)} readOnly />
            </div>
            <button className="btn brass" disabled={saving || !!result} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Recording...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
