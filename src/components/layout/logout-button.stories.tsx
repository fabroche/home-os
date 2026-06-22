import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LogoutButton } from "./logout-button";

/** Botón de cierre de sesión (cliente). La etiqueta "Salir" se oculta en móvil. */
const meta = {
  title: "Layout/LogoutButton",
  component: LogoutButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof LogoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
