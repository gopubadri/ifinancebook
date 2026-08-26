import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../api/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { dmy, inr } from '../../utils/format.js'

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

  useEffect(() => {
    let alive = true
    api.getSettings().then((data) => { if (alive) setSettings(data) }).catch(() => {})
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
      const res = await api.recordEmiPayment({ customerId: customer.id, date, amount, ta, total })
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

      {result && (
        <div className="receipt-slip" style={{ marginBottom: 18 }}>
          <div className="receipt-slip-brand">
            <h2>SRI ADITYA FINANCE</h2>
            <p>{settings?.city || 'TADEPALLIGUDEM'}{settings?.street ? ` · ${settings.street}` : ''}</p>
            {settings?.mobile && <p>Ph: {settings.mobile}</p>}
          </div>
          <div className="receipt-slip-title">EMI Receipt</div>
          <div className="receipt-slip-row"><span>Receipt No</span><span className="mono">{rcNo}</span></div>
          <div className="receipt-slip-row"><span>Date</span><span>{dmy(result.date || date)}</span></div>
          <div className="receipt-slip-row"><span>HP No</span><span className="mono">{customer.hpNo}</span></div>
          <div className="receipt-slip-row"><span>Name</span><span>{customer.name}</span></div>
          <div className="receipt-slip-row"><span>Reg No</span><span className="mono">{customer.regNo || '—'}</span></div>
          <div className="receipt-slip-row"><span>Village</span><span>{customer.village || '—'}</span></div>
          <div className="receipt-slip-row"><span>EMI Amount</span><span>{inr(result.amount)}</span></div>
          <div className="receipt-slip-row"><span>TA</span><span>{inr(result.ta)}</span></div>
          <div className="receipt-slip-row total"><span>Total received</span><span>₹{inr(result.total)}</span></div>
          <div className="receipt-slip-row"><span>Received by</span><span>{user?.name || '—'}</span></div>
          <div className="receipt-slip-actions no-print">
            <button type="button" className="btn brass" onClick={() => window.print()}>Print receipt</button>
            <button type="button" className="btn outline" onClick={resetForm}>New receipt</button>
          </div>
        </div>
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
