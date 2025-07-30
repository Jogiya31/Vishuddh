/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      padding: {
        DEFAULT: "0.5rem", // 8px (Change as needed)
        sm: "1rem",
        md: ".5rem",
        lg: "1rem",
        xl: "3rem",
      },
    },
    extend: {
      fontFamily: {
        roboto: ['Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}