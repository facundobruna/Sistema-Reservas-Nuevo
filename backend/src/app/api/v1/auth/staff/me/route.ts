import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth/require-staff";

export const dynamic = "force-dynamic";

/**
 * Quién es el usuario de la cookie `staff_session`.
 *
 * Existe a partir de la separación back/front: el frontend ya no puede validar
 * la sesión por su cuenta porque el secreto de firma (AUTH_SECRET) vive solo
 * acá. Cuando una pantalla protegida del panel necesita saber si hay sesión,
 * reenvía la cookie a este endpoint en vez de abrir el token ella misma.
 */
export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const { staffId, restaurantId, restaurantSlug, role, email, impersonatedBy } = auth.session;
  return NextResponse.json({
    session: { staffId, restaurantId, restaurantSlug, role, email, impersonatedBy },
  });
}
