import { Link } from 'react-router-dom'

export default function Breadcrumb({ items }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : (
              <span className={isLast ? 'current' : ''}>{item.label}</span>
            )}
            {!isLast && <span className="sep">/</span>}
          </span>
        )
      })}
    </div>
  )
}
