import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#0057FF",
          foreground: "#ffffff",
          50: "#EEF3FF",
          100: "#DCE7FF",
          500: "#0057FF",
          600: "#0046D1",
          700: "#0038A8",
        },
        secondary: {
          DEFAULT: "#00B894",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#6C5CE7",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#FF9800",
          foreground: "#ffffff",
        },
        danger: {
          DEFAULT: "#E53935",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "#E53935",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 12px)",
      },
      boxShadow: {
        soft: "0 2px 8px 0 rgb(15 23 42 / 0.04), 0 1px 2px 0 rgb(15 23 42 / 0.03)",
        card: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        elevated: "0 8px 24px -4px rgb(15 23 42 / 0.08), 0 2px 8px -2px rgb(15 23 42 / 0.04)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #0057FF 0%, #2B7FFF 50%, #6C5CE7 100%)",
        "gradient-subtle": "linear-gradient(180deg, #F8FAFC 0%, #EEF3FF 100%)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
