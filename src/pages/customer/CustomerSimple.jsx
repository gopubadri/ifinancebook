import { useOutletContext } from 'react-router-dom'

export default function CustomerSimple({ title, note }) {
  const { customer } = useOutletContext()
  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>{title} — HP No: {customer.hpNo}</h1>
      <div className="table-wrap">
        <div className="empty-state">{note || `No ${title.toLowerCase()} records found for this finance.`}</div>
      </div>
    </div>
  )
}
