import next from "eslint-config-next";

// eslint-config-next@16 exporta un flat config array nativo (core-web-vitals +
// typescript + ignores). Se usa directo, sin FlatCompat (evita el bug de
// "Converting circular structure to JSON" de @eslint/eslintrc).
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "worker/dist/**"] },
  ...next,
  {
    rules: {
      // Regla anti-patrón del experimento Notion previo (sin console.log crudos).
      // El control de `any` ya lo aporta la config TypeScript de Next.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];

export default eslintConfig;
