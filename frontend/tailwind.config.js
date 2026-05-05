/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'app-bg':       '#f0f4f8',
        'app-surface':  '#ffffff',
        'app-surface2': '#f1f5f9',
        'app-border':   '#e2e8f0',
        'app-accent':   '#6366f1',
        'app-accent2':  '#4f46e5',
        'app-green':    '#16a34a',
        'app-red':      '#dc2626',
      }
    },
  },
  plugins: [],
}
