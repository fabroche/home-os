import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatBubble } from "./chat-bubble";

/**
 * Burbuja del asistente. Cerrada muestra el FAB; abierta, el panel. Las Server
 * Actions están mockeadas en Storybook (.storybook/mocks/actions-ai.ts).
 */
const meta = {
  title: "Asistente/ChatBubble",
  component: ChatBubble,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cerrada: Story = {};

export const Abierta: Story = {
  args: { defaultOpen: true },
};
