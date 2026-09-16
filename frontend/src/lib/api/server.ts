import { cookies } from "next/headers";

/**
 * Cliente HTTP para los Server Components: es la única puerta por la que este
 * frontend obtiene datos. No hay ORM ni conexión a Postgres de este lado.
 *
 * Dos detalles que no son obvios:
 *
 * 1. Acá se le pega al backend en forma directa (`BACKEND_INTERNAL_URL`, que en
 *    compose es `http://backend:3000`), no al reenvío /api de este mismo
 *    servidor. El reenvío existe para el navegador, que sí necesita un único
 *    origen por las cookies; el servidor ya está adentro de la red.
 *
 * 2. `fetch` en un Server Component no arrastra las cookies del visitante: hay
 *    que reenviarlas a mano. Este frontend no puede abrir ese token — no tiene
 *    AUTH_SECRET — solo lo pasa tal cual para que lo valide el backend.
 */
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number };

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const cookieHeader = (await cookies()).toString();

  const response = await fetch(`${BACKEND_URL}/api/v1${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    // Son datos por usuario y por request (sesión, disponibilidad, suscripción):
    // cachearlos mostraría los datos de un restaurante en el panel de otro.
    cache: "no-store",
  });

  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, data: (await response.json()) as T };
}
