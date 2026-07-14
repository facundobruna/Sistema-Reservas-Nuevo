import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant } from "@/db/schema";
import { logAudit } from "@/db/audit";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [updated] = await db
    .update(restaurant)
    .set({ suspendedAt: null, updatedAt: new Date() })
    .where(eq(restaurant.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await logAudit(db, { superadminId: auth.session.superadminId, action: "reactivate_restaurant", targetRestaurantId: id });

  return NextResponse.json({ restaurant: updated });
}
