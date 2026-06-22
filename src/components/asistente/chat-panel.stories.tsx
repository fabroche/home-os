import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatPanel } from "./chat-panel";

/** Panel del asistente (presentacional). Sheet en móvil / tarjeta en desktop. */
const meta = {
  title: "Asistente/ChatPanel",
  component: ChatPanel,
  parameters: { layout: "fullscreen" },
  args: { onSend: () => {}, onClose: () => {} },
  tags: ["autodocs"],
} satisfies Meta<typeof ChatPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vacio: Story = {
  args: { messages: [], pending: false },
};

export const Conversacion: Story = {
  args: {
    pending: false,
    messages: [
      { id: "1", rol: "user", contenido: "¿Cuánto gasté en comida en mayo?" },
      {
        id: "2",
        rol: "assistant",
        contenido: "En mayo gastaste 420 € en Comida.",
        fuentes: [{ id: "c1", titulo: "12 movimientos" }],
      },
    ],
  },
};

export const Pensando: Story = {
  args: {
    pending: true,
    messages: [
      { id: "1", rol: "user", contenido: "¿Saldo de Leo?" },
      { id: "2", rol: "assistant", contenido: "", pendiente: true },
    ],
  },
};
