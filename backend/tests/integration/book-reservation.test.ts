import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { createMesa } from "@/db/mesa";
import { customer, restaurant, service, shift, zone } from "@/db/schema";
import { bookReservation } from "@/lib/reservation/book-reservation";

const TZ = "America/Argentina/Buenos_Aires";
const CONCURRENT_REQUESTS = 10;

describe("bookReservation — concurrencia", () => {
  let restaurantId: string;
  let startsAt: string;
  let customerIds: string[] = [];
  const runId = Date.now() % 100000;

  beforeAll(async () => {
    const slug = `concurrency-test-${randomUUID()}`;
    const [r] = await db.insert(restaurant).values({ slug, name: "Test Concurrency", timezone: TZ }).returning();
    restaurantId = r.id;

    const [z] = await db.insert(zone).values({ restaurantId, name: "Salón" }).returning();
    // Única mesa que entra para partySize=2 -> único seating_unit candidato.
    await createMesa(db, { restaurantId, zoneId: z.id, name: "M1", minCapacity: 1, maxCapacity: 2 });

    const [s] = await db.insert(service).values({ restaurantId, name: "Cena" }).returning();

    // Turno bien amplio (todo el día) para no depender de qué día de la semana es hoy.
    const dayOfWeek = new Date().getDay();
    await db.insert(shift).values({
      restaurantId,
      serviceId: s.id,
      dayOfWeek,
      startTime: "00:00",
      endTime: "23:59",
      slotIntervalMin: 15,
      turnDurationMin: 60,
      seatingMode: "rolling",
      pacingCap: null,
    });

    // Un horario todavía no pasado, alineado a slot_interval_min=15 (bookReservation
    // rechaza cualquier startsAt que ya haya pasado — no puede ser un valor fijo del
    // mediodía, se rompería según a qué hora del día corra el test).
    const now = DateTime.now().setZone(TZ);
    const minutesFromNow = Math.ceil((now.minute + 20) / 15) * 15;
    startsAt = now.set({ minute: 0, second: 0, millisecond: 0 }).plus({ minutes: minutesFromNow }).toUTC().toISO();
  });

  afterAll(async () => {
    await db.delete(restaurant).where(eq(restaurant.id, restaurantId));
    if (customerIds.length > 0) {
      await db.delete(customer).where(inArray(customer.id, customerIds));
    }
  });

  it("bajo N requests paralelos por el mismo horario y la misma mesa, solo uno gana", async () => {
    const customers = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
        db
          .insert(customer)
          .values({ phone: `+5491${runId}${String(i).padStart(3, "0")}` })
          .returning()
          .then(([c]) => c),
      ),
    );
    customerIds = customers.map((c) => c.id);

    const results = await Promise.all(
      customers.map((c) =>
        bookReservation(db, {
          restaurantId,
          timezone: TZ,
          customerId: c.id,
          partySize: 2,
          startsAt,
          source: "web",
        }),
      ),
    );

    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);

    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(CONCURRENT_REQUESTS - 1);
    for (const loss of losses) {
      if (!loss.ok) expect(loss.error).toBe("sin_disponibilidad");
    }
  });
});
