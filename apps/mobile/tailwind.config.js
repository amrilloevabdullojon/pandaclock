/**
 * Tailwind config для React Native + NativeWind.
 *
 * Важно: НЕ используем web-preset из @pandaclock/config — он завязан на
 * HSL CSS-переменные через hsl(var(--bg)/<alpha-value>), которых в RN
 * не существует. Дублируем брендовые цвета и шрифты как обычные hex.
 *
 * Семантические токены (background/foreground/card/muted/...) определены
 * как обычные цвета и переключаются через NativeWind dark: variant.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Семантические токены (через @apply / variant=dark) ===
        background: "#FAFBFD",
        foreground: "#1F2233",
        card: "#FFFFFF",
        "card-foreground": "#1F2233",
        muted: "#F5F6FA",
        "muted-foreground": "#6B7080",
        accent: "#F0EEFF",
        "accent-foreground": "#5B4FE2",
        border: "#E8EAF2",
        // (для dark переопределим через :root.dark)

        // === Брендовые ===
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
          800: "#10122A",
          900: "#0E0F1F",
        },
        success: {
          light: "#E0F0E9",
          DEFAULT: "#6BB39A",
          dark: "#3F8870",
        },
        warning: {
          light: "#FDEDDC",
          DEFAULT: "#F4A155",
          dark: "#C7762A",
        },
        danger: {
          light: "#FBE0E3",
          DEFAULT: "#ED7280",
          dark: "#B94A57",
        },
        info: {
          light: "#DDEBF8",
          DEFAULT: "#5B9FE6",
          dark: "#2F73B5",
        },
        gold: {
          light: "#FDEFCC",
          DEFAULT: "#F4B942",
          dark: "#C28C24",
        },
      },
      fontFamily: {
        sans: ["Nunito_400Regular"],
        semibold: ["Nunito_600SemiBold"],
        bold: ["Nunito_700Bold"],
        extrabold: ["Nunito_800ExtraBold"],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(15, 16, 47, 0.06)",
        md: "0 4px 12px rgba(15, 16, 47, 0.08)",
        lg: "0 12px 24px rgba(15, 16, 47, 0.10)",
        primary: "0 8px 24px rgba(91, 79, 226, 0.25)",
      },
      spacing: {
        4.5: "18px",
        13: "52px",
      },
    },
  },
};
