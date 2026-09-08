/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#147D92",
          indigo: "#4F46E5",
          purple: "#8B5CF6",
          cyan: "#06B6D4",
          emerald: "#22C55E",
          amber: "#F59E0B",
          pink: "#EC4899",
          red: "#DC2626",
          bg: "#F5F7FB",
          surface: "#FFFFFF",
          text: "#172033",
          muted: "#667085",
          border: "#E4E7EC",
          // Dark Mode Tokens
          darkBg: "#0B1020",
          darkSurface: "#111827",
          darkElevated: "#182235",
          darkText: "#F8FAFC",
          darkMuted: "#A7B0C0",
          darkBorder: "#263247",
          darkPrimary: "#2DD4BF",
          darkSecondary: "#818CF8",
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 16px 32px -4px rgba(79, 70, 229, 0.12)',
        'glow-teal': '0 4px 14px 0 rgba(20, 125, 146, 0.35)',
        'glow-indigo': '0 4px 14px 0 rgba(79, 70, 229, 0.35)',
        'glow-emergency': '0 0 15px rgba(220, 38, 38, 0.6)',
      },
      animation: {
        'pulse-emergency': 'emergencyPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ai-glow': 'aiGlow 3s ease-in-out infinite',
      },
      keyframes: {
        emergencyPulse: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
          '50%': { opacity: 0.85, boxShadow: '0 0 0 10px rgba(220, 38, 38, 0)' },
        },
        aiGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(139, 92, 246, 0.25)' },
          '50%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.55)' },
        }
      }
    },
  },
  plugins: [],
}
