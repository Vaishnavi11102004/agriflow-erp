/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d',950:'#052e16' },
        gold: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f' },
        agro: { 
          primary: '#166534',
          gold: '#D4A017',
          brown: '#8B5E3C',
          success: '#16A34A',
          warning: '#EA580C',
          error: '#DC2626',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          // Legacy mappings
          green: '#166534', 
          dark: '#0f3d25', 
          light: '#F8FAFC', 
          cream: '#FFFFFF' 
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-green': 'pulseGreen 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        slideIn: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        fadeIn: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseGreen: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'green': '0 4px 24px rgba(26,92,56,0.25)',
      }
    },
  },
  plugins: [],
}
