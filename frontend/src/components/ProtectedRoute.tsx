import { Navigate } from 'react-router-dom'
import { isAuthenticated, getCurrentUser } from '@/lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getCurrentUser()?.role?.toLowerCase()
    const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase())

    if (!userRole) {
      return <Navigate to="/login" replace />
    }

    if (!normalizedAllowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
