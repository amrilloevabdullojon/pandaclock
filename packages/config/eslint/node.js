import baseConfig from "./base.js";

/** ESLint config for Node.js / NestJS applications. */
export default [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      // NestJS uses decorators heavily; allow constructor parameter properties.
      "no-empty-function": ["error", { allow: ["constructors"] }],
    },
  },
];
