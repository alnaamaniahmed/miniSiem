/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214 10% 85%)",
        input: "hsl(214 10% 90%)",
        ring: "hsl(215 20% 65%)",
        background: "hsl(210 20% 98%)",
        foreground: "hsl(210 10% 10%)",
        primary: { DEFAULT: "hsl(221 83% 53%)", foreground: "#fff" },
        muted: { DEFAULT: "hsl(210 15% 96%)", foreground: "hsl(215 16% 46%)" },
        card: { DEFAULT: "#fff", foreground: "hsl(210 10% 10%)" },
        destructive: { DEFAULT: "#ef4444", foreground: "#fff" }
      },
      borderRadius: { lg: "12px", md: "10px", sm: "8px" },
      keyframes: {
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } }
      },
      animation: { "fade-in": "fade-in .2s ease-out" }
    }
  },
  plugins: []
};
