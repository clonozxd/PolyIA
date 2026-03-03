/**
 * ChatTutor.jsx
 *
 * Real-time chat interface with the local SLM tutor.
 * - Sends messages to POST /api/chat/local
 * - Displays the tutor's reply and grammar corrections inline
 * - Auto-scrolls to the latest message
 * - Full dark mode support
 */
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
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

/** Individual chat bubble */
function Bubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
          🤖
        </div>
      )}

      <div className="max-w-[80%] space-y-1">
        {/* Main text */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-card-light dark:bg-card-dark shadow dark:shadow-black/20 text-gray-800 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          {msg.text}
        </div>

        {/* Grammar correction bubble (tutor only) */}
        {msg.correction && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">✏️ Corrección: </span>
            {msg.correction}
          </div>
        )}
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
    correction: PropTypes.string,
  }).isRequired,
}

export default function ChatTutor() {
  const { user } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [idioma, setIdioma] = useState('inglés')
  const [nivel, setNivel] = useState('principiante')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'tutor',
      text: `¡Hola! Soy tu tutor de ${idioma}. Puedes escribirme en ${idioma} o en español y te ayudaré a practicar y corregir tus errores. ¿Empezamos?`,
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update welcome message when language changes
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'tutor',
      text: `¡Hola! Soy tu tutor de ${idioma}. Puedes escribirme en ${idioma} o en español y te ayudaré a practicar y corregir tus errores. ¿Empezamos?`,
    }])
  }, [idioma])

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setError('')

    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])

    setSending(true)
    try {
      const { data } = await api.post('/api/chat/local', {
        mensaje: text,
        idioma_objetivo: idioma,
        nivel_idioma: nivel,
      })

      const tutorMsg = {
        id: data.mensaje_id ?? Date.now() + 1,
        role: 'tutor',
        text: data.respuesta,
        correction: data.correccion || null,
      }
      setMessages((prev) => [...prev, tutorMsg])
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al contactar el tutor. Verifica que el servidor esté activo.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
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
              <p className="text-xs text-gray-400 dark:text-gray-500">Modelo local · corrección en tiempo real</p>
            </div>
          </div>

          {/* Language, Level pickers & dark mode */}
          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
            <select
              className="text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={toggle}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Cambiar tema"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Messages area ── */}
      <main className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6 chat-scroll">
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}

        {/* Sending indicator */}
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

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3 mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Input area ── */}
      <footer className="bg-card-light dark:bg-card-dark border-t border-gray-200 dark:border-gray-700 sticky bottom-0 transition-colors duration-300">
        <form
          onSubmit={sendMessage}
          className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-3"
        >
          <textarea
            ref={inputRef}
            rows={1}
            className="input flex-1 resize-none overflow-hidden leading-relaxed"
            placeholder={`Escribe en ${idioma} o en español…`}
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
