import type { StorybookConfig } from "@storybook/nextjs-vite";

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
    return viteConfig;
  },
};

export default config;
