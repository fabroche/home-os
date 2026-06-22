import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ModuleStub } from "./module-stub";

/** Placeholder con identidad para módulos aún no implementados. */
const meta = {
  title: "Layout/ModuleStub",
  component: ModuleStub,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof ModuleStub>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Calendario: Story = {
  args: {
    modulo: "M2",
    titulo: "Calendario",
    accent: "inteligente",
    children: "Viajes, eventos y avisos de cosas de tu interés, locales o remotas.",
  },
};

export const Backoffice: Story = {
  args: {
    modulo: "M3",
    titulo: "Backoffice de",
    accent: "correo",
    children: "Triaje de varias cuentas, extracción de facturas y descubrimiento de eventos.",
  },
};
