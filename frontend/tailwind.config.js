/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MTG mana colors
        'mana-white': '#f8f6d8',
        'mana-blue': '#0e68ab',
        'mana-black': '#150b00',
        'mana-red': '#d3202a',
        'mana-green': '#00733e',
        'mana-gold': '#c8a84b',
        'mana-colorless': '#8c8c8c',
        // App theme
        'app-bg': '#0f0f1a',
        'app-surface': '#1a1a2e',
        'app-surface2': '#16213e',
        'app-border': '#2a2a4a',
        'app-accent': '#7c3aed',
        'app-accent2': '#a855f7',
      }
    },
  },
  plugins: [],
}
