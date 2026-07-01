import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { GastoRecurrente } from "@/types/recurrentes";
import { GastosRecurrentesCard } from "./gastos-recurrentes-card";

const rec = (over: Partial<GastoRecurrente>): GastoRecurrente => ({
  id: crypto.randomUUID(),
  concepto: "Alquiler",
  monto: 800,
  categoria: "Casa",
  tipo: "Gasto Fijo",
  diaMes: 1,
  fechaInicio: "2026-01-01",
  cuentaId: null,
  tarjetaId: null,
  persona: null,
  ultimaGenerada: "2026-07",
  activo: true,
  ...over,
});

/** Gastos recurrentes: lista de activos + alta inline; el worker genera un movimiento al mes. */
const meta = {
  title: "Finanzas/GastosRecurrentesCard",
  component: GastosRecurrentesCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { cuentas: [{ id: "c1", nombre: "Cuenta principal" }], tarjetas: [{ id: "t1", nombre: "Visa" }], personas: ["Leo"] },
} satisfies Meta<typeof GastosRecurrentesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConDatos: Story = {
  args: {
    recurrentes: [
      rec({ concepto: "Alquiler", monto: 800, categoria: "Casa", diaMes: 1 }),
      rec({ concepto: "Netflix", monto: 13, categoria: "Osio", diaMes: 5 }),
      rec({ concepto: "Gimnasio", monto: 35, categoria: "Confort", diaMes: 3 }),
    ],
  },
};

export const Vacio: Story = { args: { recurrentes: [] } };
