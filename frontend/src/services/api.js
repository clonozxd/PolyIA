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

export default api
