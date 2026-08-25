import { eq, isNotNull } from "drizzle-orm";
import { DateTime } from "luxon";
import type { db as dbClient } from "./client";
import { subscription } from "./schema";

const TRIAL_DAYS = 14;

export type Subscription = typeof subscription.$inferSelect;

// Acepta también el `trx` de una transacción en curso (mismo truco que db/mesa.ts):
// createRestaurantOnboarding llama a esto DENTRO de su propia transacción.
type Queryable = typeof dbClient | Parameters<Parameters<typeof dbClient.transaction>[0]>[0];

/** Se crea en la misma transacción que el alta del restaurante (ver db/onboarding.ts). */
export async function createTrialSubscription(db: Queryable, restaurantId: string) {
  const [created] = await db
    .insert(subscription)
    .values({
      restaurantId,
      status: "trialing",
      trialEndsAt: DateTime.now().plus({ days: TRIAL_DAYS }).toJSDate(),
    })
    .returning();
  return created;
}

export async function getSubscriptionByRestaurantId(db: typeof dbClient, restaurantId: string) {
  const [row] = await db.select().from(subscription).where(eq(subscription.restaurantId, restaurantId)).limit(1);
  return row ?? null;
}

/** Todas las que ya tienen un preapproval de Mercado Pago — lo que el worker reconcilia a diario. */
export async function findSubscriptionsWithMpPreapproval(db: typeof dbClient) {
  return db.select().from(subscription).where(isNotNull(subscription.mpPreapprovalId));
}

export async function updateSubscriptionFromMp(
  db: typeof dbClient,
  restaurantId: string,
  params: { status: Subscription["status"]; mpPreapprovalId?: string; currentPeriodEnd?: Date | null },
) {
  await db
    .update(subscription)
    .set({ ...params, updatedAt: new Date() })
    .where(eq(subscription.restaurantId, restaurantId));
}

export type PanelAccess = "ok" | "trial_expired" | "payment_required" | "suspended";

/**
 * Única fuente de verdad de si el panel del staff se bloquea. El flujo del
 * comensal (/r/{slug} y sus APIs) NUNCA llama a esto — el bloqueo es
 * exclusivo del panel, la reserva del comensal no se toca pase lo que pase.
 */
export function evaluatePanelAccess(params: { suspendedAt: Date | null; subscription: Subscription | null }): PanelAccess {
  if (params.suspendedAt) return "suspended";

  const sub = params.subscription;
  if (!sub) return "payment_required";

  if (sub.status === "active") return "ok";
  if (sub.status === "trialing") {
    if (sub.trialEndsAt && sub.trialEndsAt.getTime() < Date.now()) return "trial_expired";
    return "ok";
  }
  return "payment_required"; // past_due | canceled
}
