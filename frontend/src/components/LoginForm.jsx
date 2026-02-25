/**
 * LoginForm.jsx
 *
 * Dual-mode form that handles both Login and Registration.
 * - Calls AuthContext.login / AuthContext.register
 * - Redirects to /dashboard on success
 * - Shows inline error messages on failure
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LEVELS = [
  { value: 'principiante', label: 'Principiante (A1–A2)' },
  { value: 'intermedio',   label: 'Intermedio (B1–B2)' },
  { value: 'avanzado',     label: 'Avanzado (C1–C2)' },
]

export default function LoginForm() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')          // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nivel, setNivel] = useState('principiante')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, nivel)
      } else {
        await login(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        'Ocurrió un error. Verifica tus datos e intenta de nuevo.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🌐 PolyIA</h1>
          <p className="text-gray-500 mt-1 text-sm">Tu tutor inteligente de idiomas</p>
        </div>

        {/* Mode switcher */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors duration-200 ${
                mode === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {/* Level selector – only shown during registration */}
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nivel">
                Nivel de idioma
              </label>
              <select
                id="nivel"
                className="input"
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
