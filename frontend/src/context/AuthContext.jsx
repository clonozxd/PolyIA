/**
 * AuthContext.jsx
 *
 * Provides authentication state and helpers throughout the app.
 * Persists the JWT token in localStorage so sessions survive page reloads.
 */
import PropTypes from 'prop-types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('polyia_token'))
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('polyia_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  /** Persist token + user info and update axios default header */
  const _persist = useCallback((tokenValue, userData) => {
    localStorage.setItem('polyia_token', tokenValue)
    localStorage.setItem('polyia_user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenValue}`
    setToken(tokenValue)
    setUser(userData)
  }, [])

  /** Login – calls POST /api/auth/login */
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    _persist(data.access_token, {
      id: data.usuario_id,
      email,
      nombre: data.nombre,
    })
    return data
  }, [_persist])

  /** Register – calls POST /api/auth/register */
  const register = useCallback(async (email, password, nombre) => {
    const { data } = await api.post('/api/auth/register', { email, password, nombre })
    _persist(data.access_token, {
      id: data.usuario_id,
      email,
      nombre: data.nombre,
    })
    return data
  }, [_persist])

  /** Logout – clears local storage and auth headers */
  const logout = useCallback(() => {
    localStorage.removeItem('polyia_token')
    localStorage.removeItem('polyia_user')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  // Restore header on mount if token exists
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  const value = useMemo(
    () => ({ token, user, login, register, logout, isAuthenticated: !!token }),
    [token, user, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

/** Hook to consume auth context */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
