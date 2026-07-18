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
        primary: '#4f46e5',
        'primary-hover': '#4338ca',
        'primary-light': '#e0e7ff',
        // Map gray to zinc for pure neutral grays without blue tint
        gray: colors.zinc,
        'gray-light': colors.zinc[100],
        'gray-medium': colors.zinc[400],
        'gray-dark': colors.zinc[600],
        'gray-darkest': colors.zinc[800],
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
