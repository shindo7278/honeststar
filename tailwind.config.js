/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "blue-pale": "#EAF6FB",
        "blue-light": "#A8D5E8",
        brand: "#5B9BB5",
        "brand-deep": "#3A7A93",
        pinkish: "#F3D9DE",
        "pinkish-deep": "#C97B8C",
        ink: "#1F2D33",
        "ink-soft": "#5C6B70",
      },
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
      },
      borderRadius: {
        xl2: "18px",
      },
    },
  },
  plugins: [],
};
