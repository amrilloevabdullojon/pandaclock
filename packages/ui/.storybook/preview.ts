import type { Preview } from "@storybook/react-vite";
import "../src/styles/globals.css";
import "./preview.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "Light",
      values: [
        { name: "Light", value: "#ffffff" },
        { name: "Dark", value: "#0b0b0d" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
  globalTypes: {
    theme: {
      description: "Цветовая тема",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme === "dark" ? "dark" : "";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.body.style.background = theme === "dark" ? "#0b0b0d" : "#ffffff";
      }
      return Story();
    },
  ],
};

export default preview;
