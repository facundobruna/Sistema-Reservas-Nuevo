import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { computeAvailability } from "@/lib/availability";
import type { ScheduleExceptionInput, SeatingUnitInput, ShiftInput } from "@/lib/availability";

const TZ = "America/Argentina/Buenos_Aires";
const DATE = "2026-07-20";
const DAY_OF_WEEK = DateTime.fromISO(DATE, { zone: TZ }).weekday % 7;

/** El instante UTC (string ISO) de las `hora` locales del día de prueba. */
function iso(hora: string): string {
  return DateTime.fromISO(`${DATE}T${hora}`, { zone: TZ }).toUTC().toISO()!;
}

// El turno normal de este restaurante: cena de 20:00 a 23:00, un horario cada 30 min, mesas de 90 min.
const turnoDeCena: ShiftInput = {
  id: "shift-1",
  serviceId: "service-1",
  zoneId: null,
  dayOfWeek: DAY_OF_WEEK,
  startTime: "20:00",
  endTime: "23:00",
  slotIntervalMin: 30,
  turnDurationMin: 90,
  seatingMode: "rolling",
  fixedTimes: null,
  pacingCap: null,
  bufferMin: 0,
  overbookingPercent: 0,
};

const mesa: SeatingUnitInput = { id: "unit-1", zoneId: "zone-a", minCapacity: 1, maxCapacity: 4, mesaIds: ["mesa-1"] };

function horariosDisponibles(exception: ScheduleExceptionInput | null): string[] {
  return computeAvailability({
    date: DATE,
    partySize: 2,
    timezone: TZ,
    shifts: [turnoDeCena],
    seatingUnits: [mesa],
    activeReservations: [],
    exception,
  }).map((slot) => slot.time);
}

describe("computeAvailability: excepción de horario especial (un día que abre distinto)", () => {
  it("reemplaza el horario del turno por el de la excepción", () => {
    // Arrange: ese día el restaurante abre solo de 12:00 a 15:00 (por ejemplo, un feriado).
    const horarioEspecial: ScheduleExceptionInput = { kind: "special_hours", startTime: "12:00", endTime: "15:00" };

    // Act
    const horarios = horariosDisponibles(horarioEspecial);

    // Assert: el último horario es 13:30, porque la mesa de 90 min tiene que terminar a las 15:00.
    expect(horarios).toEqual([iso("12:00"), iso("12:30"), iso("13:00"), iso("13:30")]);
  });

  it.each([
    ["sin hora de inicio", { kind: "special_hours", startTime: null, endTime: "15:00" }],
    ["sin hora de fin", { kind: "special_hours", startTime: "12:00", endTime: null }],
    ["sin ninguna de las dos", { kind: "special_hours", startTime: null, endTime: null }],
  ] as [string, ScheduleExceptionInput][])(
    "si el horario especial viene incompleto (%s), conserva el horario normal del turno",
    (_descripcion, excepcionIncompleta) => {
      // Act
      const horarios = horariosDisponibles(excepcionIncompleta);

      // Assert: no se inventa un horario a medias; rige el turno de 20:00 a 23:00.
      expect(horarios[0]).toBe(iso("20:00"));
      expect(horarios.at(-1)).toBe(iso("21:30"));
    },
  );
});
