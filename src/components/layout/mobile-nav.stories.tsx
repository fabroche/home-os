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
    nextjs: { appDirectory: true, navigation: { pathname: "/finanzas" } },
  },
  // Es `md:hidden`: solo se ve en móvil. Arranca con un viewport móvil para que
  // sea visible al abrir la story sin tener que cambiarlo a mano.
  globals: { viewport: { value: "iphone6", isRotated: false } },
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
