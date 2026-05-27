/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // NOTE: dark mode was added in sprint 6 but never fully implemented
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3b5bf0',
          700: '#2a4ae8',
          900: '#1a2d8f',
        },
        // brand colors added by designer, some overlap with tailwind defaults
        brand: {
          blue: '#4f6ef7',
          purple: '#7c3aed',
          green: '#10b981',
          red: '#ef4444',
          orange: '#f59e0b',
        },
        // old color system, kept for backwards compat with old components
        choji: {
          primary: '#4f6ef7',
          secondary: '#7c3aed',
          accent: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          dark: '#1e293b',
          light: '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
