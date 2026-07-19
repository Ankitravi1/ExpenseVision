const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Emerald & Sand — deep, editorial money-green (not cartoon green)
        primary: '#0E7C66',
        'primary-hover': '#0B5D4E',
        'primary-light': '#d1faec',
        // Warm gold micro-accent, used sparingly
        accent: '#E0A82E',
        'accent-hover': '#c8942a',
        // Map gray to stone for a warm neutral canvas (cream whites, warm inks)
        gray: colors.stone,
        'gray-light': colors.stone[100],
        'gray-medium': colors.stone[400],
        'gray-dark': colors.stone[600],
        'gray-darkest': colors.stone[800],
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#e11d48',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
