import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { service } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { serviceUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const parsed = serviceUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db
    .update(service)
    .set(parsed.data)
    .where(and(eq(service.id, id), eq(service.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ service: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireStaffSession(["owner", "manager"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const [deleted] = await db
    .delete(service)
    .where(and(eq(service.id, id), eq(service.restaurantId, auth.session.restaurantId)))
    .returning();

  if (!deleted) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
