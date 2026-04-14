/**
 * api.js – Axios instance pre-configured for the PolyIA backend.
 *
 * The Vite proxy (vite.config.js) forwards /api/* to http://localhost:8000
 * during development, so no absolute URL is needed here.
 */
import axios from 'axios'

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

export default api
