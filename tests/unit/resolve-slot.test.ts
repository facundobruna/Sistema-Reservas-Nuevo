import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { resolveSlot } from "@/lib/availability";
import type { ShiftInput, SeatingUnitInput, ActiveReservationInput } from "@/lib/availability";

const TZ = "America/Argentina/Buenos_Aires";
const DATE = "2026-07-20";
const DAY_OF_WEEK = DateTime.fromISO(DATE, { zone: TZ }).weekday % 7;
const SERVICE_ID = "service-1";

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
    zoneId: "zone-a",
    minCapacity: 1,
    maxCapacity: 4,
    mesaIds: ["mesa-1"],
    ...overrides,
  };
}

describe("resolveSlot", () => {
  it("devuelve serviceId, endsAt y las unidades elegibles best-fit para un horario válido", () => {
    const small = unit({ id: "small", maxCapacity: 2, mesaIds: ["mesa-1"] });
    const large = unit({ id: "large", maxCapacity: 6, mesaIds: ["mesa-2"] });

    const result = resolveSlot({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [large, small],
      activeReservations: [],
      exception: null,
      startsAt: iso("20:00"),
    });

    expect(result).not.toBeNull();
    expect(result?.serviceId).toBe(SERVICE_ID);
    expect(result?.endsAt).toBe(iso("21:30"));
    expect(result?.eligibleUnits.map((u) => u.id)).toEqual(["small", "large"]);
  });

  it("devuelve null si el horario pedido no es un candidato real (no matchea ningún turno)", () => {
    const result = resolveSlot({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [unit()],
      activeReservations: [],
      exception: null,
      startsAt: iso("20:15"), // no cae en un múltiplo de slot_interval_min=30
    });

    expect(result).toBeNull();
  });

  it("devuelve null si el pacing_cap ya está copado para ese horario", () => {
    const busy: ActiveReservationInput = {
      mesaIds: ["mesa-2"],
      startsAt: iso("20:00"),
      endsAt: iso("21:30"),
      partySize: 6,
    };

    const result = resolveSlot({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift({ pacingCap: 6 })],
      seatingUnits: [unit()],
      activeReservations: [busy],
      exception: null,
      startsAt: iso("20:00"),
    });

    expect(result).toBeNull();
  });

  it("devuelve null si el día está cerrado por excepción", () => {
    const result = resolveSlot({
      date: DATE,
      partySize: 2,
      timezone: TZ,
      shifts: [rollingShift()],
      seatingUnits: [unit()],
      activeReservations: [],
      exception: { kind: "closed", startTime: null, endTime: null },
      startsAt: iso("20:00"),
    });

    expect(result).toBeNull();
  });
});
