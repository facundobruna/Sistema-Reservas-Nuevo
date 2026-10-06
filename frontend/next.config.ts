import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Igual que en el backend: .next/standalone para que la imagen final no
  // necesite ni pnpm ni el node_modules completo.
  output: "standalone",

  // El reenvío de /api al backend ya no vive acá: está en src/proxy.ts. `rewrites()`
  // se evalúa al compilar y dejaba la dirección del backend escrita dentro de la
  // imagen; el proxy la lee en cada pedido, así la misma imagen sirve en QA y PROD.
};

export default nextConfig;
