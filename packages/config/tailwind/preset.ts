/**
 * Pandaclock Tailwind preset.
 *
 * Источник истины для цветов, шрифтов, токенов:
 * docs/Дизайн_система.md
 *
 * Дизайн-токены: семантические (background/foreground/card/popover/muted/
 * accent/destructive/border/input/ring) — через HSL CSS-переменные →
 * готовы под dark mode (включается классом `dark` на <html>).
 * Брендовая палитра (primary/neutral/success/...) — статичная.
 *
 * Использование:
 *   import preset from "@pandaclock/config/tailwind";
 *   export default { presets: [preset], content: [...] } satisfies Config;
 */
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const preset: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        // === семантические токены (через CSS vars, готовы под dark) ===
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        // === статичная палитра бренда ===
        primary: {
          50: "#F0EEFF",
          100: "#DCD7FF",
          200: "#B5ACFF",
          300: "#8B7DFD",
          400: "#6B5DE6",
          500: "#5B4FE2",
          600: "#4A3FCC",
          700: "#3A30A8",
          800: "#1B1F4D",
          900: "#0E0F2E",
          DEFAULT: "#5B4FE2",
          foreground: "#FFFFFF",
        },
        neutral: {
          50: "#FAFBFD",
          100: "#F5F6FA",
          200: "#E8EAF2",
          300: "#C5C9D6",
          400: "#9CA0B0",
          500: "#6B7080",
          600: "#3D4253",
          700: "#1F2233",
          900: "#0E0F1F",
        },
        success: {
          light: "#E0F0E9",
          DEFAULT: "#6BB39A",
          foreground: "#FFFFFF",
        },
        warning: {
          light: "#FDEDDC",
          DEFAULT: "#F4A155",
          foreground: "#FFFFFF",
        },
        danger: {
          light: "#FBE0E3",
          DEFAULT: "#ED7280",
          foreground: "#FFFFFF",
        },
        info: {
          light: "#DDEBF8",
          DEFAULT: "#5B9FE6",
          foreground: "#FFFFFF",
        },
        gold: {
          light: "#FDEFCC",
          DEFAULT: "#F4B942",
          foreground: "#1F2233",
        },
      },
      fontFamily: {
        sans: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15, 16, 47, 0.04)",
        sm: "0 2px 4px rgba(15, 16, 47, 0.06), 0 1px 2px rgba(15, 16, 47, 0.04)",
        md: "0 4px 12px rgba(15, 16, 47, 0.08)",
        lg: "0 12px 24px rgba(15, 16, 47, 0.10)",
        xl: "0 24px 48px rgba(15, 16, 47, 0.14)",
        primary: "0 8px 24px rgba(91, 79, 226, 0.25)",
        "primary-lg": "0 16px 40px rgba(91, 79, 226, 0.35)",
        glow: "0 0 24px rgba(139, 125, 253, 0.5)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #5B4FE2 0%, #8B7DFD 100%)",
        "gradient-sunset": "linear-gradient(135deg, #F4B942 0%, #ED7280 100%)",
        "gradient-ocean": "linear-gradient(135deg, #5B9FE6 0%, #6BB39A 100%)",
        "gradient-dawn": "linear-gradient(135deg, #5B4FE2 0%, #ED7280 100%)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },
      // === motion-токены ===
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out-quint": "cubic-bezier(0.83, 0, 0.17, 1)",
      },
      transitionDuration: {
        "250": "250ms",
        "400": "400ms",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "fade-in-up": "fade-in-up 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 1.5s infinite",
      },
      zIndex: {
        "1": "1",
        "5": "5",
        dropdown: "1000",
        sticky: "1020",
        fixed: "1030",
        "modal-backdrop": "1040",
        modal: "1050",
        popover: "1060",
        tooltip: "1070",
        toast: "1080",
      },
    },
  },
  plugins: [animate],
};

export default preset;
