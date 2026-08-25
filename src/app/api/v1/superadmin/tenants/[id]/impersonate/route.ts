import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { restaurant, staffUser } from "@/db/schema";
import { logAudit } from "@/db/audit";
import { requireSuperadminSession } from "@/lib/auth/require-superadmin";
import { createStaffSession } from "@/lib/auth/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireSuperadminSession();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [restaurantRow] = await db.select().from(restaurant).where(eq(restaurant.id, id)).limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [owner] = await db
    .select()
    .from(staffUser)
    .where(and(eq(staffUser.restaurantId, id), eq(staffUser.role, "owner")))
    .limit(1);
  if (!owner) return NextResponse.json({ error: "no_owner" }, { status: 422 });

  await createStaffSession({
    staffId: owner.id,
    restaurantId: restaurantRow.id,
    restaurantSlug: restaurantRow.slug,
    role: owner.role,
    email: owner.email,
    impersonatedBy: auth.session.superadminId,
  });

  await logAudit(db, {
    superadminId: auth.session.superadminId,
    action: "impersonate_start",
    targetRestaurantId: id,
    metadata: { staffId: owner.id, staffEmail: owner.email },
  });

  return NextResponse.json({ slug: restaurantRow.slug });
}
