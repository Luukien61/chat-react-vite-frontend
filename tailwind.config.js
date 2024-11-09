/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}' // Chỉ định các thư mục và file
  ],
  theme: {
    extend: {
      colors:{
        chat_me: '#e5efff',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      }
    }
  },
  plugins: []
}
