import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

function Section({ title, count, children, viewAllTo }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null
  return (
    <div className="search-section">
      <div className="search-section-header">
        <h2>{title} {count != null && <span className="count">({count})</span>}</h2>
        {viewAllTo && <Link className="row-link" to={viewAllTo}>Open folder →</Link>}
      </div>
      <div className="search-hit-list">{children}</div>
    </div>
  )
}

function Hit({ item }) {
  return (
    <Link to={item.to} className="search-hit">
      <strong>{item.title}</strong>
      <span>{item.subtitle}</span>
    </Link>
  )
}

export default function GlobalSearch() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const [input, setInput] = useState(q)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInput(q)
  }, [q])

  useEffect(() => {
    if (!q.trim()) {
      setData(null)
      setLoading(false)
      return undefined
    }
    let alive = true
    setLoading(true)
    api.globalSearch(q, 12)
      .then((res) => { if (alive) setData(res) })
      .catch(() => { if (alive) setData(null) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [q])

  function submit(e) {
    e.preventDefault()
    const term = input.trim()
    if (!term) return
    setParams({ q: term })
  }

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Search' }]} />
      <div className="page-header">
        <h1>Global Search</h1>
      </div>

      <form className="list-toolbar" onSubmit={submit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search dashboard folders, finances, modules, accounts, users…"
          autoFocus
        />
        <button className="btn brass" type="submit">Search</button>
      </form>

      {!q && (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Search across Finance&apos;s, Handloans, Banks, Capitals, Consultancy, Users, Accounts, Journals, and every dashboard folder.
        </p>
      )}

      {q && loading && <Loader label={`Searching for "${q}"...`} />}

      {q && !loading && data && (
        <>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
            Results for &quot;{data.q}&quot; — {data.totals?.all || 0} match{(data.totals?.all || 0) === 1 ? '' : 'es'} across the app.
          </p>

          <Section title="Dashboard folders" count={data.totals?.pages}>
            {data.pages?.map((item) => <Hit key={`p-${item.to}`} item={item} />)}
          </Section>

          <Section title="Finances" count={data.totals?.customers} viewAllTo={`/finance?q=${encodeURIComponent(q)}&page=1`}>
            {data.customers?.map((item) => <Hit key={`c-${item.id}`} item={item} />)}
          </Section>

          <Section title="Consultancy" count={data.totals?.bikes} viewAllTo="/consultancy">
            {data.bikes?.map((item) => <Hit key={`b-${item.id}`} item={item} />)}
          </Section>

          <Section title="Users" count={data.totals?.users} viewAllTo="/users">
            {data.users?.map((item) => <Hit key={`u-${item.id}`} item={item} />)}
          </Section>

          <Section title="Accounts" count={data.totals?.accounts} viewAllTo="/accounting/accounts">
            {data.accounts?.map((item) => <Hit key={`a-${item.id}`} item={item} />)}
          </Section>

          <Section title="Journals" count={data.totals?.journals} viewAllTo="/accounting/journals">
            {data.journals?.map((item) => <Hit key={`j-${item.id}`} item={item} />)}
          </Section>

          {data.modules?.map((mod) => (
            <Section key={mod.label} title={mod.label} count={mod.total} viewAllTo={mod.to}>
              {mod.items?.map((item) => <Hit key={`${mod.label}-${item.id}`} item={item} />)}
            </Section>
          ))}

          {(data.totals?.all || 0) === 0 && (
            <div className="empty-state">No matches for &quot;{q}&quot; in dashboard folders or module data.</div>
          )}
        </>
      )}
    </div>
  )
}
