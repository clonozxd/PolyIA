/**
 * ThemeContext.jsx
 *
 * Provides dark / light mode toggling across the app.
 * Persists the users preference in localStorage.
 * Applies the `dark` class to <html> so Tailwind `dark:` utilities work.
 */
import PropTypes from 'prop-types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('polyia_theme')
    if (stored) return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  // Sync <html> class + localStorage whenever `dark` changes
  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('polyia_theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = useCallback(() => setDark((d) => !d), [])

  const value = useMemo(() => ({ dark, toggle }), [dark, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
