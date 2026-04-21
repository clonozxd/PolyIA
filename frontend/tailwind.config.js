/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Study Blue (Psicología del color para aprendizaje) ──
         * El azul profundo estimula la concentración, la calma y la
         * retención de memoria — ideal para sesiones de estudio prolongadas.
         */
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a5f',
          900: '#1e3a8a',
        },
        /* ── Teal de concentración ──
         * El verde azulado reduce fatiga visual y transmite
         * equilibrio mental y claridad cognitiva.
         */
        accent: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        /* ── Ámbar motivacional ──
         * El ámbar cálido activa la atención selectiva y la
         * motivación sin generar estrés.
         */
        warm: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        /* ── Superficies optimizadas para estudio ──
         * Gris azulado que reduce distracción y mejora legibilidad.
         * El dark mode usa azul marino profundo para sesiones nocturnas.
         */
        surface: {
          light: '#f0f4f8',
          dark:  '#0d1b2a',
        },
        card: {
          light: '#ffffff',
          dark:  '#1b2838',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      animation: {
        'focus-pulse': 'focusPulse 2s ease-in-out infinite',
      },
      keyframes: {
        focusPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.2)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(37, 99, 235, 0)' },
        },
      },
    },
  },
  plugins: [],
}
