import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const mock = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/nextjs-vite", options: {} },
  staticDirs: ["../public"],
  // Tailwind v4 vía su plugin de Vite (el postcss.config.mjs con @tailwindcss/postcss
  // no lo carga el Vite de Storybook). Se desactiva el autoload de postcss para evitarlo.
  viteFinal: async (viteConfig) => {
    const { default: tailwindcss } = await import("@tailwindcss/vite");
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.push(tailwindcss());
    viteConfig.css = { ...(viteConfig.css ?? {}), postcss: { plugins: [] } };

    // Las Server Actions (`@/lib/actions/*`) arrastran la capa server/worker
    // (`server-guard`), que lanza en el navegador. En Storybook se sustituyen por
    // mocks para que los componentes que las importan rendericen. Los alias
    // específicos van ANTES del alias general `@` para tener prioridad.
    viteConfig.resolve = viteConfig.resolve ?? {};
    const actionAliases = [
      { find: "@/lib/actions/finanzas", replacement: mock("./mocks/actions-finanzas.ts") },
      { find: "@/lib/actions/contexto", replacement: mock("./mocks/actions-contexto.ts") },
      { find: "@/lib/actions/ai", replacement: mock("./mocks/actions-ai.ts") },
    ];
    const current = viteConfig.resolve.alias;
    if (Array.isArray(current)) {
      viteConfig.resolve.alias = [...actionAliases, ...current];
    } else {
      viteConfig.resolve.alias = {
        "@/lib/actions/finanzas": actionAliases[0].replacement,
        "@/lib/actions/contexto": actionAliases[1].replacement,
        "@/lib/actions/ai": actionAliases[2].replacement,
        ...(current ?? {}),
      };
    }
    return viteConfig;
  },
};

export default config;
