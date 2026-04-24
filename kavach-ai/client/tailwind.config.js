/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#05080f',
          900: '#0a0f1e',
          800: '#0d1526',
          700: '#111c35',
          600: '#1a2645',
          500: '#243258',
        }
      },
      animation: {
        'slide-in-top': 'slideInTop 0.35s ease-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'flash-red': 'flashRed 0.6s ease-out',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        slideInTop: {
          '0%': { transform: 'translateY(-16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.6' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(239,68,68,0.5)' },
          '100%': { backgroundColor: 'transparent' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      }
    }
  },
  plugins: []
}
