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
import { expirePastWaitlistEntries, findActiveWaitingEntries, markWaitlistNotified } from "../db/waitlist";
import { findSubscriptionsWithMpPreapproval, updateSubscriptionFromMp } from "../db/subscription";
import { computeAvailability, excludePastSlots, loadAvailabilityInput } from "../lib/availability";
import { fetchPreapproval, mapMpStatusToSubscriptionStatus } from "../lib/billing/mercadopago";
import { getEmailSender } from "../lib/email";
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
      const content = buildNotificationEmail({
        type: n.type,
        restaurantName: n.restaurantName,
        restaurantTimezone: n.restaurantTimezone,
        startsAt: n.startsAt,
        partySize: n.partySize,
        customerName: n.customerName,
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
    `Worker corriendo: notificaciones + lista de espera cada 1 min, reconciliación de suscripciones a diario.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
