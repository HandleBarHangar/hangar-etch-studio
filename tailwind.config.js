/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0E2A56",
        "navy-mid": "#112F60",
        "navy-deep": "#06173A",
        gold: "#F5B921",
        "gold-soft": "#FFD25A",
        cream: "#F4ECD8",
        "cream-deep": "#E8DDC2",
        ink: "#14263F",
        muted: "#B8C4D6",
      },
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
