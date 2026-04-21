import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0b1121", 800: "#111b2e", 700: "#162038", 600: "#1a2744", 500: "#1e3054" },
        flash: { blue: "#3b82f6", cyan: "#22d3ee", green: "#10b981", amber: "#f59e0b", red: "#ef4444", purple: "#a78bfa" },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
