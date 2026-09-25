/** @type {import('tailwindcss').Config} */
const WARM = {
          50: '#f7f5f0',
          100: '#edeae2',
          200: '#e0dbd0',
          300: '#cbc3b4',
          400: '#a89c8a',
          500: '#857866',
          600: '#66594b',
          700: '#4d4038',
          800: '#352a25',
          900: '#241b17',
          950: '#17110e',
        }

module.exports = {
  content: [
    'app.vue',
    'app/**/*.{vue,js,ts,jsx,tsx}',
    'app/components/**/*.{vue,js,ts,jsx,tsx}',
    'app/pages/**/*.{vue,js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Identidade Lara Café (mesma do site): café #3c2923, creme #edeae2, café-claro #8b6f47.
      // Os neutros (slate/gray/zinc/neutral) são remapeados para uma escala quente,
      // assim todos os componentes herdam o tom da marca sem reescrever classes.
      colors: {
        slate: WARM,
        gray: WARM,
        zinc: WARM,
        neutral: WARM,
        cafe: {
          DEFAULT: '#3c2923',
          claro: '#8b6f47',
          rotulo: '#6f5636',
          acento: '#613e26',
          creme: '#edeae2',
        },
        primary: {
          50: '#f6f1ec',
          100: '#eadfd4',
          200: '#d6c1ad',
          300: '#b89878',
          400: '#8b6f47',
          DEFAULT: '#3c2923',
          light: '#613e26',
          dark: '#2a1c18',
        },
        secondary: {
          50: '#f7f2ea',
          100: '#ede1cc',
          200: '#dcc4a0',
          300: '#c6a576',
          400: '#a8875b',
          DEFAULT: '#8b6f47',
          light: '#a8875b',
          dark: '#6f5636',
        },
        success: {
          50: '#f0f5ee',
          100: '#dde9d8',
          200: '#bcd3b2',
          300: '#94b686',
          400: '#6f9660',
          DEFAULT: '#4f6b45',
          light: '#6f9660',
          dark: '#3c5234',
        },
        danger: {
          50: '#fbefec',
          100: '#f4d9d3',
          200: '#e8b2a7',
          300: '#d6857a',
          400: '#c0614f',
          DEFAULT: '#9b3b2e',
          light: '#c0614f',
          dark: '#7a2d22',
        },
        warning: {
          50: '#fbf4e8',
          100: '#f4e3c3',
          200: '#e8c88c',
          300: '#d9aa5b',
          400: '#c28f3c',
          DEFAULT: '#a8742a',
          light: '#c28f3c',
          dark: '#7f561d',
        },
        info: {
          50: '#eef2f4',
          100: '#d9e2e7',
          200: '#b3c5cf',
          300: '#8aa6b5',
          400: '#65889a',
          DEFAULT: '#4a6b7c',
          light: '#65889a',
          dark: '#375261',
        },
        background: {
          light: '#f7f5f0',
          dark: '#17110e',
        },
        surface: {
          light: '#edeae2',
          dark: '#241b17',
        },
        border: {
          light: '#e0dbd0',
          dark: '#4d4038',
        },
        text: {
          light: '#2c2c2c',
          dark: '#edeae2',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        serif: ['Marcellus', 'Georgia', 'serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        'section': '120px',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'brutal': '0px',
      },
      fontSize: {
        '2xs': '0.625rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        'glow-primary': '0 0 15px -3px rgba(60, 41, 35, 0.35)',
        'glow-secondary': '0 0 15px -3px rgba(139, 111, 71, 0.4)',
        'glow-success': '0 0 15px -3px rgba(79, 107, 69, 0.4)',
      }
    },
  },
  plugins: [],
}