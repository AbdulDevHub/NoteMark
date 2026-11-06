/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  // The main process sets nativeTheme.themeSource, which drives prefers-color-scheme.
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        canvas: token('bg'),
        sidebar: token('bg-sidebar'),
        surface: token('surface'),
        fg: token('fg'),
        muted: token('muted'),
        accent: token('accent')
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Cascadia Code', 'Menlo', 'Consolas', 'monospace']
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'pop-in': {
          from: { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
          to: { opacity: 1, transform: 'none' }
        }
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'pop-in': 'pop-in 140ms ease-out'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
