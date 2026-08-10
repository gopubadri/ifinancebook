import { useCallback, useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import * as api from '../../data/api.js'
import Breadcrumb from '../../components/Breadcrumb.jsx'
import ActionBar from '../../components/ActionBar.jsx'
import Loader from '../../components/Loader.jsx'

export default function CustomerFrame() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    setCustomer(null)
    setNotFound(false)
    const data = await api.getCustomerById(id)
    if (!data) setNotFound(true)
    else setCustomer(data)
  }, [id])

  useEffect(() => {
    let alive = true
    setCustomer(null)
    setNotFound(false)
    api.getCustomerById(id).then((data) => {
      if (!alive) return
      if (!data) setNotFound(true)
      else setCustomer(data)
    })
    return () => { alive = false }
  }, [id])

  const actions = [
    ['Receipt', `/finance/${id}/receipt`],
    ['Out Payment', `/finance/${id}/out-payments`],
    ['Hand Loans', `/finance/${id}/handloans`],
    ['Emi Reports', `/finance/${id}/emi-reports`],
    ['Bills', `/finance/${id}/bills`],
    ["OD's", `/finance/${id}/ods`],
    ['STM', `/finance/${id}/clearance`],
    ['RMD', `/finance/${id}/reminders`],
    ['Seized', `/finance/${id}/seized`],
    ['Closed', `/finance/${id}/closed`],
    ['Overview', `/finance/${id}`],
  ]

  if (notFound) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'Dashboard', to: '/dashboard' }, { label: "Finance's", to: '/finance' }, { label: 'Not found' }]} />
        <div className="empty-state">No customer found with id {id}.</div>
      </div>
    )
  }

  if (!customer) return <Loader label="Fetching customer record..." />

  return (
    <div>
      <ActionBar items={actions} />
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/dashboard' },
        { label: "Finance's", to: '/finance' },
        { label: customer.name },
      ]} />
      <Outlet context={{ customer, refreshCustomer: load }} />
    </div>
  )
}
