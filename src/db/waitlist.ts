import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { customer, restaurant, waitlistEntry } from "./schema";

export type JoinWaitlistInput = {
  restaurantId: string;
  customerId: string;
  date: string;
  partySize: number;
};

/** Idempotente: si ya está anotado esperando lo mismo, no duplica la fila. */
export async function joinWaitlist(db: typeof dbClient, input: JoinWaitlistInput) {
  const [existing] = await db
    .select()
    .from(waitlistEntry)
    .where(
      and(
        eq(waitlistEntry.restaurantId, input.restaurantId),
        eq(waitlistEntry.customerId, input.customerId),
        eq(waitlistEntry.date, input.date),
        eq(waitlistEntry.partySize, input.partySize),
        eq(waitlistEntry.status, "waiting"),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(waitlistEntry)
    .values({
      restaurantId: input.restaurantId,
      customerId: input.customerId,
      date: input.date,
      partySize: input.partySize,
    })
    .returning();
  return created;
}

/** Si el comensal terminó reservando ese día por su cuenta, la espera ya no tiene sentido. */
export async function markWaitlistBooked(
  db: typeof dbClient,
  params: { restaurantId: string; customerId: string; date: string },
) {
  await db
    .update(waitlistEntry)
    .set({ status: "booked" })
    .where(
      and(
        eq(waitlistEntry.restaurantId, params.restaurantId),
        eq(waitlistEntry.customerId, params.customerId),
        eq(waitlistEntry.date, params.date),
      ),
    );
}

export type WaitingEntry = {
  id: string;
  date: string;
  partySize: number;
  zoneId: string | null;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  restaurantTimezone: string;
  customerEmail: string | null;
};

/** Entradas 'waiting' cuya fecha no pasó todavía — lo que el worker tiene que evaluar. */
export async function findActiveWaitingEntries(db: typeof dbClient, todayIso: string): Promise<WaitingEntry[]> {
  return db
    .select({
      id: waitlistEntry.id,
      date: waitlistEntry.date,
      partySize: waitlistEntry.partySize,
      zoneId: waitlistEntry.zoneId,
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      restaurantTimezone: restaurant.timezone,
      customerEmail: customer.email,
    })
    .from(waitlistEntry)
    .innerJoin(restaurant, eq(restaurant.id, waitlistEntry.restaurantId))
    .innerJoin(customer, eq(customer.id, waitlistEntry.customerId))
    .where(and(eq(waitlistEntry.status, "waiting"), gte(waitlistEntry.date, todayIso)));
}

export async function markWaitlistNotified(db: typeof dbClient, id: string) {
  await db.update(waitlistEntry).set({ status: "notified", notifiedAt: new Date() }).where(eq(waitlistEntry.id, id));
}

/** Housekeeping: entradas cuya fecha ya pasó sin que nadie reservara (esperando o ya avisadas). */
export async function expirePastWaitlistEntries(db: typeof dbClient, todayIso: string) {
  await db
    .update(waitlistEntry)
    .set({ status: "expired" })
    .where(and(inArray(waitlistEntry.status, ["waiting", "notified"]), lt(waitlistEntry.date, todayIso)));
}
