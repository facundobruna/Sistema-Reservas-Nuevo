import { and, count, eq, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant, subscription } from "@/db/schema";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";
import { getMonthlyPriceArs } from "@/lib/billing/mercadopago";
import { superadminStatsQuerySchema } from "@/lib/validation/superadmin";

export async function GET(request: Request) {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = superadminStatsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const rangeStart = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const rangeEnd = new Date(`${parsed.data.to}T23:59:59.999Z`);

  const [[{ activeCount }], [{ signups }], [{ cancellations }]] = await Promise.all([
    db.select({ activeCount: count() }).from(subscription).where(eq(subscription.status, "active")),
    db
      .select({ signups: count() })
      .from(restaurant)
      .where(and(gte(restaurant.createdAt, rangeStart), lt(restaurant.createdAt, rangeEnd))),
    db
      .select({ cancellations: count() })
      .from(subscription)
      .where(and(eq(subscription.status, "canceled"), gte(subscription.updatedAt, rangeStart), lt(subscription.updatedAt, rangeEnd))),
  ]);

  // Snapshot simple, no un BI: MRR actual (suscripciones activas × precio) + altas/cancelaciones del rango pedido.
  const price = getMonthlyPriceArs();

  return NextResponse.json({
    from: parsed.data.from,
    to: parsed.data.to,
    stats: {
      mrr: activeCount * price,
      activeSubscriptions: activeCount,
      signups,
      cancellations,
    },
  });
}
