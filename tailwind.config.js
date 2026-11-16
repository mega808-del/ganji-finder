/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0F172A',
          850: '#0B1220',
          800: '#16213A',
          700: '#1D2A46',
        },
        gold: {
          400: '#FFC65C',
          500: '#E8A317',
          600: '#B45309',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Malgun Gothic',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
