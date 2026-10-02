import { describe, expect, it } from "vitest";
import { canTransition, type ReservationStatus } from "@/lib/reservation/status-machine";

describe("canTransition: máquina de estados de la reserva", () => {
  it.each<[ReservationStatus, ReservationStatus]>([
    ["pending", "confirmed"],
    ["pending", "seated"],
    ["pending", "cancelled"],
    ["pending", "no_show"],
    ["confirmed", "seated"],
    ["confirmed", "no_show"],
    ["seated", "completed"],
    ["seated", "cancelled"],
  ])("permite pasar de %s a %s", (desde, hacia) => {
    // Act
    const permitido = canTransition(desde, hacia);

    // Assert
    expect(permitido).toBe(true);
  });

  it.each<[ReservationStatus, ReservationStatus]>([
    // Una vez sentados ya sabemos que vinieron: no puede pasar a no_show.
    ["seated", "no_show"],
    // No se retrocede.
    ["seated", "pending"],
    ["seated", "confirmed"],
    // No se completa una reserva a la que nadie se sentó.
    ["pending", "completed"],
    ["confirmed", "completed"],
    // Quedarse en el mismo estado no es una transición.
    ["pending", "pending"],
    // Los estados terminales no tienen salida.
    ["completed", "cancelled"],
    ["completed", "pending"],
    ["cancelled", "confirmed"],
    ["no_show", "seated"],
  ])("rechaza pasar de %s a %s", (desde, hacia) => {
    // Act
    const permitido = canTransition(desde, hacia);

    // Assert
    expect(permitido).toBe(false);
  });
});
