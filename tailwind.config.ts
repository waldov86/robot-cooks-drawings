import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'system-ui', 'sans-serif'],
        body:    ['Nunito', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Conventional scale: low = light, high = dark
        paper: '#fdf8f0',    // warm cream — page background
        ink: {
          50:  '#f7f5f2',   // subtle surface
          100: '#ede9e3',   // borders, dividers
          200: '#ccc7bf',   // muted borders
          300: '#9e978e',   // placeholder / disabled
          400: '#6b6460',   // secondary text
          500: '#4a4440',   // body text (7:1 on cream — passes AA)
          600: '#2e2a27',   // primary text
          700: '#1c1916',   // headings
          800: '#120f0d',   // near-black
        },
        crayon: {
          red:    '#e84040',
          orange: '#f97316',
          yellow: '#facc15',
          green:  '#22c55e',
          blue:   '#3b82f6',
          purple: '#a855f7',
          pink:   '#ec4899',
        },
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-6px)' },
        },
        'wobble': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%':      { transform: 'rotate(-3deg)' },
          '75%':      { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        'bounce-soft': 'bounce-soft 1.4s ease-in-out infinite',
        'wobble':      'wobble 0.4s ease-in-out',
      },
      boxShadow: {
        'crayon':      '3px 3px 0px 0px rgba(249,115,22,0.35)',
        'crayon-blue': '3px 3px 0px 0px rgba(59,130,246,0.35)',
        'paper':       '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
