import { describe, expect, it } from "vitest";
import {
  classifyCancellation,
  type CancellationKind,
} from "@/lib/reservation/cancellation-policy";

// La reserva es el 2026-07-20 a las 21:00 UTC. Cada caso fija CUÁNDO se canceló
// y el resultado esperado con la política por defecto (24 h gratis).
const inicio = new Date("2026-07-20T21:00:00Z");

describe("classifyCancellation", () => {
  it.each<[string, string, CancellationKind]>([
    ["2 días antes", "2026-07-18T21:00:00Z", "free"],
    ["justo 24 h antes (el borde es gratis)", "2026-07-19T21:00:00Z", "free"],
    ["24 h menos 1 minuto antes", "2026-07-19T21:01:00Z", "late"],
    ["1 minuto antes de empezar", "2026-07-20T20:59:00Z", "late"],
    ["justo a la hora de la reserva", "2026-07-20T21:00:00Z", "after_start"],
    ["después de la hora", "2026-07-20T22:30:00Z", "after_start"],
  ])("cancelar %s → %s", (_descripcion, canceladaEn, esperado) => {
    // Arrange: la reserva y el instante de la cancelación vienen de la tabla.
    // Act
    const resultado = classifyCancellation(inicio, new Date(canceladaEn));
    // Assert
    expect(resultado).toBe(esperado);
  });

  it("respeta una ventana gratis distinta de la de por defecto", () => {
    // Arrange: 5 horas antes de empezar.
    const canceladaEn = new Date("2026-07-20T16:00:00Z");
    // Act
    const conVentanaCorta = classifyCancellation(inicio, canceladaEn, 4);
    const conVentanaLarga = classifyCancellation(inicio, canceladaEn, 6);
    // Assert: con 4 h gratis alcanza; con 6 h ya es tardía.
    expect(conVentanaCorta).toBe("free");
    expect(conVentanaLarga).toBe("late");
  });

  it("rechaza una ventana gratis negativa", () => {
    // Arrange / Act / Assert
    expect(() => classifyCancellation(inicio, new Date("2026-07-19T00:00:00Z"), -1)).toThrow(
      "freeHours no puede ser negativo",
    );
  });
});
