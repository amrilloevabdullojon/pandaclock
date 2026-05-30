import type { Config } from "tailwindcss";
import preset from "@pandaclock/config/tailwind";

/**
 * Локальный tailwind.config — нужен только Storybook'у, чтобы он сам
 * мог собрать CSS. Приложения подключают preset напрямую.
 */
const config: Config = {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx,mdx}", "./.storybook/**/*.{ts,tsx}"],
};

export default config;
