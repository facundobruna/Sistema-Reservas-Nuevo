import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empaqueta el server de Next junto con solo las dependencias que realmente usa
  // (node_modules trazado) en .next/standalone. Es lo que permite que la imagen
  // final del Dockerfile no necesite ni pnpm ni el node_modules completo.
  output: "standalone",
};

export default nextConfig;
