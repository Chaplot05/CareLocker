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
        carefi: {
          primary: '#111111',
          dark: '#171417',
          purple: '#7956B5',
          'purple-hover': '#6947A3',
          lavender: '#B7A2DE',
          light: '#F2EEFA',
          white: '#FFFFFF',
          border: '#E7E3EF',
          muted: '#6B7280',
        },
        lavender: {
          50: '#F2EEFA',
          100: '#EBE4F7',
          200: '#D8CCE8',
          300: '#C8B7E2',
          400: '#B7A2DE',
          500: '#9576C8',
          600: '#7956B5', // Care.fi Brand purple
          700: '#6947A3',
          800: '#533783',
          900: '#171417',
        },
        // Map legacy peach references to Care.fi brand purple & primary tones
        peach: {
          50: '#F2EEFA',
          100: '#EBE4F7',
          200: '#D8CCE8',
          300: '#B7A2DE',
          400: '#9576C8',
          500: '#7956B5', // Care.fi purple primary
          600: '#6947A3',
          700: '#533783',
          800: '#171417',
          900: '#111111',
        },
        brand: {
          dark: '#111111',
          sidebar: '#FFFFFF',
          purple: '#7956B5',
          border: '#E7E3EF',
        },
      },
    },
  },
  plugins: [],
};
