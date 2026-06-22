import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SuggestionCard } from "./suggestion-card";

/** Tarjeta de propuesta de contexto con Revisar y publicar / Guardar borrador / Descartar. */
const meta = {
  title: "Asistente/SuggestionCard",
  component: SuggestionCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SuggestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Regla: Story = {
  args: {
    borrador: {
      tipo: "regla_financiera",
      titulo: "Mercadona = Comida",
      contenido: "Los cargos de Mercadona se categorizan como Comida.",
      tags: ["comida", "supermercado"],
    },
  },
};

export const Proveedor: Story = {
  args: {
    borrador: {
      tipo: "proveedor",
      titulo: "Naturgy",
      contenido: "Compañía de gas; factura mensual a domiciliar.",
      tags: ["gas", "hogar"],
    },
  },
};
