/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#f8f7fd',
          100: '#f0eeff',
          200: '#e3defb',
          300: '#cec3f8',
          400: '#a894f0',
          500: '#8462e7',
          600: '#6c44da',
          700: '#5832c3',
          800: '#482a9f',
          900: '#3c2580',
        },
        peach: {
          50: '#fff5f3',
          100: '#ffe8e4',
          200: '#ffd3cc',
          300: '#fcaaa0',
          400: '#f77668',
          500: '#ea4f3f', // reddish peach primary
          600: '#d53424',
          700: '#b2271a',
          800: '#932419',
          900: '#7a221a',
        },
        brand: {
          dark: '#1e2433', // navy grey
          sidebar: '#171b26',
        }
      },
    },
  },
  plugins: [],
};

