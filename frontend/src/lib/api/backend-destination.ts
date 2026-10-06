/**
 * A qué dirección del backend se reenvía un pedido que llegó a /api/*.
 *
 * La dirección se lee de `BACKEND_INTERNAL_URL` EN CADA PEDIDO y no al compilar.
 * Es lo que permite que una misma imagen del frontend sirva en QA y en
 * producción: lo único que cambia entre ambientes es la variable de entorno
 * del servicio, no la imagen. (Con `rewrites()` de next.config.ts la dirección
 * quedaba escrita dentro de la imagen en el momento del build.)
 */
export function destinoEnElBackend(pathname: string, search: string): URL {
  const base = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";
  return new URL(`${pathname}${search}`, base);
}
