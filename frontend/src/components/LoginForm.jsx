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
import { useTheme } from '../context/ThemeContext'

export default function LoginForm() {
  const { login, register } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password, nombre)
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-100 dark:from-surface-dark dark:to-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-md hover:scale-110 transition-transform"
        aria-label="Cambiar tema"
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="card w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="PolyIA Logo"
            className="w-20 h-20 mx-auto rounded-full object-cover shadow-lg mb-3"
          />
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">PolyIA</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Tu tutor inteligente de idiomas</p>
        </div>

        {/* Mode switcher */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 text-sm font-medium transition-colors duration-200 ${
                mode === m
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
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

          {/* Username – only shown during registration */}
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="nombre">
                Nombre de usuario
              </label>
              <input
                id="nombre"
                type="text"
                className="input"
                placeholder="Tu nombre de usuario"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
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
