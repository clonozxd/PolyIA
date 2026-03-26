/**
 * ProfileModal.jsx
 *
 * Modal for editing user profile: name, profile picture, and password.
 */
import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth()

  // ── Profile tab ──
  const [nombre, setNombre] = useState(user?.nombre || '')
  const [preview, setPreview] = useState(user?.foto_perfil || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const fileRef = useRef(null)

  // ── Password tab ──
  const [passActual, setPassActual] = useState('')
  const [passNueva, setPassNueva] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState('')
  const [passError, setPassError] = useState(false)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg('La imagen no debe superar 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileMsg('')
    try {
      const { data } = await api.put('/api/auth/profile', {
        nombre: nombre.trim(),
        foto_perfil: preview || null,
      })
      updateUser({ nombre: data.nombre, foto_perfil: data.foto_perfil })
      setProfileMsg('✅ Perfil actualizado.')
    } catch (err) {
      setProfileMsg('❌ ' + (err?.response?.data?.detail || 'Error al guardar.'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    setPassError(false)
    setPassMsg('')
    if (passNueva !== passConfirm) {
      setPassMsg('Las contraseñas nuevas no coinciden.')
      setPassError(true)
      return
    }
    if (passNueva.length < 6) {
      setPassMsg('La nueva contraseña debe tener al menos 6 caracteres.')
      setPassError(true)
      return
    }
    setSavingPass(true)
    try {
      const { data } = await api.put('/api/auth/password', {
        password_actual: passActual,
        password_nueva: passNueva,
        password_confirmacion: passConfirm,
      })
      setPassMsg('✅ ' + data.message)
      setPassError(false)
      setPassActual('')
      setPassNueva('')
      setPassConfirm('')
    } catch (err) {
      setPassMsg(err?.response?.data?.detail || 'Error al cambiar la contraseña.')
      setPassError(true)
    } finally {
      setSavingPass(false)
    }
  }

  const initials = (user?.nombre || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* ── Profile Section ── */}
          <section className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="relative group"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Foto de perfil"
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-200 dark:ring-primary-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center ring-4 ring-primary-200 dark:ring-primary-800">
                    <span className="text-3xl font-bold text-white">{initials}</span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-sm font-medium">📷 Cambiar</span>
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-gray-400">Haz clic en la foto para cambiarla (máx. 2 MB)</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
              <input
                type="text"
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre"
                maxLength={100}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="input opacity-60 cursor-not-allowed"
                value={user?.email || ''}
                disabled
              />
            </div>

            {profileMsg && (
              <p className={`text-sm ${profileMsg.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profileMsg}
              </p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {savingProfile && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {savingProfile ? 'Guardando…' : '💾 Guardar cambios'}
            </button>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* ── Password Section ── */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Cambiar Contraseña</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña actual</label>
              <input
                type="password"
                className="input"
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva contraseña</label>
              <input
                type="password"
                className="input"
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar nueva contraseña</label>
              <input
                type="password"
                className="input"
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
                placeholder="Repite la nueva contraseña"
              />
            </div>

            {passMsg && (
              <p className={`text-sm ${passError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {passMsg}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={savingPass || !passActual || !passNueva || !passConfirm}
              className="w-full py-2.5 rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingPass && <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
              {savingPass ? 'Cambiando…' : '🔑 Cambiar contraseña'}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
