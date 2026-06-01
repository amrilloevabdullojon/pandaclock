import node from "@pandaclock/config/eslint/node";

export default [
  ...node,
  {
    rules: {
      // NestJS код часто импортирует типы для декораторов — слишком много
      // ложных позитивов; оставляем как warning а не error
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
];
