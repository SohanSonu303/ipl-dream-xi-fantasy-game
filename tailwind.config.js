/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Oswald', 'Barlow Condensed', 'sans-serif'],
        cond: ['Barlow Condensed', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        500: '500',
        600: '600',
        700: '700',
        800: '800',
      },
      colors: {
        pitch: {
          950: '#05070f',
          900: '#0a0e1a',
          850: '#0f1424',
          800: '#141a2e',
          700: '#1d2540',
          600: '#2a3357',
        },
        gold: {
          DEFAULT: '#f5c542',
          soft: '#ffe08a',
          deep: '#c9971f',
        },
      },
      boxShadow: {
        card: '0 20px 45px -20px rgba(0,0,0,0.85)',
        glow: '0 0 32px -4px var(--accent, #f5c542)',
        'inner-top': 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
      },
      keyframes: {
        'float-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'float-up': 'float-up 0.5s ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
      backgroundImage: {
        'stadium-grid':
          'radial-gradient(circle at 50% -20%, rgba(245,197,66,0.12), transparent 55%), repeating-linear-gradient(115deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 26px)',
      },
    },
  },
  plugins: [],
};
