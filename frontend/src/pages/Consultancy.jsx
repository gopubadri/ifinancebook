import { useEffect, useState } from 'react'
import * as api from '../data/api.js'
import { inr } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'

const empty = {
  rcNo: '',
  makers: '',
  model: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  purchaseAmount: '',
  repairCost: 0,
  sellingPrice: 0,
}

export default function Consultancy() {
  const [rows, setRows] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [sellId, setSellId] = useState(null)
  const [sellPrice, setSellPrice] = useState('')
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setRows(await api.getBikePurchases())
  }

  useEffect(() => {
    let alive = true
    api.getBikePurchases().then((data) => { if (alive) setRows(data) })
    return () => { alive = false }
  }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createBikePurchase({
        ...form,
        purchaseAmount: Number(form.purchaseAmount || 0),
        repairCost: Number(form.repairCost || 0),
        sellingPrice: Number(form.sellingPrice || 0),
      })
      setForm(empty)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.message || 'Could not save bike.')
    } finally {
      setSaving(false)
    }
  }

  async function sellBike(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateBikePurchase(sellId, {
        sellingPrice: Number(sellPrice),
        status: 'sold',
        soldDate: new Date().toISOString().slice(0, 10),
      })
      setSellId(null)
      setSellPrice('')
      await load()
    } catch (err) {
      setError(err.message || 'Could not sell bike.')
    } finally {
      setSaving(false)
    }
  }

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
    {
      key: 'actions', label: '',
      render: (r) => (!r.sellingPrice ? (
        <button type="button" className="btn sm outline" onClick={() => { setSellId(r.id); setSellPrice(String(r.purchaseAmount + r.repairCost)); setError('') }}>
          Sell
        </button>
      ) : <span className="stamp paid">{r.status || 'sold'}</span>),
    },
  ]

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Consultancy' }]} />
      <div className="page-header">
        <h1>Consultancy {rows && <span className="count">({rows.length})</span>}</h1>
        <button className="btn brass" type="button" onClick={() => { setShowForm((v) => !v); setSellId(null) }}>
          {showForm ? 'Cancel' : '+ New Bike'}
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
        Phase 2 vehicle trading — purchases post to Assets; selling updates stock status.
      </p>

      {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}

      {showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-header">New bike purchase</div>
          <div className="panel-body">
            <div className="field-grid">
              <div className="field"><label>RC No</label><input required value={form.rcNo} onChange={(e) => setForm((f) => ({ ...f, rcNo: e.target.value }))} /></div>
              <div className="field"><label>Makers</label><input value={form.makers} onChange={(e) => setForm((f) => ({ ...f, makers: e.target.value }))} /></div>
              <div className="field"><label>Model</label><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></div>
              <div className="field"><label>Purchase Date</label><input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} /></div>
              <div className="field"><label>Purchase Amount</label><input required type="number" min="0" value={form.purchaseAmount} onChange={(e) => setForm((f) => ({ ...f, purchaseAmount: e.target.value }))} /></div>
              <div className="field"><label>Repair Cost</label><input type="number" min="0" value={form.repairCost} onChange={(e) => setForm((f) => ({ ...f, repairCost: e.target.value }))} /></div>
            </div>
            <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save bike'}
            </button>
          </div>
        </form>
      )}

      {sellId && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={sellBike}>
          <div className="panel-header">Sell bike #{sellId}</div>
          <div className="panel-body">
            <div className="field" style={{ maxWidth: 240 }}>
              <label>Selling price</label>
              <input required type="number" min="1" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn brass" disabled={saving} type="submit">{saving ? 'Saving...' : 'Confirm sale'}</button>
              <button className="btn outline" type="button" onClick={() => setSellId(null)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {!rows ? <Loader label="Fetching vehicle purchases..." /> : (
        <DataTable columns={columns} rows={rows} emptyMessage="No vehicle purchases recorded yet." />
      )}
    </div>
  )
}
