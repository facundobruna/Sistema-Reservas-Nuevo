import { DateTime } from "luxon";
import type { db as dbClient } from "./client";
import { notification } from "./schema";

/**
 * Registra la confirmación (inmediata) y el recordatorio (`reminderHoursBefore`
 * antes de `startsAt`) en `notification`. El envío real (email vía EmailSender)
 * lo hace el worker de pg-boss en un milestone aparte — acá solo se agenda.
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
