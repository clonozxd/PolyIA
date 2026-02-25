/**
 * App.jsx – Root component.
 *
 * Sets up React Router with protected routes:
 *   /          → redirect to /login or /dashboard based on auth
 *   /login     → LoginForm (public)
 *   /dashboard → Dashboard (protected)
 *   /chat      → ChatTutor (protected)
 *
 * Protected routes redirect unauthenticated users to /login.
 */
import PropTypes from 'prop-types'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginForm from './components/LoginForm'
import Dashboard from './components/Dashboard'
import ChatTutor from './components/ChatTutor'

/**
 * ProtectedRoute – wrapper that enforces authentication.
 * Redirects to /login if the user is not authenticated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
}

/**
 * AppRoutes – declares all application routes.
 * Placed inside AuthProvider so every route can access auth context.
 */
function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* Public */}
      <Route path="/login" element={<LoginForm />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatTutor />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
