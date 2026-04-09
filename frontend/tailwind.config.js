/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg':       '#0f172a',
        'app-surface':  '#1e293b',
        'app-surface2': '#172033',
        'app-border':   '#334155',
        'app-accent':   '#6366f1',
        'app-accent2':  '#818cf8',
        'app-green':    '#22c55e',
        'app-red':      '#ef4444',
      }
    },
  },
  plugins: [],
}
