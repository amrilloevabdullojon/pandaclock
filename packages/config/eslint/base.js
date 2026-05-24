import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

/** Base ESLint config for all TypeScript packages. */
export default tseslint.config(
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**", "build/**"],
  },
);
