import "dotenv/config";
import { PgBoss } from "pg-boss";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import {
  findDueNotifications,
  markNotificationSent,
  markNotificationSkipped,
  recordNotificationFailure,
} from "../db/notification";
import { buildNotificationEmail } from "../lib/reservation/notification-email";
import { getEmailSender } from "../lib/email";

const QUEUE = "send-due-notifications";
const POLL_CRON = "* * * * *"; // cada 1 minuto

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
      await sender.send({ to: n.customerEmail, ...content });
      await markNotificationSent(db, n.id);
    } catch (err) {
      console.error(`[worker] fallo enviando notificación ${n.id}:`, err);
      await recordNotificationFailure(db, n.id, n.attempts);
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

  // Primera pasada inmediata: no esperar hasta el próximo tick del cron.
  await processDueNotifications(db);

  await boss.work(QUEUE, async () => {
    await processDueNotifications(db);
  });

  console.log(`Worker de notificaciones corriendo (poll cada 1 min, cola "${QUEUE}").`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
