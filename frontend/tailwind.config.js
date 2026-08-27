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
        esi: {
          1: '#EF4444', // Red - Resuscitation
          2: '#F97316', // Orange - Emergent
          3: '#EAB308', // Yellow - Urgent
          4: '#3B82F6', // Blue - Semi-urgent
          5: '#10B981', // Green - Non-urgent
        },
        clinical: {
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          accent: '#06B6D4',
          alert: '#F43F5E'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
