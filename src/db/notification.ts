import { and, eq, lte } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db as dbClient } from "./client";
import { customer, notification, reservation, restaurant, staffUser } from "./schema";

/**
 * Registra la confirmación (inmediata) y el recordatorio (`reminderHoursBefore`
 * antes de `startsAt`) en `notification`. El envío real (email vía EmailSender)
 * lo hace el worker de pg-boss (ver src/jobs/worker.ts) — acá solo se agenda.
 */
export async function scheduleReservationNotifications(
  db: typeof dbClient,
  params: { reservationId: string; startsAt: string; reminderHoursBefore: number },
) {
  const reminderAt = DateTime.fromISO(params.startsAt).minus({ hours: params.reminderHoursBefore });

  await db.insert(notification).values([
    {
      reservationId: params.reservationId,
      type: "confirmation",
      channel: "email",
      status: "scheduled",
      scheduledFor: new Date(),
    },
    {
      reservationId: params.reservationId,
      type: "reminder",
      channel: "email",
      status: "scheduled",
      scheduledFor: reminderAt.toJSDate(),
    },
  ]);
}

// Reintentos acotados: un email que falla 5 veces seguidas (~5 corridas del
// worker) se marca failed y deja de reintentarse.
const MAX_ATTEMPTS = 5;

export type NotificationType = "confirmation" | "reminder" | "staff_new" | "staff_cancelled";

export type DueNotification = {
  id: string;
  type: NotificationType;
  attempts: number;
  reservationId: string;
  startsAt: Date;
  endsAt: Date;
  partySize: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string;
  restaurantId: string;
  restaurantName: string;
  restaurantTimezone: string;
  restaurantSlug: string;
  restaurantSettings: unknown;
};

/** Notificaciones agendadas cuyo momento ya llegó — lo que el worker tiene que mandar ahora. */
export async function findDueNotifications(db: typeof dbClient, limit = 20): Promise<DueNotification[]> {
  return db
    .select({
      id: notification.id,
      type: notification.type,
      attempts: notification.attempts,
      reservationId: reservation.id,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      partySize: reservation.partySize,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantTimezone: restaurant.timezone,
      restaurantSlug: restaurant.slug,
      restaurantSettings: restaurant.settings,
    })
    .from(notification)
    .innerJoin(reservation, eq(reservation.id, notification.reservationId))
    .innerJoin(customer, eq(customer.id, reservation.customerId))
    .innerJoin(restaurant, eq(restaurant.id, reservation.restaurantId))
    .where(and(eq(notification.status, "scheduled"), lte(notification.scheduledFor, new Date())))
    .limit(limit);
}

/** Avisa al restaurante (no al comensal) de una reserva nueva o cancelada — misma cola/reintentos
 *  que confirmation/reminder, se agenda para "ahora" igual que la confirmación. */
export async function scheduleStaffAlert(
  db: typeof dbClient,
  params: { reservationId: string; type: "staff_new" | "staff_cancelled" },
) {
  await db.insert(notification).values({
    reservationId: params.reservationId,
    type: params.type,
    channel: "email",
    status: "scheduled",
    scheduledFor: new Date(),
  });
}

/** settings.notifyEmail si está configurado; si no, el email del owner (siempre existe). */
export async function resolveStaffAlertEmail(
  db: typeof dbClient,
  restaurantId: string,
  settings: { notifyEmail?: string },
): Promise<string | null> {
  if (settings.notifyEmail) return settings.notifyEmail;
  const [owner] = await db
    .select({ email: staffUser.email })
    .from(staffUser)
    .where(and(eq(staffUser.restaurantId, restaurantId), eq(staffUser.role, "owner")))
    .limit(1);
  return owner?.email ?? null;
}

export async function markNotificationSent(db: typeof dbClient, id: string) {
  await db
    .update(notification)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(notification.id, id));
}

/** Sin email al que mandar (es opcional en la reserva) — no tiene sentido reintentar. */
export async function markNotificationSkipped(db: typeof dbClient, id: string) {
  await db.update(notification).set({ status: "failed", attempts: MAX_ATTEMPTS }).where(eq(notification.id, id));
}

export async function recordNotificationFailure(db: typeof dbClient, id: string, currentAttempts: number) {
  const attempts = currentAttempts + 1;
  await db
    .update(notification)
    .set({ attempts, status: attempts >= MAX_ATTEMPTS ? "failed" : "scheduled" })
    .where(eq(notification.id, id));
}
