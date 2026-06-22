import type { Meta, StoryObj, Decorator } from "@storybook/nextjs-vite";
import { MobileNav } from "./mobile-nav";

/**
 * Bottom tab bar (solo móvil). El componente real es `md:hidden` y `fixed`, así
 * que en el canvas/docs de escritorio no se vería. Para documentarla, se renderiza
 * dentro de un "marco de móvil" que la fija abajo y fuerza su visibilidad (override
 * acotado al marco). En la app real se ve solo en viewports < md.
 */
const InPhoneFrame: Decorator = (Story) => (
  <div
    data-sb-phone
    style={{
      position: "relative",
      width: 390,
      maxWidth: "100%",
      height: 240,
      border: "1px solid var(--border)",
      borderRadius: 20,
      overflow: "hidden",
      background: "var(--background)",
    }}
  >
    {/* Acotado al marco: revierte md:hidden y fixed para verla dentro del frame. */}
    <style>{`[data-sb-phone] nav[aria-label="Navegación principal"]{position:absolute!important;display:block!important}`}</style>
    <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--muted-foreground)", fontSize: 13 }}>
      Vista móvil
    </div>
    <Story />
  </div>
);

const meta = {
  title: "Layout/MobileNav",
  component: MobileNav,
  parameters: {
    layout: "centered",
    nextjs: { appDirectory: true, navigation: { pathname: "/finanzas" } },
  },
  decorators: [InPhoneFrame],
  tags: ["autodocs"],
} satisfies Meta<typeof MobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Finanzas: Story = {};

export const Inicio: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/" } } },
};

export const Contexto: Story = {
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/contexto" } } },
};
