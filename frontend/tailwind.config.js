/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // enable class‑based dark mode
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4f46e5',
          DEFAULT: '#4338ca',
          dark: '#3730a3',
        },
      },
    },
  },
  plugins: [],
};