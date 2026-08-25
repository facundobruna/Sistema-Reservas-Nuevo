import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { createMesaBlock } from "@/db/mesa-block";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { mesaBlockCreateSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  const auth = await requireStaffSession(["owner", "manager", "host"]);
  if ("error" in auth) return auth.error;

  const parsed = mesaBlockCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createMesaBlock(db, auth.session.restaurantId, parsed.data);
  if (!result.ok) {
    const status = result.error === "invalid_mesa" ? 400 : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ block: result.block }, { status: 201 });
}
