import { HashRouter, Routes, Route } from 'react-router-dom'
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

function isFullyAuthenticated(): boolean {
  if (!isAuthenticated()) return false
  const user = getCurrentUser()
  const role = user?.role?.toLowerCase()
  if (!role) return false
  return ['admin', 'hr', 'mentor', 'intern'].includes(role)
}

function App() {
  const authenticated = isFullyAuthenticated()

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/test" element={<TestPage />} />

            <Route
              path="/"
              element={authenticated ? <RoleBasedRedirect /> : <LoginPage />}
            />

            <Route
              path="/login"
              element={authenticated ? <RoleBasedRedirect /> : <LoginPage />}
            />

            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/hr/*"
              element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <HRDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/mentor/*"
              element={
                <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                  <MentorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/intern/*"
              element={
                <ProtectedRoute allowedRoles={['intern']}>
                  <InternDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/unauthorized"
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600">
                      Không có quyền truy cập
                    </h1>
                    <p className="mt-2">Bạn không có quyền truy cập trang này.</p>
                  </div>
                </div>
              }
            />

            <Route path="*" element={authenticated ? <RoleBasedRedirect /> : <LoginPage />} />
          </Routes>
          <Toaster />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
