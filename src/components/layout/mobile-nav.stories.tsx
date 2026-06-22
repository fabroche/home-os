import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MobileNav } from "./mobile-nav";

/**
 * Bottom tab bar (solo móvil). Se ve a anchos < md; en viewports de escritorio
 * queda oculta por diseño. Las stories fijan un viewport móvil y la ruta activa.
 */
const meta = {
  title: "Layout/MobileNav",
  component: MobileNav,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile1" },
    nextjs: { appDirectory: true, navigation: { pathname: "/finanzas" } },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof MobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finanzas: Story = {};

export const Inicio: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/" } } },
};

export const Contexto: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/contexto" } } },
};
