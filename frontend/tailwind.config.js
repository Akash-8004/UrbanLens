/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070A12',
        panel: { DEFAULT: '#0D1220', alt: '#111827' },
        border: '#1E293B',
        text: { DEFAULT: '#E2E8F0', muted: '#94A3B8', faint: '#475569' },
        thermal: {
          low: '#3B82F6',
          mod: '#22D3EE',
          high: '#F59E0B',
          ext: '#EF4444',
        },
        accent: {
          emerald: '#10B981',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: { tight: '-0.02em' },
      boxShadow: {
        glow: '0 0 24px rgba(6, 182, 212, 0.15)',
        'glow-amber': '0 0 24px rgba(245, 158, 11, 0.2)',
      },
      animation: {
        scanline: 'scanline 2.5s ease-in-out 1',
        pulseRing: 'pulseRing 2s ease-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
