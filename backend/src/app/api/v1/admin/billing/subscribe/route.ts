import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant, staffUser, subscription } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { createSubscriptionCheckout } from "@/lib/billing/mercadopago";

export async function POST() {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const [restaurantRow] = await db
    .select()
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [staff] = await db.select().from(staffUser).where(eq(staffUser.id, auth.session.staffId)).limit(1);

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  let checkout: Awaited<ReturnType<typeof createSubscriptionCheckout>>;
  try {
    checkout = await createSubscriptionCheckout({
      payerEmail: staff?.email ?? auth.session.email,
      restaurantSlug: restaurantRow.slug,
      backUrl: `${appUrl}/admin/${restaurantRow.slug}/billing`,
    });
  } catch (err) {
    console.error("[billing] fallo creando el checkout de Mercado Pago:", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  await db
    .update(subscription)
    .set({ mpPreapprovalId: checkout.preapprovalId, updatedAt: new Date() })
    .where(eq(subscription.restaurantId, restaurantRow.id));

  return NextResponse.json({ initPoint: checkout.initPoint });
}
