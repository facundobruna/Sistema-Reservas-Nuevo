import { NextResponse, type NextRequest } from "next/server";
import { destinoEnElBackend } from "@/lib/api/backend-destination";

/**
 * El navegador nunca le pega directo al backend: le pega a este frontend, y
 * este frontend reenvía todo lo que empiece con /api a la API. Un único origen
 * es lo que permite que la cookie de sesión (httpOnly) funcione sin CORS ni
 * SameSite=None.
 *
 * Es un `proxy` y no un `rewrites()` de next.config.ts porque el proxy corre en
 * cada pedido y lee la variable de entorno en ese momento; `rewrites()` se
 * evalúa al compilar y deja la dirección fija dentro de la imagen.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.rewrite(destinoEnElBackend(pathname, search));
}

export const config = {
  matcher: "/api/:path*",
};
