/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#FDFBF7',
          100: '#F5F5DC', // Cream
          200: '#E6D7C3',
          300: '#D7B999',
          400: '#C68E17', // Caramel
          500: '#8B5A2B',
          600: '#6F4E37', // Coffee Brown
          700: '#523724',
          800: '#3E2723', // Dark Brown
          900: '#23140C',
          950: '#150A05',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'coffee': '0 10px 30px -10px rgba(111, 78, 55, 0.3)',
      },
    },
  },
  plugins: [],
};
