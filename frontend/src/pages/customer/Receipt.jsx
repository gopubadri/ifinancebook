import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import * as api from '../../data/api.js'
import { inr } from '../../utils/format.js'

export default function Receipt() {
  const { customer } = useOutletContext()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState(customer.emiAmount)
  const [ta, setTa] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const total = Number(amount || 0) + Number(ta || 0)

  function submit(e) {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    api.recordEmiPayment({ customerId: customer.id, date, amount, ta, total }).then((res) => {
      setSaving(false)
      setResult(res)
    })
  }

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>EMI Payment — HP No: {customer.hpNo}</h1>

      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="panel-body">
          {result && (
            <div className="login-error" style={{ background: '#e9f5ec', color: 'var(--success)' }}>
              Payment recorded. Receipt No: <strong className="mono">{result.receiptNo}</strong>
            </div>
          )}
          <form onSubmit={submit}>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>TA (Travelling Allowance)</label>
              <input type="number" value={ta} onChange={(e) => setTa(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label>Total</label>
              <input value={inr(total)} readOnly />
            </div>
            <button className="btn brass" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Recording...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
