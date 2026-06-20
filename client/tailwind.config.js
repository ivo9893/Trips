/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Earthy sea/mountain palette
        pine: {
          50: '#f1f6f3',
          100: '#dceae0',
          200: '#bad6c4',
          300: '#8dba9f',
          400: '#5f9a78',
          500: '#417c5b',
          600: '#316247',
          700: '#284e3a',
          800: '#223f30',
          900: '#1d3429',
        },
        sand: {
          50: '#fbf7f0',
          100: '#f4ecdc',
          200: '#e8d7b8',
          300: '#d9bd8c',
          400: '#caa063',
          500: '#bf8a47',
          600: '#a8723b',
          700: '#8a5932',
          800: '#71492f',
          900: '#5e3e2a',
        },
        sea: {
          50: '#eef7f9',
          100: '#d6ecf0',
          200: '#b1dae2',
          300: '#7dbecd',
          400: '#469bb0',
          500: '#2c7e96',
          600: '#27657d',
          700: '#255367',
          800: '#254656',
          900: '#223b49',
        },
        terracotta: {
          400: '#cd6f4e',
          500: '#bd5a3c',
          600: '#a44732',
        },
        stone: {
          50: '#faf9f7',
          100: '#f0eee9',
        },
      },
      fontFamily: {
        display: ['"Nunito"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        topo: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23417c5b' stroke-opacity='0.05' stroke-width='1.5'%3E%3Cpath d='M0 40 Q20 20 40 40 T80 40'/%3E%3Cpath d='M0 56 Q20 36 40 56 T80 56'/%3E%3Cpath d='M0 24 Q20 4 40 24 T80 24'/%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
