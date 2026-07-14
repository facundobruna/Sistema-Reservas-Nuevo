import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { logAudit } from "@/db/audit";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";
import { featureFlagToggleSchema } from "@/lib/validation/superadmin";

type Params = { params: Promise<{ id: string }> };

/**
 * Mecanismo genérico de feature flags por tenant (guardado en restaurant.settings.featureFlags).
 * Esta pasada entrega la herramienta; hoy no hay ninguna feature real del producto que
 * lea un flag — es la superficie para cuando haga falta, no una feature concreta.
 */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = featureFlagToggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [current] = await db.select({ settings: restaurant.settings }).from(restaurant).where(eq(restaurant.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const settings = current.settings as { featureFlags?: Record<string, boolean> };
  const featureFlags = { ...settings.featureFlags, [parsed.data.flag]: parsed.data.enabled };

  const [updated] = await db
    .update(restaurant)
    .set({ settings: { ...settings, featureFlags }, updatedAt: new Date() })
    .where(eq(restaurant.id, id))
    .returning();

  await logAudit(db, {
    superadminId: auth.session.superadminId,
    action: "toggle_feature_flag",
    targetRestaurantId: id,
    metadata: { flag: parsed.data.flag, enabled: parsed.data.enabled },
  });

  return NextResponse.json({ restaurant: updated });
}
