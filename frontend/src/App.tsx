import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/auth/LoginPage'
import TestPage from './pages/TestPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import HRDashboard from './pages/hr/HRDashboard'
import MentorDashboard from './pages/mentor/MentorDashboard'
import InternDashboard from './pages/intern/InternDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRedirect from './components/RoleBasedRedirect'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from './components/ui/toaster'
import { isAuthenticated, getCurrentUser } from './lib/auth'

const queryClient = new QueryClient()

// Check if user is properly authenticated (both token and valid user data exist)
function isFullyAuthenticated(): boolean {
  if (!isAuthenticated()) return false
  const user = getCurrentUser()
  if (!user || !user.role) return false
  return ['admin', 'hr', 'mentor', 'intern'].includes(user.role)
}

function App() {
  const authenticated = isFullyAuthenticated()

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Test route */}
          <Route path="/test" element={<TestPage />} />

          {/* Public routes */}
          <Route
            path="/login"
            element={authenticated ? <RoleBasedRedirect /> : <LoginPage />}
          />

          {/* Root redirect based on role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* HR routes */}
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr', 'admin']}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />

          {/* Mentor routes */}
          <Route
            path="/mentor"
            element={
              <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                <MentorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Intern routes */}
          <Route
            path="/intern"
            element={
              <ProtectedRoute allowedRoles={['intern']}>
                <InternDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized */}
          <Route path="/unauthorized" element={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-2xl font-bold text-red-600">Không có quyền truy cập</h1><p className="mt-2">Bạn không có quyền truy cập trang này.</p></div></div>} />

          {/* 404 */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
