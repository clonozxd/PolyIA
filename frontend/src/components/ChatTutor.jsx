/**
 * ChatTutor.jsx
 *
 * Chat interface with the local SLM tutor.
 * - The tutor is a general conversational assistant.
 * - Users can attach completed lesson data for the tutor to analyze.
 * - Corrections are only given when a lesson is attached or explicitly requested.
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

/* ── ChatTutor Component ──────────────────────────────────────────── */

export default function ChatTutor() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Lesson attachment received from LessonExercise via navigation state
  const [attachedLesson, setAttachedLesson] = useState(location.state?.lesson || null)

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'tutor',
      text: '¡Hola! Soy tu tutor de idiomas. Puedes conversar conmigo libremente o adjuntar una lección completada para que analice tus resultados y te ayude a mejorar.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Guard against React StrictMode double-firing
  const autoSentRef = useRef(false)

  // When arriving with a lesson attachment, auto-send it
  useEffect(() => {
    if (autoSentRef.current) return
    if (location.state?.lesson && location.state?.autoSend) {
      autoSentRef.current = true
      const lesson = location.state.lesson
      setAttachedLesson(lesson)
      const text = `Acabo de completar esta lección con ${lesson.puntuacion ?? 0}%. ¿Puedes analizar mis resultados y explicarme en qué puedo mejorar?`
      sendWithLesson(text, lesson)
      // Clear location state to prevent re-sending on remount
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

    // If there's a lesson attached, send it along
    if (attachedLesson) {
      await sendWithLesson(text, attachedLesson)
      return
    }

    setError('')
    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])

    setSending(true)
    try {
      const { data } = await api.post('/api/chat/local', { mensaje: text })

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

  function removeAttachment() {
    setAttachedLesson(null)
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
            <img src="/logo.jpg" alt="PolyIA" className="w-8 h-8 rounded-full object-cover" />
            <div>
              <h1 className="text-lg font-bold text-primary-600 dark:text-primary-400">Chat Tutor</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">Modelo local · adjunta lecciones para análisis</p>
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

      {/* ── Messages area ── */}
      <main className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6 chat-scroll">
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
                onClick={removeAttachment}
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
          className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-3"
        >
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
          Shift+Enter para nueva línea · Enter para enviar
        </p>
      </footer>
    </div>
  )
}
