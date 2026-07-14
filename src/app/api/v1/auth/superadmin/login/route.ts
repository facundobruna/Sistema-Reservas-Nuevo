import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { superadminUser } from "@/db/schema";
import { createSuperadminSession } from "@/lib/auth/superadmin-session";
import { verifyPassword } from "@/lib/auth/password";
import { superadminLoginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const parsed = superadminLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [admin] = await db.select().from(superadminUser).where(eq(superadminUser.email, email)).limit(1);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createSuperadminSession({ superadminId: admin.id, email: admin.email });

  return NextResponse.json({ ok: true });
}
