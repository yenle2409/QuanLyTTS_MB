import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '@/lib/auth'

export default function RoleBasedRedirect() {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Redirect based on role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />
    case 'hr':
      return <Navigate to="/hr" replace />
    case 'mentor':
      return <Navigate to="/mentor" replace />
    case 'intern':
      return <Navigate to="/intern" replace />
    default:
      return <Navigate to="/login" replace />
  }
}
