import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AclararCard } from "./aclarar-card";

/** Tarjeta de desambiguación: el router pregunta cuando el mensaje admite más de una lectura. */
const meta = {
  title: "Asistente/AclararCard",
  component: AclararCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof AclararCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ambiguo: Story = {
  args: {
    aclarar: {
      pregunta: '"Ya pagué la luz" puede ser un gasto nuevo o marcar una luz pendiente como pagada. ¿Qué hago?',
      opciones: [
        { etiqueta: "Registrar un gasto nuevo", accion: "gasto" },
        { etiqueta: "Marcar la luz como pagada", accion: "pagado" },
      ],
      mensaje: "ya pagué la luz",
    },
  },
};
