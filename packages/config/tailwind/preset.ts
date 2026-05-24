/**
 * Pandaclock Tailwind preset.
 *
 * Источник истины для цветов, шрифтов, токенов:
 * docs/Дизайн_система.md
 *
 * Использование:
 *   import preset from "@pandaclock/config/tailwind";
 *   export default { presets: [preset], content: [...] } satisfies Config;
 */
import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
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
        },
        warning: {
          light: "#FDEDDC",
          DEFAULT: "#F4A155",
        },
        danger: {
          light: "#FBE0E3",
          DEFAULT: "#ED7280",
        },
        info: {
          light: "#DDEBF8",
          DEFAULT: "#5B9FE6",
        },
        gold: {
          light: "#FDEFCC",
          DEFAULT: "#F4B942",
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
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #5B4FE2 0%, #8B7DFD 100%)",
        "gradient-sunset": "linear-gradient(135deg, #F4B942 0%, #ED7280 100%)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },
    },
  },
};

export default preset;
