/**
 * StatsPage.jsx
 *
 * User statistics page with:
 * - Weekly activity bar chart (last 7 days)
 * - Global summary cards (total lessons, avg score, best score, etc.)
 * - Per-language breakdown
 * - Per-topic and per-exercise-type distribution
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const LANG_FLAGS = {
  espanol: '🇪🇸',
  ingles: '🇬🇧',
  japones: '🇯🇵',
  aleman: '🇩🇪',
}

export default function StatsPage() {
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const displayName = user?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const initials = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    api.get('/api/estadisticas')
      .then(({ data }) => setStats(data))
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Cargando estadísticas…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">← Volver al Dashboard</button>
      </div>
    )
  }

  const { weekly_activity, summary } = stats
  const maxCount = Math.max(...weekly_activity.map(d => d.count), 1)

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      {/* Header */}
      <header className="bg-card-light dark:bg-card-dark shadow-sm dark:shadow-black/20 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors" aria-label="Volver">
              ←
            </button>
            <img src="/logo.jpg" alt="PolyIA" className="w-9 h-9 rounded-full object-cover" />
            <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">Mis Estadísticas</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {user?.foto_perfil ? (
                <img src={user.foto_perfil} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
              )}
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">{displayName}</span>
            </div>
            <button onClick={toggle} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Cambiar tema">
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* ── Summary Cards ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Resumen General</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SummaryCard emoji="📚" label="Lecciones totales" value={summary.total_lessons} />
            <SummaryCard emoji="✅" label="Completadas" value={summary.total_completed} color="green" />
            <SummaryCard emoji="⏳" label="Pendientes" value={summary.pending} color="amber" />
            <SummaryCard emoji="🎯" label="Promedio" value={`${summary.avg_score}%`} color="primary" />
            <SummaryCard emoji="🏆" label="Mejor puntaje" value={`${summary.best_score}%`} color="yellow" />
          </div>
        </section>

        {/* ── Favorites ── */}
        {(summary.favorite_topic || summary.favorite_type) && (
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.favorite_topic && (
              <div className="card flex items-center gap-4">
                <span className="text-4xl">⭐</span>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Tema favorito</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{summary.favorite_topic}</p>
                </div>
              </div>
            )}
            {summary.favorite_type && (
              <div className="card flex items-center gap-4">
                <span className="text-4xl">🎮</span>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Ejercicio favorito</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{summary.favorite_type}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Weekly Activity Chart ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Actividad Semanal</h2>
          <div className="card">
            {weekly_activity.every(d => d.count === 0) ? (
              <div className="text-center py-8">
                <span className="text-4xl">📊</span>
                <p className="text-gray-400 mt-2">No hay actividad esta semana. ¡Genera tu primera lección!</p>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2">
                {weekly_activity.map((day, i) => {
                  const barHeight = day.count > 0 ? Math.max(12, (day.count / maxCount) * 100) : 0
                  const isToday = i === weekly_activity.length - 1
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      {/* Count label */}
                      <span className={`text-xs font-bold ${day.count > 0 ? 'text-primary-600 dark:text-primary-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {day.count > 0 ? day.count : ''}
                      </span>
                      {/* Score label */}
                      {day.count > 0 && (
                        <span className="text-[10px] text-gray-400">{day.avg_score}%</span>
                      )}
                      {/* Bar */}
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isToday
                              ? 'bg-gradient-to-t from-primary-600 to-primary-400'
                              : day.count > 0
                                ? 'bg-gradient-to-t from-primary-500/70 to-primary-400/50'
                                : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          style={{ height: day.count > 0 ? `${barHeight}%` : '4px' }}
                        />
                      </div>
                      {/* Day label */}
                      <span className={`text-xs font-medium mt-1 ${
                        isToday ? 'text-primary-600 dark:text-primary-400 font-bold' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {day.day_name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Per Language ── */}
          {summary.per_language.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Por Idioma</h2>
              <div className="space-y-3">
                {summary.per_language.map((lang) => {
                  const pct = lang.total > 0 ? Math.round((lang.completed / lang.total) * 100) : 0
                  return (
                    <div key={lang.idioma} className="card flex items-center gap-4">
                      <span className="text-3xl">{LANG_FLAGS[lang.idioma] || '🌐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{lang.label}</p>
                          <span className="text-xs text-gray-400">{lang.completed}/{lang.total} completadas</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className="bg-primary-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-gray-400">{pct}% completado</span>
                          {lang.completed > 0 && (
                            <span className="text-xs text-primary-500">Promedio: {lang.avg_score}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Per Topic + Per Type ── */}
          <div className="space-y-8">
            {summary.per_topic.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Por Tema</h2>
                <div className="card space-y-3">
                  {summary.per_topic.map((t) => {
                    const maxTopic = summary.per_topic[0]?.count || 1
                    const pct = Math.round((t.count / maxTopic) * 100)
                    return (
                      <div key={t.topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{t.label}</span>
                          <span className="text-gray-400 text-xs ml-2 shrink-0">{t.count} lecciones</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-primary-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {summary.per_type.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Por Tipo de Ejercicio</h2>
                <div className="card space-y-3">
                  {summary.per_type.map((t) => {
                    const maxType = summary.per_type[0]?.count || 1
                    const pct = Math.round((t.count / maxType) * 100)
                    return (
                      <div key={t.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{t.label}</span>
                          <span className="text-gray-400 text-xs ml-2 shrink-0">{t.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {summary.total_lessons === 0 && (
          <div className="card text-center py-12 space-y-4">
            <span className="text-6xl">📊</span>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Aún no tienes estadísticas</h2>
            <p className="text-gray-400">Completa algunas lecciones para ver tu progreso aquí.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary">
              ← Ir al Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

/** Summary card component */
function SummaryCard({ emoji, label, value, color = 'gray' }) {
  const colorMap = {
    gray: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800',
    green: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/20',
    amber: 'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/20',
    primary: 'from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/20',
    yellow: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/20',
  }

  return (
    <div className={`card bg-gradient-to-br ${colorMap[color]} flex flex-col items-center text-center py-5 gap-1`}>
      <span className="text-3xl">{emoji}</span>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  )
}
