import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PagarExtractoButton } from "./pagar-extracto-button";

/** Botón para pagar (liquidar) el extracto de una tarjeta de crédito, con confirmación. */
const meta = {
  title: "Finanzas/PagarExtractoButton",
  component: PagarExtractoButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { tarjetaId: "demo-tarjeta-id", total: 842.5 },
} satisfies Meta<typeof PagarExtractoButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ImporteRedondo: Story = { args: { total: 1000 } };
