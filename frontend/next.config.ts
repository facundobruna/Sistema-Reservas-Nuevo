import type { NextConfig } from "next";

// Dónde escucha la API. En compose es el nombre del servicio (`http://backend:3000`);
// corriendo todo a mano en la máquina, el backend queda en localhost:3000.
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Igual que en el backend: .next/standalone para que la imagen final no
  // necesite ni pnpm ni el node_modules completo.
  output: "standalone",

  // El navegador nunca le pega directo al backend: le pega a este frontend, y
  // este frontend reenvía todo lo que empiece con /api a la API.
  //
  // El motivo es la sesión. El login devuelve una cookie httpOnly. Si el
  // navegador hablara directamente con otro origen (otro puerto ya alcanza),
  // esa cookie sería de terceros: harían falta CORS con credentials,
  // SameSite=None y, por lo tanto, HTTPS — que en local no tenemos. Con este
  // reenvío todo ocurre bajo un único origen y la cookie sigue funcionando
  // exactamente igual que cuando era una sola aplicación.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
