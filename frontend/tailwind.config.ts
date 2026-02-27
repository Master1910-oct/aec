import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: "#261f2e",
        input: "#1f1a24",
        ring: "#0ca5e9",
        background: "#0f0b1a",
        foreground: "#e5e5e8",
        primary: {
          DEFAULT: "#0ca5e9",
          foreground: "#0f0b1a",
        },
        secondary: {
          DEFAULT: "#282336",
          foreground: "#d9d5e0",
        },
        destructive: {
          DEFAULT: "#ff3333",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#241d30",
          foreground: "#7d7a88",
        },
        accent: {
          DEFAULT: "#1a3d47",
          foreground: "#5eb3d6",
        },
        popover: {
          DEFAULT: "#1a1523",
          foreground: "#e5e5e8",
        },
        card: {
          DEFAULT: "#1a1526",
          foreground: "#e5e5e8",
        },
        emergency: {
          DEFAULT: "#ff4444",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#ffc107",
          foreground: "#1a0d00",
        },
        success: {
          DEFAULT: "#4caf50",
          foreground: "#1a4d1a",
        },
        info: {
          DEFAULT: "#2196f3",
          foreground: "#001a4d",
        },
        critical: {
          DEFAULT: "#d81b60",
          foreground: "#ffffff",
        },
        sidebar: {
          DEFAULT: "#0d0a14",
          foreground: "#c7c4ce",
          primary: "#0ca5e9",
          "primary-foreground": "#0f0b1a",
          accent: "#1f1a26",
          "accent-foreground": "#5eb3d6",
          border: "#1d1628",
          ring: "#0ca5e9",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "slide-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "slide-in-up": "slide-in-up 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
