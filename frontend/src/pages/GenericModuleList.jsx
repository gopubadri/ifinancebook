import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import * as api from '../data/api.js'
import { inr, titleCase } from '../utils/format.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import DataTable from '../components/DataTable.jsx'
import Loader from '../components/Loader.jsx'
import Pagination from '../components/Pagination.jsx'

const LABELS = {
  name: 'Name', village: 'Village', balance: 'Balance', mobile: 'Mobile',
  cheque: 'Cheque', description: 'Description', date: 'Date', amount: 'Amount', status: 'Status',
  type: 'Type', paidDate: 'Paid Date', account: 'Account', customer: 'Customer', hpNo: 'HP No',
  agent: 'Agent', bikeBrand: 'Bike Brand', accountType: 'Account Type',
}
const NUMERIC = new Set(['balance', 'amount'])
const PAGE_SIZE = 20

function emptyRow(columns) {
  const row = {}
  for (const c of columns) {
    if (c === 'date' || c === 'paidDate') row[c] = new Date().toISOString().slice(0, 10)
    else if (c === 'status') row[c] = 'pending'
    else if (c === 'type') row[c] = 'Expense'
    else if (NUMERIC.has(c)) row[c] = ''
    else row[c] = ''
  }
  return row
}

export default function GenericModuleList() {
  const { key } = useParams()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1)

  const [mod, setMod] = useState(null)
  const [searchInput, setSearchInput] = useState(q)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(opts = {}) {
    const data = await api.getGenericModule(key, {
      q: opts.q ?? q,
      page: opts.page ?? page,
      limit: PAGE_SIZE,
    })
    setMod(data)
    setForm(emptyRow(data.columns || []))
  }

  useEffect(() => {
    setSearchInput(q)
  }, [q])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setShowForm(false)
    setError('')
    api.getGenericModule(key, { q, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!alive) return
        setMod(data)
        setForm(emptyRow(data.columns || []))
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || 'Failed to load module.')
        setMod(null)
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [key, q, page])

  function applySearch(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    const term = searchInput.trim()
    if (term) next.set('q', term)
    next.set('page', '1')
    setParams(next)
  }

  function setPage(nextPage) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    if (q) next.set('q', q)
    setParams(next)
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createModuleRow(key, form)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader label={`Loading ${titleCase(key)}...`} />
  if (!mod) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: titleCase(key) }]} />
        <div className="login-error">{error || 'Module not found.'}</div>
      </div>
    )
  }

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
        <h1>
          {mod.title} <span className="count">({mod.total ?? mod.rows.length})</span>
          {mod.phase2 && <span className="stamp paid" style={{ marginLeft: 10, fontSize: 11 }}>Phase 2</span>}
        </h1>
        <button className="btn brass" type="button" onClick={() => { setShowForm((v) => !v); setError('') }}>
          {showForm ? 'Cancel' : '+ New Account'}
        </button>
      </div>

      <form className="list-toolbar" onSubmit={applySearch}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={`Search ${mod.title.toLowerCase()}…`}
        />
        <button className="btn brass" type="submit">Search</button>
        {q && (
          <button className="btn outline" type="button" onClick={() => { setSearchInput(''); setParams({ page: '1' }) }}>
            Clear
          </button>
        )}
      </form>

      {showForm && (
        <form className="panel" style={{ marginBottom: 16 }} onSubmit={submit}>
          <div className="panel-header">New {mod.title}</div>
          <div className="panel-body">
            {error && <div className="login-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="field-grid">
              {mod.columns.map((col) => (
                <div className="field" key={col}>
                  <label>{LABELS[col] || titleCase(col)}</label>
                  {col === 'type' ? (
                    <select value={form[col] || ''} onChange={(e) => setForm((f) => ({ ...f, [col]: e.target.value }))}>
                      <option value="Expense">Expense</option>
                      <option value="Income">Income</option>
                    </select>
                  ) : col === 'status' ? (
                    <select value={form[col] || ''} onChange={(e) => setForm((f) => ({ ...f, [col]: e.target.value }))}>
                      <option value="pending">pending</option>
                      <option value="cleared">cleared</option>
                      <option value="paid">paid</option>
                    </select>
                  ) : (
                    <input
                      required={col === 'name' || col === 'amount'}
                      type={NUMERIC.has(col) ? 'number' : (col === 'date' || col === 'paidDate' ? 'date' : 'text')}
                      value={form[col] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [col]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <button className="btn brass" style={{ marginTop: 14 }} disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={mod.rows} emptyMessage={`No ${mod.title.toLowerCase()} recorded yet.`} />
      <Pagination
        page={mod.page || page}
        totalPages={mod.totalPages || 1}
        total={mod.total ?? mod.rows.length}
        limit={mod.limit || PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
