/**
 * Dashboard.jsx
 *
 * Main screen shown after login. Features:
 * - Welcome header with user name and logout
 * - Dark mode toggle next to the menu
 * - Progress summary (lessons generated, chat messages)
 * - "Generate New Lesson" panel (Google Gemini only)
 * - List of recent lessons
 * - Quick link to the Chat Tutor
 */
import PropTypes from 'prop-types'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

const LANGUAGES = ['inglés', 'francés', 'alemán', 'italiano', 'portugués', 'japonés', 'chino', 'árabe']

const LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio',   label: 'Intermedio' },
  { value: 'avanzado',     label: 'Avanzado' },
]

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  // Lesson generation form
  const [tema, setTema] = useState('')
  const [idioma, setIdioma] = useState('inglés')
  const [nivel, setNivel] = useState('principiante')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [genSuccess, setGenSuccess] = useState('')

  // Lessons list
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)

  /** Fetch existing lessons */
  const fetchLessons = useCallback(async () => {
    try {
      const { data } = await api.get('/api/leccion/lista')
      setLessons(data)
    } catch {
      // Silently ignore – user may not have any lessons yet
    } finally {
      setLoadingLessons(false)
    }
  }, [])

  useEffect(() => { fetchLessons() }, [fetchLessons])

  /** Generate a new lesson via Google Gemini */
  async function handleGenerate(e) {
    e.preventDefault()
    if (!tema.trim()) return
    setGenerating(true)
    setGenError('')
    setGenSuccess('')
    try {
      const { data } = await api.post('/api/leccion/generar', {
        tema: tema.trim(),
        proveedor: 'google',
        idioma_objetivo: idioma,
        nivel_idioma: nivel,
      })
      setLessons((prev) => [data, ...prev])
      setSelectedLesson(data)
      setGenSuccess(`✅ Lección "${data.tema}" generada con éxito.`)
      setTema('')
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo generar la lección. Verifica la API key de Google.'
      setGenError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setGenerating(false)
    }
  }

  const displayName = user?.nombre || user?.email?.split('@')[0] || 'Usuario'

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      {/* ── Top Navigation Bar ── */}
      <header className="bg-card-light dark:bg-card-dark shadow-sm dark:shadow-black/20 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="PolyIA" className="w-9 h-9 rounded-full object-cover" />
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">PolyIA</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">{displayName}</span>
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Cambiar tema"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }) }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ── Welcome + stats ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            ¡Bienvenido de vuelta, {displayName}! 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">¿Qué idioma practicamos hoy?</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <StatCard
              emoji="📚"
              label="Lecciones generadas"
              value={loadingLessons ? '…' : lessons.length}
            />
            <StatCard
              emoji="💬"
              label="Sesiones de chat"
              value="—"
            />
            <StatCard
              emoji="✨"
              label="Motor IA"
              value="Gemini"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Generate Lesson Panel ── */}
          <section className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Generar Nueva Lección</h3>
            <form onSubmit={handleGenerate} className="space-y-3">
              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: saludos y presentaciones, comida, negocios…"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  required
                />
              </div>

              {/* Language + Level row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idioma</label>
                  <select className="input" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel</label>
                  <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value)}>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Provider badge – Gemini only */}
              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-800/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full font-medium">
                  ✨ Google Gemini
                </span>
                <span>Motor de generación de lecciones</span>
              </div>

              {genError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
                  {genError}
                </div>
              )}
              {genSuccess && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm rounded-xl px-4 py-3">
                  {genSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={generating || !tema.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {generating && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {generating ? 'Generando…' : '⚡ Generar Lección'}
              </button>
            </form>
          </section>

          {/* ── Quick actions ── */}
          <section className="space-y-4">
            {/* Chat CTA */}
            <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
              <h3 className="text-lg font-semibold mb-2">Chat con tu Tutor 🤖</h3>
              <p className="text-primary-100 text-sm mb-4">
                Practica conversación y recibe correcciones gramaticales en tiempo real
                con el modelo de IA local.
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="bg-white text-primary-700 hover:bg-primary-50 font-semibold py-2 px-5 rounded-xl transition-colors"
              >
                Abrir Chat →
              </button>
            </div>

            {/* Selected lesson preview */}
            {selectedLesson && (
              <div className="card border-l-4 border-primary-500 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{selectedLesson.tema}</h4>
                  <span className="text-xs text-gray-400 capitalize ml-2">{selectedLesson.proveedor_ia}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {selectedLesson.contenido}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* ── Lessons List ── */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Mis Lecciones</h3>
          {loadingLessons ? (
            <p className="text-gray-400 text-sm">Cargando…</p>
          ) : lessons.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Aún no tienes lecciones. ¡Genera tu primera lección arriba!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLesson(l)}
                  className={`card text-left transition-all hover:shadow-lg ${
                    selectedLesson?.id === l.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                >
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{l.tema}</h4>
                  <p className="text-gray-400 text-xs mt-1 capitalize">{l.proveedor_ia}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 line-clamp-3">
                    {l.contenido.slice(0, 120)}…
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

/** Small statistic card */
function StatCard({ emoji, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <span className="text-3xl">{emoji}</span>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

StatCard.propTypes = {
  emoji: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}
