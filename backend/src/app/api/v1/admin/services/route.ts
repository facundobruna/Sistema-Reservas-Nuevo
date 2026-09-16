import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { service } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { serviceCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const rows = await db
    .select()
    .from(service)
    .where(eq(service.restaurantId, auth.session.restaurantId))
    .orderBy(asc(service.position));

  return NextResponse.json({ services: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;

  const parsed = serviceCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await db
    .insert(service)
    .values({ restaurantId: auth.session.restaurantId, ...parsed.data })
    .returning();

  return NextResponse.json({ service: created }, { status: 201 });
}
