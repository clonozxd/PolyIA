/**
 * api.js – Axios instance pre-configured for the PolyIA backend.
 *
 * The Vite proxy (vite.config.js) forwards /api/* to http://localhost:8001
 * during development, so no absolute URL is needed here.
 */
import axios from 'axios'

const AUTH_EXCLUDE_PATHS = ['/api/auth/login', '/api/auth/register']

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token from localStorage on every request.
// This is more reliable than setting api.defaults.headers inside a useEffect,
// which can miss requests due to React lifecycle timing on page reloads.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('polyia_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the backend rejects the token, clear stale auth state so the app returns
// to login instead of repeatedly firing protected requests.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const requestUrl = error?.config?.url || ''
    const isAuthRoute = AUTH_EXCLUDE_PATHS.some((path) => requestUrl.includes(path))

    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem('polyia_token')
      localStorage.removeItem('polyia_user')

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('polyia:unauthorized'))
      }
    }

    return Promise.reject(error)
  }
)

export default api
