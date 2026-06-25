import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#d4de26',
          muted: 'rgba(212,222,38,0.15)',
        },
        jj: {
          neutral: '#f7f7f2',
          grey: '#bfc5d2',
          yellow: '#d4de26',
          black: '#000000',
          // Secondary/highlight
          brightYellow: '#f0f760',
          blue: '#2fa3dc',
          coral: '#ff6b4d',
          lavender: '#c9b5ff',
          forest: '#1f5633',
          slate: '#4a5568',
          teal: '#30f2d6',
          crimson: '#da2c38',
          orange: '#ff9e2c',
        },
      },
      fontFamily: {
        heading: ['var(--font-bebas)', 'Bebas Neue', 'sans-serif'],
        body: ['var(--font-rubik)', 'Rubik', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
