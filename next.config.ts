import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima para Dokploy (ver Dockerfile).
  output: "standalone",
  // El worker de IA y los jobs corren fuera del proceso de Next; aquí solo la app web.
  serverExternalPackages: ["@notionhq/client", "imapflow", "mailparser", "googleapis"],
  experimental: {
    // Server Actions con payloads de adjuntos/facturas algo mayores.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
