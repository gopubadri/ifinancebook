import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'

export function ProtectedLayout() {
  const { user, ready } = useAuth()

  if (!ready) return null
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-body">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
