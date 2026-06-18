/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#8B5CF6',
        },
        accent: '#10B981',
        danger: '#EF4444',
        surface: '#FFFFFF',
        // App background + border tokens (background uses Tailwind's `bg-app`).
        app: '#F9FAFB',
        line: '#E5E7EB',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
