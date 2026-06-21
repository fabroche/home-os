import type { Preview, Decorator } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

// Aplica el tema seleccionado en la toolbar añadiendo la clase `.dark` al canvas
// (lo mismo que hace next-themes en la app → activa los tokens de globals.css).
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="bg-background text-foreground min-h-[60vh] p-6">
        <Story />
      </div>
    </div>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: { test: "todo" },
  },
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description: "Tema de color (light / dark)",
      toolbar: {
        title: "Tema",
        icon: "contrast",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme],
};

export default preview;
