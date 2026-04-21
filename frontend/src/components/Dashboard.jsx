/**
 * Dashboard.jsx
 *
 * Main screen after login. Features:
 * - Language selection (Español, Inglés, Japonés, Alemán)
 * - Level progression system (CEFR / JLPT) with unlock requirements
 * - Topic categories for lesson generation
 * - Progress tracking per language
 * - Navigation to active lesson or chat tutor
 */
import PropTypes from 'prop-types'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import ProfileModal from './ProfileModal'

/* ── Language / Level / Topic constants ────────────────────────────── */

const LANGUAGES = [
  { value: 'espanol', label: 'Español', flag: '🇪🇸' },
  { value: 'ingles',  label: 'Inglés',  flag: '🇬🇧' },
  { value: 'japones', label: 'Japonés', flag: '🇯🇵' },
  { value: 'aleman',  label: 'Alemán',  flag: '🇩🇪' },
]

const LEVELS_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const LEVELS_JLPT = ['N5', 'N4', 'N3', 'N2', 'N1']

const TOPICS = [
  { value: 'vocabulario_tematico',  label: 'Vocabulario Temático',  emoji: '📖', desc: 'Palabras y situaciones cotidianas' },
  { value: 'gramatica_practica',    label: 'Gramática Práctica',    emoji: '✏️', desc: 'Estructuras y tiempos verbales' },
  { value: 'comprension_auditiva',  label: 'Comprensión Auditiva',  emoji: '🎧', desc: 'Escuchar y entender diálogos' },
  { value: 'expresion_oral',        label: 'Expresión Oral',        emoji: '🗣️', desc: 'Pronunciación y conversación' },
  { value: 'lectura_escritura',     label: 'Lectura y Escritura',   emoji: '📝', desc: 'Textos, traducción y redacción' },
  { value: 'cultura_modismos',      label: 'Cultura y Modismos',    emoji: '🌍', desc: 'Frases hechas y expresiones' },
]

const LESSONS_TO_UNLOCK = 10

function getLevels(idioma) {
  return idioma === 'japones' ? LEVELS_JLPT : LEVELS_CEFR
}

/* ── Dashboard Component ──────────────────────────────────────────── */

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  // Selected language & topic
  const [idioma, setIdioma] = useState('ingles')
  const [nivel, setNivel] = useState('A1')
  const [topic, setTopic] = useState('vocabulario_tematico')

  // Progress data
  const [progreso, setProgreso] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(true)

  // Lesson generation
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Lessons list
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)

  // Profile modal
  const [showProfile, setShowProfile] = useState(false)

  const displayName = user?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const initials = displayName.charAt(0).toUpperCase()

  /** Fetch progress for the selected language */
  const fetchProgress = useCallback(async (lang) => {
    setLoadingProgress(true)
    try {
      const { data } = await api.get(`/api/progreso/${lang}`)
      setProgreso(data)
      setNivel(data.nivel_actual)
    } catch {
      setProgreso(null)
    } finally {
      setLoadingProgress(false)
    }
  }, [])

  /** Fetch existing lessons */
  const fetchLessons = useCallback(async () => {
    try {
      const { data } = await api.get('/api/leccion/lista')
      setLessons(data)
    } catch {
      // ignore
    } finally {
      setLoadingLessons(false)
    }
  }, [])

  useEffect(() => { fetchProgress(idioma) }, [idioma, fetchProgress])
  useEffect(() => { fetchLessons() }, [fetchLessons])

  // When language changes, reset level to the current unlocked
  useEffect(() => {
    if (progreso) setNivel(progreso.nivel_actual)
  }, [progreso])

  /** Generate a new lesson */
  async function handleGenerate() {
    setGenerating(true)
    setGenError('')
    try {
      const { data } = await api.post('/api/leccion/generar', {
        idioma,
        tema_categoria: topic,
        nivel,
      })
      // Navigate to the exercise view
      navigate(`/leccion/${data.id}`, { state: { lesson: data } })
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo generar la lección.'
      setGenError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setGenerating(false)
    }
  }

  const levels = getLevels(idioma)
  const unlocked = progreso?.niveles_desbloqueados || [levels[0]]
  const completedTopics = new Set(progreso?.temas_completados || [])

  // Filter lessons for the selected language
  const filteredLessons = lessons.filter((l) => l.idioma === idioma)

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      {/* ── Top Navigation ── */}
      <header className="bg-card-light dark:bg-card-dark shadow-sm dark:shadow-black/20 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="PolyIA" className="w-9 h-9 rounded-full object-cover" />
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">PolyIA</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Editar perfil"
            >
              {user?.foto_perfil ? (
                <img src={user.foto_perfil} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">{displayName}</span>
            </button>
            <button onClick={toggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Cambiar tema">
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={() => { logout(); navigate('/login', { replace: true }) }} className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ── Welcome ── */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            ¡Bienvenido de vuelta, {displayName}! 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Selecciona un idioma y genera tu próxima lección interactiva.</p>
        </section>

        {/* ── Language selector ── */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Idioma</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setIdioma(lang.value)}
                className={`card flex items-center gap-3 transition-all hover:shadow-lg ${
                  idioma === lang.value ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30' : ''
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-100">{lang.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Progress + Level ── */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
            Nivel y Progreso
          </h3>
          {loadingProgress ? (
            <p className="text-gray-400 text-sm">Cargando…</p>
          ) : (
            <div className="card space-y-4">
              {/* Level pills */}
              <div className="flex flex-wrap gap-2">
                {levels.map((lvl) => {
                  const isUnlocked = unlocked.includes(lvl)
                  const isCurrent = nivel === lvl
                  return (
                    <button
                      key={lvl}
                      onClick={() => isUnlocked && setNivel(lvl)}
                      disabled={!isUnlocked}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        isCurrent
                          ? 'bg-primary-600 text-white shadow-md'
                          : isUnlocked
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-800/40'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {isUnlocked ? '' : '🔒 '}{lvl}
                    </button>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <span>Lecciones completadas en {nivel}</span>
                  <span>{progreso?.completadas || 0} / {LESSONS_TO_UNLOCK}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((progreso?.completadas || 0) / LESSONS_TO_UNLOCK) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Completa {LESSONS_TO_UNLOCK} lecciones para desbloquear el siguiente nivel
                </p>
              </div>

              {/* Topic completion badges */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Temas completados:</p>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => (
                    <span
                      key={t.value}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        completedTopics.has(t.value)
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {completedTopics.has(t.value) ? '✅' : '⬜'} {t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Topic selector + Generate ── */}
          <section className="card">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Generar Lección
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Elige un tema. El tipo de ejercicio se asignará aleatoriamente.
            </p>
            <div className="space-y-3">
              {TOPICS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTopic(t.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                    topic === t.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{t.label}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.desc}</p>
                  </div>
                  {completedTopics.has(t.value) && (
                    <span className="ml-auto text-green-500">✅</span>
                  )}
                </button>
              ))}

              {genError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">
                  {genError}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <span className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-800/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-full font-medium">
                  ✨ Google Gemini
                </span>
                <span>Motor de generación</span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {generating && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {generating ? 'Generando ejercicio…' : '⚡ Generar Lección'}
              </button>
            </div>
          </section>

          {/* ── Quick actions ── */}
          <section className="space-y-4">
            {/* Chat CTA */}
            <div className="card bg-gradient-to-br from-primary-600 to-blue-700 text-white">
              <h3 className="text-lg font-semibold mb-2">Chat con tu Tutor 🤖</h3>
              <p className="text-blue-100 text-sm mb-4">
                Practica conversación y recibe correcciones gramaticales en tiempo real.
                También puedes enviar resultados de lecciones para que el tutor te explique tus errores.
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="bg-white text-primary-700 hover:bg-blue-50 font-semibold py-2 px-5 rounded-xl transition-colors"
              >
                Abrir Chat →
              </button>
            </div>

            {/* Stats CTA */}
            <div className="card bg-gradient-to-br from-accent-600 to-accent-700 text-white">
              <h3 className="text-lg font-semibold mb-2">Mis Estadísticas 📊</h3>
              <p className="text-accent-100 text-sm mb-4">
                Revisa tu actividad semanal, puntajes promedio y progreso por idioma.
              </p>
              <button
                onClick={() => navigate('/estadisticas')}
                className="bg-white text-accent-700 hover:bg-accent-50 font-semibold py-2 px-5 rounded-xl transition-colors"
              >
                Ver Estadísticas →
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard emoji="📚" label="Lecciones totales" value={loadingLessons ? '…' : lessons.length} />
              <StatCard emoji="✅" label="Completadas" value={loadingLessons ? '…' : lessons.filter((l) => l.completada).length} />
              <StatCard emoji="🎯" label="Nivel actual" value={nivel} />
              <StatCard emoji="✨" label="Motor IA" value="Gemini" />
            </div>
          </section>
        </div>

        {/* ── Recent Lessons ── */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Mis Lecciones — {LANGUAGES.find((l) => l.value === idioma)?.label}
          </h3>
          {loadingLessons ? (
            <p className="text-gray-400 text-sm">Cargando…</p>
          ) : filteredLessons.length === 0 ? (
            <p className="text-gray-400 text-sm">
              Aún no tienes lecciones en este idioma. ¡Genera tu primera lección!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => navigate(`/leccion/${l.id}`, { state: { lesson: l } })}
                  className="card text-left transition-all hover:shadow-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      l.completada
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {l.completada ? `✅ ${l.puntuacion}%` : '⏳ Pendiente'}
                    </span>
                    <span className="text-xs text-gray-400">{l.nivel}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{l.tema}</h4>
                  <p className="text-gray-400 text-xs mt-1 capitalize">{l.tipo_ejercicio.replace('_', ' ')}</p>
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
