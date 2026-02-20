import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f1f5f9",
        lime: "#b7f171",
        cobalt: "#1d4ed8",
        graphite: "#0b1120"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      boxShadow: {
        "soft-xl": "0 20px 50px -20px rgba(2, 6, 23, 0.45)"
      }
    }
  },
  plugins: []
};

export default config;

