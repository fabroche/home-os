import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessage } from "./chat-message";

/** Burbuja de mensaje del asistente: usuario, respuesta IA (con fuentes) y "pensando". */
const meta = {
  title: "Asistente/ChatMessage",
  component: ChatMessage,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Usuario: Story = {
  args: { msg: { id: "1", rol: "user", contenido: "¿Cuánto gasté en comida en mayo?" } },
};

export const Asistente: Story = {
  args: {
    msg: {
      id: "2",
      rol: "assistant",
      contenido: "En mayo gastaste 420 € en Comida.",
      fuentes: [
        { id: "c1", titulo: "12 movimientos" },
        { id: "c2", titulo: "Regla: Mercadona = Comida" },
      ],
    },
  },
};

export const Pensando: Story = {
  args: { msg: { id: "3", rol: "assistant", contenido: "", pendiente: true } },
};
