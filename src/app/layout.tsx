import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "home-os",
  description: "Sistema de gestión personal: finanzas, calendario inteligente y backoffice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
