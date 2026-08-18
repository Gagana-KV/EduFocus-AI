/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nvidia-green': '#76b900',
        'nvidia-green-light': '#8fd01a',
        'nvidia-green-dark': '#5a8d00',
        'nvidia-blue': '#00b0f0',
        'dark-bg': '#0a0a0c',
        'panel-bg': '#141416',
        'panel-border': '#2c2c2e'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
