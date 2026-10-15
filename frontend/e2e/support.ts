import { expect, type APIRequestContext } from "@playwright/test";

// A QUÉ SISTEMA LE HABLAN LAS PRUEBAS. Nada de esto está fijo en el código: el pipeline
// pasa las direcciones de QA por variables de entorno; en local valen los defaults.
export const API = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const SLUG = process.env.RESTAURANT_SLUG ?? "demo";

// Tope de cada pedido a la API. El default de Playwright es 30 s; con QA dormido no alcanza.
const TOPE_MS = 60_000;

export const get = (request: APIRequestContext, ruta: string) => request.get(`${API}${ruta}`, { timeout: TOPE_MS });
export const post = (request: APIRequestContext, ruta: string, data: unknown) =>
  request.post(`${API}${ruta}`, { data, timeout: TOPE_MS });
export const patch = (request: APIRequestContext, ruta: string, data: unknown) =>
  request.patch(`${API}${ruta}`, { data, timeout: TOPE_MS });

// FECHAS. El restaurante demo abre de martes a domingo y cierra los lunes (ver seed.ts),
// en la zona horaria de Buenos Aires.
const ZONA = "America/Argentina/Buenos_Aires";

export function fechaEnDias(dias: number): string {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "2026-10-14"
  const [y, m, d] = hoy.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

const diaDeSemana = (fecha: string) => new Date(`${fecha}T00:00:00Z`).getUTCDay(); // 0 = domingo

// Un día abierto, dentro de la ventana de reserva y lejos de "hoy" (para no depender de
// la hora a la que corre la prueba).
export function proximoDiaAbierto(): string {
  for (let dias = 3; ; dias++) {
    const fecha = fechaEnDias(dias);
    if (diaDeSemana(fecha) !== 1) return fecha;
  }
}

export function proximoLunes(): string {
  for (let dias = 3; ; dias++) {
    const fecha = fechaEnDias(dias);
    if (diaDeSemana(fecha) === 1) return fecha;
  }
}

// TELÉFONO ÚNICO. Cada reserva de prueba usa un comensal propio: el nombre y el teléfono
// nunca se repiten entre corridas, así que una corrida no puede chocar con otra ni
// con datos reales. Formato local argentino (lo que tipea una persona); el sistema lo
// normaliza a +549…
export function telefonoLocalUnico(): string {
  return `11${String(Date.now()).slice(-8)}`;
}
export const aE164 = (local: string) => `+549${local}`;

export type Horario = { time: string; serviceId: string };

// Busca, entre los próximos días, uno con horarios para N personas y lo devuelve. Si QA no
// tiene ninguno, la prueba FALLA con un mensaje claro (no se saltea): casi seguro falta
// sembrar el restaurante demo.
export async function diaConHorarios(request: APIRequestContext, personas: number) {
  for (let dias = 3; dias <= 10; dias++) {
    const fecha = fechaEnDias(dias);
    const r = await get(request, `/api/v1/r/${SLUG}/availability?date=${fecha}&partySize=${personas}`);
    expect(r.status(), `availability de ${fecha}`).toBe(200);
    const { slots } = (await r.json()) as { slots: Horario[] };
    if (slots.length > 0) return { fecha, slots };
  }
  throw new Error(`Sin horarios en los próximos 10 días para "${SLUG}": ¿está sembrado el restaurante en este ambiente?`);
}
