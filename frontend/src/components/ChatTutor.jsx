/**
 * ChatTutor.jsx
 *
 * Chat interface with the local SLM tutor.
 * Features:
 *   - Persistent conversations (max 5, stored on backend)
 *   - Sidebar with conversation list + create/delete
 *   - In-chat lesson picker (📎 button) to attach lessons for analysis
 *   - Conversation history sent to LLM as context
 */
import PropTypes from 'prop-types'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

/* ── Chat Bubble ──────────────────────────────────────────────────── */

function Bubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
          🤖
        </div>
      )}

      <div className="max-w-[80%] space-y-1">
        {/* Attached lesson card (user bubble) */}
        {msg.lessonAttachment && (
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-3 py-2 text-xs mb-1">
            <div className="flex items-center gap-2 text-primary-700 dark:text-primary-300 font-semibold mb-1">
              📎 Lección adjunta
            </div>
            <p className="text-primary-600 dark:text-primary-400">
              {msg.lessonAttachment.tema} — {msg.lessonAttachment.nivel} · {msg.lessonAttachment.tipo_ejercicio?.replace('_', ' ')} · {msg.lessonAttachment.puntuacion}%
            </p>
          </div>
        )}

        {/* Main text */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-card-light dark:bg-card-dark shadow dark:shadow-black/20 text-gray-800 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          {msg.text}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1">
          👤
        </div>
      )}
    </div>
  )
}

Bubble.propTypes = {
  msg: PropTypes.shape({
    role: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    lessonAttachment: PropTypes.object,
  }).isRequired,
}

/* ── Lesson Picker Dropdown ───────────────────────────────────────── */

function LessonPicker({ onSelect, onClose }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/leccion/lista').then(({ data }) => {
      setLessons(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 max-h-64 overflow-y-auto bg-card-light dark:bg-card-dark border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">📎 Adjuntar lección</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">✕</button>
      </div>
      {loading ? (
        <p className="text-center text-gray-400 text-xs py-4">Cargando…</p>
      ) : lessons.length === 0 ? (
        <p className="text-center text-gray-400 text-xs py-4">No tienes lecciones aún.</p>
      ) : (
        <div className="p-1">
          {lessons.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{l.tema}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 ${
                  l.completada
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {l.completada ? `${l.puntuacion}%` : '⏳'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {l.nivel} · {l.tipo_ejercicio?.replace('_', ' ')} · {l.idioma}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

LessonPicker.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
}

/* ── ChatTutor Component ──────────────────────────────────────────── */

export default function ChatTutor() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Conversations
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Messages
  const [messages, setMessages] = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  // Lesson attachment
  const [attachedLesson, setAttachedLesson] = useState(location.state?.lesson || null)
  const [showLessonPicker, setShowLessonPicker] = useState(false)

  // Input
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const autoSentRef = useRef(false)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversations on mount
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/api/chat/conversaciones')
      setConversations(data)
      return data
    } catch {
      return []
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations().then((convos) => {
      // Auto-select first conversation if exists and no lesson to auto-send
      if (convos.length > 0 && !location.state?.lesson) {
        loadConversation(convos[0].id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load messages for a conversation
  async function loadConversation(convId) {
    setActiveConvId(convId)
    setLoadingMsgs(true)
    setMessages([])
    try {
      const { data } = await api.get(`/api/chat/conversacion/${convId}`)
      const msgs = []
      for (const m of data) {
        msgs.push({ id: `u-${m.id}`, role: 'user', text: m.texto_usuario })
        if (m.respuesta_ia) {
          msgs.push({ id: `a-${m.id}`, role: 'tutor', text: m.respuesta_ia })
        }
      }
      setMessages(msgs)
    } catch {
      setMessages([])
    } finally {
      setLoadingMsgs(false)
      setSidebarOpen(false)
    }
  }

  // Create new conversation
  async function handleNewConversation() {
    try {
      const { data } = await api.post('/api/chat/conversacion')
      setConversations((prev) => [data, ...prev].slice(0, 5))
      setActiveConvId(data.id)
      setMessages([])
      setSidebarOpen(false)
    } catch {
      // ignore
    }
  }

  // Delete conversation
  async function handleDeleteConversation(convId, e) {
    e.stopPropagation()
    try {
      await api.delete(`/api/chat/conversacion/${convId}`)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConvId === convId) {
        setActiveConvId(null)
        setMessages([])
      }
    } catch {
      // ignore
    }
  }

  // When arriving with a lesson attachment, auto-send it
  useEffect(() => {
    if (autoSentRef.current) return
    if (location.state?.lesson && location.state?.autoSend) {
      autoSentRef.current = true
      const lesson = location.state.lesson
      setAttachedLesson(lesson)
      const text = `Acabo de completar esta lección con ${lesson.puntuacion ?? 0}%. ¿Puedes analizar mis resultados y explicarme en qué puedo mejorar?`
      sendWithLesson(text, lesson)
      window.history.replaceState({}, '')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendWithLesson(text, lesson) {
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text,
      lessonAttachment: lesson,
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    setError('')

    try {
      const { data } = await api.post('/api/chat/local', {
        mensaje: text,
        conversacion_id: activeConvId,
        leccion_adjunta: {
          tema: lesson.tema,
          idioma: lesson.idioma,
          nivel: lesson.nivel,
          tipo_ejercicio: lesson.tipo_ejercicio,
          tema_categoria: lesson.tema_categoria,
          puntuacion: lesson.puntuacion,
          contenido: lesson.contenido,
          resultado_json: lesson.resultado_json,
        },
      })

      if (!activeConvId && data.conversacion_id) {
        setActiveConvId(data.conversacion_id)
        fetchConversations()
      }

      setMessages((prev) => [...prev, {
        id: data.mensaje_id ?? Date.now() + 1,
        role: 'tutor',
        text: data.respuesta,
      }])
    } catch (err) {
      const status = err?.response?.status || ''
      const detail = err?.response?.data?.detail
      const raw = detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : (err?.message || 'Error desconocido')
      const msg = status ? `[${status}] ${raw}` : raw
      setError(msg)
    } finally {
      setSending(false)
      setAttachedLesson(null)
      inputRef.current?.focus()
    }
  }

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    if (attachedLesson) {
      await sendWithLesson(text, attachedLesson)
      return
    }

    setError('')
    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])

    setSending(true)
    try {
      const { data } = await api.post('/api/chat/local', {
        mensaje: text,
        conversacion_id: activeConvId,
      })

      if (!activeConvId && data.conversacion_id) {
        setActiveConvId(data.conversacion_id)
        fetchConversations()
      }

      setMessages((prev) => [...prev, {
        id: data.mensaje_id ?? Date.now() + 1,
        role: 'tutor',
        text: data.respuesta,
      }])
    } catch (err) {
      const status = err?.response?.status || ''
      const detail = err?.response?.data?.detail
      const raw = detail ? (typeof detail === 'string' ? detail : JSON.stringify(detail)) : (err?.message || 'Error al contactar el tutor. Verifica que Ollama esté activo.')
      const msg = status ? `[${status}] ${raw}` : raw
      setError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleLessonSelect(lesson) {
    setAttachedLesson(lesson)
    setShowLessonPicker(false)
  }

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex flex-col transition-colors duration-300">
      {/* ── Header ── */}
      <header className="bg-card-light dark:bg-card-dark shadow-sm dark:shadow-black/20 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              aria-label="Volver al Dashboard"
            >
              ←
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
              aria-label="Conversaciones"
              title="Conversaciones"
            >
              💬
            </button>
            <div>
              <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">Chat Tutor</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {activeConvId
                  ? conversations.find((c) => c.id === activeConvId)?.titulo || 'Conversación'
                  : 'Nueva conversación'}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 flex" onClick={() => setSidebarOpen(false)}>
          <div
            className="w-72 bg-card-light dark:bg-card-dark shadow-2xl h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Conversaciones</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            <button
              onClick={handleNewConversation}
              className="mx-3 mt-3 mb-2 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center justify-center gap-1"
            >
              ＋ Nueva conversación
            </button>

            <div className="flex-1 overflow-y-auto px-2 pb-2">
              {loadingConvs ? (
                <p className="text-center text-gray-400 text-xs py-4">Cargando…</p>
              ) : conversations.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-4">Sin conversaciones aún</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadConversation(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors group flex items-center gap-2 ${
                      activeConvId === c.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-sm flex-1 truncate">{c.titulo}</span>
                    <span className="text-[10px] text-gray-400">{c.message_count}</span>
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="flex-1 bg-black/30" />
        </div>
      )}

      {/* ── Messages area ── */}
      <main className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6 chat-scroll">
        {messages.length === 0 && !loadingMsgs && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🤖</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              ¡Hola! Soy tu tutor de idiomas. Escribe un mensaje o adjunta una lección con el botón 📎 para que la analice.
            </p>
          </div>
        )}

        {loadingMsgs && (
          <p className="text-center text-gray-400 text-sm py-8">Cargando mensajes…</p>
        )}

        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}

        {sending && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm mr-2">
              🤖
            </div>
            <div className="bg-card-light dark:bg-card-dark shadow dark:shadow-black/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3 mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Input area ── */}
      <footer className="bg-card-light dark:bg-card-dark border-t border-gray-200 dark:border-gray-700 sticky bottom-0 transition-colors duration-300">
        {/* Attached lesson preview */}
        {attachedLesson && (
          <div className="max-w-3xl mx-auto px-4 pt-3">
            <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-3 py-2 text-sm">
              <span className="text-primary-600 dark:text-primary-400">📎</span>
              <span className="flex-1 text-primary-700 dark:text-primary-300 truncate text-xs">
                {attachedLesson.tema} — {attachedLesson.puntuacion ?? 0}%
              </span>
              <button
                onClick={() => setAttachedLesson(null)}
                className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                aria-label="Quitar adjunto"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-2"
        >
          {/* Lesson picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLessonPicker(!showLessonPicker)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              title="Adjuntar lección"
              aria-label="Adjuntar lección"
            >
              📎
            </button>
            {showLessonPicker && (
              <LessonPicker
                onSelect={handleLessonSelect}
                onClose={() => setShowLessonPicker(false)}
              />
            )}
          </div>

          <textarea
            ref={inputRef}
            rows={1}
            className="input flex-1 resize-none overflow-hidden leading-relaxed"
            placeholder={attachedLesson ? 'Escribe tu pregunta sobre la lección adjunta…' : 'Escribe un mensaje…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(e)
              }
            }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary flex items-center gap-1 self-end"
            aria-label="Enviar mensaje"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Enviar ↗</span>
            )}
          </button>
        </form>
        <p className="text-center text-xs text-gray-300 dark:text-gray-600 pb-2">
          Shift+Enter para nueva línea · Enter para enviar · 📎 para adjuntar lecciones
        </p>
      </footer>
    </div>
  )
}
