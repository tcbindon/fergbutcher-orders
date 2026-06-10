/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fergbutcher: {
          green: {
            50: '#f0f4f0',
            100: '#d9e5d9',
            200: '#b3ccb3',
            300: '#8cb28c',
            400: '#669966',
            500: '#4d7f4d',
            600: '#2d4f2d',
            700: '#1e3a1e',
            800: '#0f250f',
            900: '#0a1a0a',
          },
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          brown: {
            50: '#faf8f5',
            100: '#f4f0e8',
            200: '#e8ddd0',
            300: '#d6c4a8',
            400: '#c4a67e',
            500: '#b8925f',
            600: '#a67c4a',
            700: '#8b653e',
            800: '#715237',
            900: '#5c4430',
          },
          yellow: {
            50: '#fffef0',
            100: '#fffadc',
            200: '#fff3b8',
            300: '#ffe885',
            400: '#ffd951',
            500: '#ffc82a',
            600: '#f0a500',
            700: '#cc7a02',
            800: '#a35f08',
            900: '#854e0b',
          },
          black: {
            50: '#f6f6f6',
            100: '#e7e7e7',
            200: '#d1d1d1',
            300: '#b0b0b0',
            400: '#888888',
            500: '#6d6d6d',
            600: '#5d5d5d',
            700: '#4f4f4f',
            800: '#454545',
            900: '#3d3d3d',
            950: '#1a1a1a',
          }
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
