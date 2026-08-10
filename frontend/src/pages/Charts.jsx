import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import * as api from '../data/api.js'
import Breadcrumb from '../components/Breadcrumb.jsx'
import Loader from '../components/Loader.jsx'

const COLORS = ['#16342c', '#b8863a']

export default function Charts() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('hps')

  useEffect(() => {
    let alive = true
    api.getChartsData().then((d) => { if (alive) setData(d) })
    return () => { alive = false }
  }, [])

  return (
    <div>
      <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Charts' }]} />
      <h1 style={{ marginBottom: 16 }}>Charts</h1>

      <div className="action-bar">
        <button className={view === 'hps' ? 'active' : ''} onClick={() => setView('hps')}>HP's</button>
        <button className={view === 'financed' ? 'active' : ''} onClick={() => setView('financed')}>Financed Amount</button>
        <button className={view === 'collection' ? 'active' : ''} onClick={() => setView('collection')}>Collection</button>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ height: 380 }}>
          {!data ? <Loader label="Building chart..." /> : (
            <ResponsiveContainer width="100%" height="100%">
              {view === 'hps' ? (
                <PieChart>
                  <Pie data={data.hps} dataKey="value" nameKey="name" outerRadius={130} label>
                    {data.hps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              ) : view === 'financed' ? (
                <BarChart data={data.financedAmount}>
                  <CartesianGrid stroke="#e5ddc0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#16342c" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={data.collection}>
                  <CartesianGrid stroke="#e5ddc0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="collected" stroke="#b8863a" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
