import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { computeAvailability } from "@/lib/availability";
import type { ActiveReservationInput, ScheduleExceptionInput, SeatingUnitInput, ShiftInput } from "@/lib/availability";

const TZ = "America/Argentina/Buenos_Aires";
const DATE = "2026-07-20";
const DAY_OF_WEEK = DateTime.fromISO(DATE, { zone: TZ }).weekday % 7;

const SERVICE_ID = "service-1";
const ZONE_A = "zone-a";
const ZONE_B = "zone-b";

function iso(time: string): string {
  return DateTime.fromISO(`${DATE}T${time}`, { zone: TZ }).toUTC().toISO()!;
}

function rollingShift(overrides: Partial<ShiftInput> = {}): ShiftInput {
  return {
    id: "shift-1",
    serviceId: SERVICE_ID,
    zoneId: null,
    dayOfWeek: DAY_OF_WEEK,
    startTime: "20:00",
    endTime: "23:00",
    slotIntervalMin: 30,
    turnDurationMin: 90,
    seatingMode: "rolling",
    fixedTimes: null,
    pacingCap: null,
    ...overrides,
  };
}

function unit(overrides: Partial<SeatingUnitInput> = {}): SeatingUnitInput {
  return {
    id: "unit-1",
    zoneId: ZONE_A,
    minCapacity: 1,
    maxCapacity: 4,
    mesaIds: ["mesa-1"],
    ...overrides,
  };
}

function reservation(overrides: Partial<ActiveReservationInput> = {}): ActiveReservationInput {
  return {
    mesaIds: ["mesa-1"],
    startsAt: iso("20:00"),
    endsAt: iso("21:30"),
    partySize: 2,
    ...overrides,
  };
}

describe("computeAvailability", () => {
  it("día cerrado: devuelve vacío sin importar los turnos", () => {
    const exception: ScheduleExceptionInput = { kind: "closed", startTime: null, endTime: null };
    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [unit()],
      activeReservations: [],
      exception,
    });
    expect(result).toEqual([]);
  });

  it("sin mesas que entren para el partySize: devuelve vacío", () => {
    const result = computeAvailability({
      date: DATE,
      partySize: 10,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [unit({ minCapacity: 1, maxCapacity: 4 })],
      activeReservations: [],
      exception: null,
    });
    expect(result).toEqual([]);
  });

  it("solapamiento exacto: el rango es semiabierto — tocarse en el borde no bloquea, solaparse sí", () => {
    // Reserva existente 20:00–21:30 en mesa-1 (única mesa del único unit).
    const existing = reservation({ startsAt: iso("20:00"), endsAt: iso("21:30") });

    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift({ slotIntervalMin: 30, turnDurationMin: 90 })],
      seatingUnits: [unit()],
      activeReservations: [existing],
      exception: null,
    });

    const times = result.map((s) => s.time);
    // 20:00 solapa directo con la reserva existente -> no disponible.
    expect(times).not.toContain(iso("20:00"));
    // 21:30 arranca justo cuando termina la reserva existente (borde tocando) -> SÍ disponible.
    expect(times).toContain(iso("21:30"));
    // 21:00 empezaría dentro de la reserva existente (20:00-21:30) -> no disponible.
    expect(times).not.toContain(iso("21:00"));
  });

  it("pacing bloquea aunque haya mesas libres", () => {
    // Dos mesas distintas, ambas libres. Pero el pacing_cap del turno ya está
    // copado por otra reserva en la misma ventana de slot_interval_min.
    const busyElsewhereReservation = reservation({
      mesaIds: ["mesa-2"],
      startsAt: iso("20:00"),
      endsAt: iso("21:30"),
      partySize: 5,
    });

    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift({ pacingCap: 6, slotIntervalMin: 30 })],
      seatingUnits: [unit({ id: "unit-1", mesaIds: ["mesa-1"] }), unit({ id: "unit-2", mesaIds: ["mesa-2"] })],
      activeReservations: [busyElsewhereReservation],
      exception: null,
    });

    // 5 (ya ocupados) + 2 (este pedido) = 7 > pacingCap 6 -> 20:00 bloqueado
    // pese a que mesa-1 está completamente libre.
    expect(result.map((s) => s.time)).not.toContain(iso("20:00"));
  });

  it("best-fit: si la unidad más chica está ocupada, sigue buscando en unidades más grandes", () => {
    const smallUnit = unit({ id: "small", mesaIds: ["mesa-1"], minCapacity: 1, maxCapacity: 2 });
    const largeUnit = unit({ id: "large", mesaIds: ["mesa-2"], minCapacity: 1, maxCapacity: 6 });
    const smallUnitBusy = reservation({ mesaIds: ["mesa-1"], startsAt: iso("20:00"), endsAt: iso("21:30") });

    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [smallUnit, largeUnit],
      activeReservations: [smallUnitBusy],
      exception: null,
    });

    // La unidad chica (mejor fit) está ocupada a las 20:00, pero la grande
    // está libre: el horario debe seguir apareciendo disponible.
    expect(result.map((s) => s.time)).toContain(iso("20:00"));
  });

  it("combos: requieren que TODAS sus mesas estén libres", () => {
    const combo = unit({ id: "combo-1", mesaIds: ["mesa-1", "mesa-2"], minCapacity: 5, maxCapacity: 8 });

    const baseInput = {
      date: DATE,
      partySize: 6,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [combo],
      exception: null,
    } as const;

    const bothFree = computeAvailability({ ...baseInput, activeReservations: [] });
    expect(bothFree.map((s) => s.time)).toContain(iso("20:00"));

    const oneMesaBusy = computeAvailability({
      ...baseInput,
      activeReservations: [reservation({ mesaIds: ["mesa-2"], startsAt: iso("20:00"), endsAt: iso("21:30") })],
    });
    expect(oneMesaBusy.map((s) => s.time)).not.toContain(iso("20:00"));
  });

  it("modo fixed: solo devuelve los horarios explícitos, no un rango continuo", () => {
    const fixedShift = rollingShift({
      seatingMode: "fixed",
      fixedTimes: ["20:00", "20:30", "21:00"],
      turnDurationMin: 90,
    });

    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [fixedShift],
      seatingUnits: [unit()],
      activeReservations: [],
      exception: null,
    });

    const times = result.map((s) => s.time).sort();
    expect(times).toEqual([iso("20:00"), iso("20:30"), iso("21:00")].sort());
    // 20:15 nunca podría aparecer: no es uno de los fixed_times.
    expect(times).not.toContain(iso("20:15"));
  });

  it("filtra por zona cuando se pide zoneId", () => {
    const unitZoneA = unit({ id: "a", zoneId: ZONE_A, mesaIds: ["mesa-a"] });
    const unitZoneB = unit({ id: "b", zoneId: ZONE_B, mesaIds: ["mesa-b"] });

    const result = computeAvailability({
      date: DATE,
      partySize: 2,
      zoneId: ZONE_B,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [unitZoneA, unitZoneB],
      activeReservations: [reservation({ mesaIds: ["mesa-b"], startsAt: iso("20:00"), endsAt: iso("21:30") })],
      exception: null,
    });

    // La única unidad de la zona pedida (B) está ocupada -> sin disponibilidad,
    // aunque la zona A esté libre.
    expect(result.map((s) => s.time)).not.toContain(iso("20:00"));
  });
});
