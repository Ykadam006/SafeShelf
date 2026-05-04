/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        shelf:
          "0 1px 3px rgb(15 23 42 / 0.06), 0 10px 30px rgb(15 23 42 / 0.04)",
      },
    },
  },
  plugins: [],
};
