import "dotenv/config";
import { PgBoss } from "pg-boss";
import { drizzle } from "drizzle-orm/node-postgres";
import { DateTime } from "luxon";
import { Pool } from "pg";
import * as schema from "../db/schema";
import {
  findDueNotifications,
  markNotificationSent,
  markNotificationSkipped,
  recordNotificationFailure,
} from "../db/notification";
import { findOverdueConfirmedReservations, updateReservationStatus } from "../db/reservation";
import { expirePastWaitlistEntries, findActiveWaitingEntries, markWaitlistNotified } from "../db/waitlist";
import { findSubscriptionsWithMpPreapproval, updateSubscriptionFromMp } from "../db/subscription";
import { computeAvailability, excludePastSlots, loadAvailabilityInput } from "../lib/availability";
import { fetchPreapproval, mapMpStatusToSubscriptionStatus } from "../lib/billing/mercadopago";
import { getEmailSender } from "../lib/email";
import { createReservationActionToken } from "../lib/reservation/action-token";
import { buildReservationIcs } from "../lib/reservation/ics";
import { buildNotificationEmail } from "../lib/reservation/notification-email";

const QUEUE = "send-due-notifications";
const POLL_CRON = "* * * * *"; // cada 1 minuto
const RECONCILE_QUEUE = "reconcile-subscriptions";
const RECONCILE_CRON = "0 3 * * *"; // una vez al día, de madrugada
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

async function processDueNotifications(db: ReturnType<typeof drizzle<typeof schema>>) {
  const due = await findDueNotifications(db);
  if (due.length === 0) return;

  const sender = getEmailSender();
  for (const n of due) {
    if (!n.customerEmail) {
      await markNotificationSkipped(db, n.id);
      continue;
    }

    try {
      // Vence un rato después de que termina la reserva — no un TTL fijo corto
      // como el magic link, tiene que seguir sirviendo hasta público tarde.
      const tokenExpiresAt = DateTime.fromJSDate(n.endsAt).plus({ hours: 2 }).toJSDate();
      const actionToken = createReservationActionToken(n.reservationId, tokenExpiresAt);
      const cancelUrl = `${APP_URL}/r/${n.restaurantSlug}/reservations/${n.reservationId}/cancel?token=${actionToken}`;
      // "Confirmo que voy" solo tiene sentido ofrecerlo en el recordatorio, no
      // apenas se reserva (recién se está pidiendo confirmarla otra vez).
      const confirmUrl =
        n.type === "reminder"
          ? `${APP_URL}/api/v1/r/${n.restaurantSlug}/reservations/${n.reservationId}/confirm?token=${actionToken}`
          : undefined;

      const content = buildNotificationEmail({
        type: n.type,
        restaurantName: n.restaurantName,
        restaurantTimezone: n.restaurantTimezone,
        startsAt: n.startsAt,
        partySize: n.partySize,
        customerName: n.customerName,
        confirmUrl,
        cancelUrl,
      });

      // El .ics solo tiene sentido en la confirmación — el recordatorio no necesita repetirlo.
      const attachments =
        n.type === "confirmation"
          ? [
              {
                filename: "reserva.ics",
                content: Buffer.from(
                  buildReservationIcs({
                    reservationId: n.reservationId,
                    restaurantName: n.restaurantName,
                    startsAt: n.startsAt,
                    endsAt: n.endsAt,
                    partySize: n.partySize,
                  }),
                  "utf-8",
                ).toString("base64"),
              },
            ]
          : undefined;

      await sender.send({ to: n.customerEmail, ...content, attachments });
      await markNotificationSent(db, n.id);
    } catch (err) {
      console.error(`[worker] fallo enviando notificación ${n.id}:`, err);
      await recordNotificationFailure(db, n.id, n.attempts);
    }
  }
}

/**
 * Revisa la lista de espera: si ahora hay disponibilidad real para lo que
 * alguien estaba esperando, le avisa por email con el link para reservar.
 * No reserva nada por su cuenta — el que hace clic primero gana, como
 * siempre (bookReservation ya es seguro bajo concurrencia).
 */
async function processWaitlist(db: ReturnType<typeof drizzle<typeof schema>>) {
  const todayIso = DateTime.now().toUTC().toISODate()!;
  await expirePastWaitlistEntries(db, todayIso);

  const waiting = await findActiveWaitingEntries(db, todayIso);
  if (waiting.length === 0) return;

  const sender = getEmailSender();
  for (const entry of waiting) {
    if (!entry.customerEmail) continue;

    try {
      const input = await loadAvailabilityInput(db, {
        restaurantId: entry.restaurantId,
        timezone: entry.restaurantTimezone,
        date: entry.date,
        partySize: entry.partySize,
        zoneId: entry.zoneId ?? undefined,
      });
      const slots = excludePastSlots(computeAvailability(input));
      if (slots.length === 0) continue;

      const link = `${APP_URL}/r/${entry.restaurantSlug}?partySize=${entry.partySize}&date=${entry.date}`;
      const dateLabel = DateTime.fromISO(entry.date, { zone: entry.restaurantTimezone })
        .setLocale("es")
        .toFormat("cccc d LLL");
      await sender.send({
        to: entry.customerEmail,
        subject: `¡Se liberó un lugar en ${entry.restaurantName}!`,
        html: `<p>Hola,</p><p>Se abrió lugar para el <strong>${dateLabel}</strong> en <strong>${entry.restaurantName}</strong>. Reservá antes de que se ocupe: <a href="${link}">${link}</a></p>`,
        text: `Se abrió lugar para el ${dateLabel} en ${entry.restaurantName}. Reservá acá: ${link}`,
      });
      await markWaitlistNotified(db, entry.id);
    } catch (err) {
      console.error(`[worker] fallo revisando lista de espera ${entry.id}:`, err);
    }
  }
}

/**
 * No-show automático: si `autoNoShowMinutes` está configurado (apagado por
 * default) y pasó ese margen desde el horario de la reserva sin que nadie la
 * haya sentado, se marca no_show sola — reutiliza updateReservationStatus
 * tal cual (libera la mesa, suma al contador del cliente).
 */
async function processAutoNoShow(db: ReturnType<typeof drizzle<typeof schema>>) {
  const candidates = await findOverdueConfirmedReservations(db, new Date());
  for (const r of candidates) {
    const settings = r.restaurantSettings as { autoNoShowMinutes?: number | null };
    const minutes = settings.autoNoShowMinutes;
    if (!minutes) continue;

    const cutoff = DateTime.fromJSDate(r.startsAt).plus({ minutes });
    if (DateTime.now() < cutoff) continue;

    try {
      await updateReservationStatus(db, r.restaurantId, r.id, "no_show");
    } catch (err) {
      console.error(`[worker] fallo marcando no-show automático ${r.id}:`, err);
    }
  }
}

/**
 * Respaldo del webhook de Mercado Pago (que en local ni siquiera puede llegar,
 * localhost no es alcanzable desde afuera): una vez al día, re-consulta el
 * estado real de cada suscripción que ya tiene un preapproval y lo sincroniza.
 * Nunca confía en nada que no sea la respuesta de la API de MP.
 */
async function processSubscriptionReconciliation(db: ReturnType<typeof drizzle<typeof schema>>) {
  const subs = await findSubscriptionsWithMpPreapproval(db);
  for (const sub of subs) {
    if (!sub.mpPreapprovalId) continue;
    try {
      const preapproval = await fetchPreapproval(sub.mpPreapprovalId);
      const mappedStatus = mapMpStatusToSubscriptionStatus(preapproval.status);
      if (mappedStatus && mappedStatus !== sub.status) {
        await updateSubscriptionFromMp(db, sub.restaurantId, {
          status: mappedStatus,
          currentPeriodEnd: preapproval.next_payment_date ? new Date(preapproval.next_payment_date) : null,
        });
      }
    } catch (err) {
      console.error(`[worker] fallo reconciliando suscripción ${sub.id}:`, err);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida (revisá tu .env)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const boss = new PgBoss(process.env.DATABASE_URL);
  boss.on("error", (err) => console.error("[pg-boss]", err));
  await boss.start();

  await boss.createQueue(QUEUE);
  await boss.schedule(QUEUE, POLL_CRON);
  await boss.createQueue(RECONCILE_QUEUE);
  await boss.schedule(RECONCILE_QUEUE, RECONCILE_CRON);

  async function tick() {
    await processDueNotifications(db);
    await processWaitlist(db);
    await processAutoNoShow(db);
  }

  // Primera pasada inmediata: no esperar hasta el próximo tick del cron.
  await tick();
  await processSubscriptionReconciliation(db);

  await boss.work(QUEUE, async () => {
    await tick();
  });
  await boss.work(RECONCILE_QUEUE, async () => {
    await processSubscriptionReconciliation(db);
  });

  console.log(
    `Worker corriendo: notificaciones + lista de espera + no-show automático cada 1 min, reconciliación de suscripciones a diario.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
