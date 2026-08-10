import { NavLink } from 'react-router-dom'

export default function ActionBar({ items }) {
  return (
    <div className="action-bar">
      {items.map(([label, to]) => (
        <NavLink
          key={label}
          to={to}
          end
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {label}
        </NavLink>
      ))}
    </div>
  )
}
