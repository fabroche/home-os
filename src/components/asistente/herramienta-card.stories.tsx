import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HerramientaCard } from "./herramienta-card";

const opciones = {
  cuentas: [{ id: "c1", nombre: "Cuenta principal" }],
  tarjetas: [{ id: "t1", nombre: "Visa" }],
  personas: ["Leo", "Pareja"],
};

/** Tarjeta genérica del asistente: renderiza la propuesta de cualquier herramienta de creación. */
const meta = {
  title: "Asistente/HerramientaCard",
  component: HerramientaCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { opciones },
} satisfies Meta<typeof HerramientaCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CrearCuenta: Story = {
  args: { herramienta: "crear_cuenta", propuesta: { nombre: "Ahorros", tipo: "ahorro", saldoInicial: 500 } },
};

export const CrearTarjeta: Story = {
  args: {
    herramienta: "crear_tarjeta",
    propuesta: { nombre: "Visa", tipo: "credito", cuentaId: "c1", limite: 3000, diaCorte: 1, diaPago: 5 },
  },
};

export const CrearPresupuesto: Story = {
  args: { herramienta: "crear_presupuesto", propuesta: { categoria: "Comida", monto: 250 } },
};
