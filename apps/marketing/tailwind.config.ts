import type { Config } from "tailwindcss";
import preset from "@pandaclock/config/tailwind";
import animate from "tailwindcss-animate";

export default {
  presets: [preset],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [animate],
} satisfies Config;
