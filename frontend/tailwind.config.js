// frontend/tailwind.config.js
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0f766e",
        ink: "#1f2933",
        paper: "#eef3ef",
        amberline: "#b7791f",
      },
    },
  },
  plugins: [forms],
};
