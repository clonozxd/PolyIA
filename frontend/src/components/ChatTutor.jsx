/**
 * ChatTutor.jsx
 *
 * Real-time chat interface with the local SLM tutor.
 * - Sends messages to POST /api/chat/local
 * - Displays the tutor's reply and grammar corrections inline
 * - Auto-scrolls to the latest message
 */
import PropTypes from 'prop-types'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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

      <div className={`max-w-[80%] space-y-1`}>
        {/* Main text */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-white shadow text-gray-800 rounded-tl-sm'
          }`}
        >
          {msg.text}
        </div>

        {/* Grammar correction bubble (tutor only) */}
        {msg.correction && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
            <span className="font-semibold">✏️ Corrección: </span>
            {msg.correction}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-sm ml-2 flex-shrink-0 mt-1">
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
  const navigate = useNavigate()

  const [idioma, setIdioma] = useState('inglés')
  const [nivel, setNivel] = useState(user?.nivel_idioma || 'principiante')
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

    // Optimistically add user message
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
      // Remove the optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      setInput(text) // restore input
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-primary-600 transition-colors"
              aria-label="Volver al Dashboard"
            >
              ← 
            </button>
            <div>
              <h1 className="text-lg font-bold text-primary-700">Chat Tutor 🤖</h1>
              <p className="text-xs text-gray-400">Modelo local · corrección en tiempo real</p>
            </div>
          </div>

          {/* Language & Level pickers */}
          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={idioma}
              onChange={(e) => setIdioma(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
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
            <div className="bg-white shadow rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ── Input area ── */}
      <footer className="bg-white border-t border-gray-200 sticky bottom-0">
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
              // Auto-grow textarea up to 5 rows
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
        <p className="text-center text-xs text-gray-300 pb-2">
          Shift+Enter para nueva línea · Enter para enviar
        </p>
      </footer>
    </div>
  )
}
