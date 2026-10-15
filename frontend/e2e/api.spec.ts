import { expect, test } from "@playwright/test";
import { SLUG, aE164, diaConHorarios, get, patch, post, proximoLunes, telefonoLocalUnico } from "./support";

// SUITE DE INTEGRACIÓN (TP7). Le habla a la API de QA ya desplegada, con su base de datos
// de verdad, sin navegador y sin ningún doble en el medio. Usa el fixture `request` de
// Playwright, que es un cliente HTTP: no abre ningún browser.

const reservas = `/api/v1/r/${SLUG}/reservations`;

test("una reserva se crea, se consulta y se cancela, y queda cancelada", async ({ request }) => {
  const { slots } = await diaConHorarios(request, 2);
  let id: string | undefined;

  try {
    // ALTA: un comensal propio, que no se repite entre corridas.
    const alta = await post(request, reservas, {
      startsAt: slots[0].time,
      partySize: 2,
      customer: { name: `integracion ${Date.now()}`, phone: aE164(telefonoLocalUnico()) },
    });
    expect(alta.status()).toBe(201);
    const creada = (await alta.json()).reservation;
    id = creada.id;
    expect(creada.partySize).toBe(2);

    // VERIFICACIÓN: la base la guardó de verdad (la sesión de comensal viaja en la cookie
    // que la propia alta dejó en este contexto).
    const consulta = await get(request, `${reservas}/${id}`);
    expect(consulta.status()).toBe(200);
    expect((await consulta.json()).reservation.id).toBe(id);

    // BAJA: la API no borra reservas, las cancela.
    const baja = await patch(request, `${reservas}/${id}`, { status: "cancelled" });
    expect(baja.status()).toBe(200);

    // Y se comprueba: la misma reserva figura ahora como cancelada.
    const despues = await get(request, `${reservas}/${id}`);
    expect((await despues.json()).reservation.status).toBe("cancelled");
  } finally {
    // Si algo falló a mitad de camino, no dejar la reserva viva en QA.
    if (id) await patch(request, `${reservas}/${id}`, { status: "cancelled" }).catch(() => {});
  }
});

test("una reserva con 0 comensales se rechaza con 400 y no cambia la disponibilidad", async ({ request }) => {
  const { fecha, slots } = await diaConHorarios(request, 2);
  const disponibilidad = `/api/v1/r/${SLUG}/availability?date=${fecha}&partySize=2`;
  const antes = await (await get(request, disponibilidad)).json();

  const rechazo = await post(request, reservas, {
    startsAt: slots[0].time,
    partySize: 0,
    customer: { name: "integracion invalida", phone: aE164(telefonoLocalUnico()) },
  });
  expect(rechazo.status()).toBe(400);
  expect((await rechazo.json()).error).toBe("invalid_input");

  // No se creó nada: la disponibilidad es idéntica y no se abrió ninguna sesión de comensal.
  expect(await (await get(request, disponibilidad)).json()).toEqual(antes);
  expect((await get(request, "/api/v1/me/reservations")).status()).toBe(401);
});

test("la API devuelve horarios un día abierto y ninguno un día cerrado", async ({ request }) => {
  const { slots } = await diaConHorarios(request, 2);
  expect(slots.length).toBeGreaterThan(0);
  for (const horario of slots) {
    expect(horario.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(horario.serviceId).toBeTruthy();
  }

  // El restaurante demo cierra los lunes: la API lo calcula leyendo turnos y mesas de la base.
  const lunes = await get(request, `/api/v1/r/${SLUG}/availability?date=${proximoLunes()}&partySize=2`);
  expect(lunes.status()).toBe(200);
  expect((await lunes.json()).slots).toEqual([]);
});
