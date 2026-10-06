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
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f36f21', // Danix Primary Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          DEFAULT: '#f36f21',
        },
        navy: {
          50: '#f0f6fa',
          100: '#dce8f2',
          200: '#b8d2e4',
          300: '#86b4d1',
          400: '#4e8fba',
          500: '#2b72a2',
          600: '#1e5984',
          700: '#19476b',
          800: '#0f3759', // Danix Blue Accent
          900: '#0b2545', // Danix Deep Navy
          950: '#07162b',
          DEFAULT: '#0b2545',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      screens: {
        print: { raw: 'print' },
      },
    },
  },
  plugins: [],
};
