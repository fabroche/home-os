// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import next from "eslint-config-next";

// eslint-config-next@16 exporta un flat config array nativo (core-web-vitals +
// typescript + ignores). Se usa directo, sin FlatCompat (evita el bug de
// "Converting circular structure to JSON" de @eslint/eslintrc).
const eslintConfig = [{ ignores: [".next/**", "node_modules/**", "worker/dist/**", "storybook-static/**"] }, ...next, {
  rules: {
    // Regla anti-patrón del experimento Notion previo (sin console.log crudos).
    // El control de `any` ya lo aporta la config TypeScript de Next.
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
}, ...storybook.configs["flat/recommended"]];

export default eslintConfig;
