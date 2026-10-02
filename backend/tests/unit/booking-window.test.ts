import { describe, expect, it } from "vitest";
import type { AvailabilitySlot } from "@/lib/availability";
import { filterWithinBookingWindow, isWithinBookingWindow } from "@/lib/availability/now-filter";

const AHORA = new Date("2026-07-20T12:00:00.000Z");
const MINUTOS_POR_DIA = 24 * 60;
// El comensal tiene que reservar con al menos 1 hora de anticipación y hasta 7 días antes.
const VENTANA = { minAdvanceMinutes: 60, maxAdvanceDays: 7 };

/** El instante que queda `minutos` después de AHORA (negativo = antes), como string ISO. */
function enMinutos(minutos: number): string {
  return new Date(AHORA.getTime() + minutos * 60_000).toISOString();
}

describe("isWithinBookingWindow: ventana de reserva del comensal", () => {
  it.each([
    // Los bordes son lo importante: un `<` que pasa a `<=` (o un `>` a `>=`) se nota acá.
    ["justo en la anticipación mínima (60 min)", 60, true],
    ["un minuto antes de la anticipación mínima (59 min)", 59, false],
    ["ya pasado (hace 30 min)", -30, false],
    ["en el medio de la ventana (3 días)", 3 * MINUTOS_POR_DIA, true],
    ["justo en el tope máximo (7 días)", 7 * MINUTOS_POR_DIA, true],
    ["un minuto después del tope máximo (7 días y 1 min)", 7 * MINUTOS_POR_DIA + 1, false],
  ])("%s → aceptado: %s", (_descripcion, minutos, esperado) => {
    // Act
    const aceptado = isWithinBookingWindow(enMinutos(minutos), AHORA, VENTANA);

    // Assert
    expect(aceptado).toBe(esperado);
  });

  it("sin tope máximo (null) acepta una fecha muy lejana", () => {
    // Arrange
    const sinTope = { minAdvanceMinutes: 60, maxAdvanceDays: null };

    // Act
    const aceptado = isWithinBookingWindow(enMinutos(400 * MINUTOS_POR_DIA), AHORA, sinTope);

    // Assert
    expect(aceptado).toBe(true);
  });
});

describe("filterWithinBookingWindow", () => {
  it("se queda solo con los horarios que caen dentro de la ventana", () => {
    // Arrange
    const slot = (minutos: number): AvailabilitySlot => ({ time: enMinutos(minutos), serviceId: "servicio-1" });
    const muyPronto = slot(30);
    const valido = slot(120);
    const muyLejos = slot(8 * MINUTOS_POR_DIA);

    // Act
    const resultado = filterWithinBookingWindow([muyPronto, valido, muyLejos], AHORA, VENTANA);

    // Assert
    expect(resultado).toEqual([valido]);
  });
});
