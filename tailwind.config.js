/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fergbutcher: {
          // Pantone 5605 C (#22372B) and 5605 U (#5E695E) — the brand greens
          green: {
            50:  '#eef2ef',
            100: '#d5e1d7',
            200: '#adc3b0',
            300: '#7ea388',
            400: '#5E695E', // Pantone 5605 U — muted sage
            500: '#3d5442',
            600: '#22372B', // Pantone 5605 C — PRIMARY brand green
            700: '#1a2b22',
            800: '#111e17',
            900: '#09110d',
          },
          // Pantone 4525 C (#C5B783) and 4525 U (#C1B58C) — the brand gold/khaki
          gold: {
            50:  '#faf9f3', // warm cream — PAGE BACKGROUND
            100: '#f3edd8',
            200: '#e5dab4',
            300: '#C1B58C', // Pantone 4525 U
            400: '#C5B783', // Pantone 4525 C — PRIMARY brand accent
            500: '#b3a46a',
            600: '#9b8c52',
            700: '#7d7040', // body text on light backgrounds
            800: '#5f5430',
            900: '#3d3720',
          },
          // Neutral near-black for headings and primary text
          black: {
            50:  '#f6f6f6',
            100: '#e7e7e7',
            200: '#d1d1d1',
            300: '#b0b0b0',
            400: '#888888',
            500: '#6d6d6d',
            600: '#5d5d5d',
            700: '#4f4f4f',
            800: '#454545',
            900: '#1a1a1a',
          },
          // Utility yellow — warning states only, not brand
          yellow: {
            50:  '#fffef0',
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
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
