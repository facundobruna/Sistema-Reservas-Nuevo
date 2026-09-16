import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getStaffSession, type StaffRole, type StaffSessionPayload } from "./session";

/** Para Route Handlers: valida sesión (y opcionalmente rol) o devuelve la respuesta de error lista para retornar. */
export async function requireStaffSession(
  allowedRoles?: StaffRole[],
): Promise<{ session: StaffSessionPayload } | { error: NextResponse }> {
  const session = await getStaffSession();
  if (!session) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { session };
}

/** Para Server Components del panel: redirige al login del restaurante si no hay sesión válida para ese slug. */
export async function requireStaffPage(slug: string): Promise<StaffSessionPayload> {
  const session = await getStaffSession();
  if (!session || session.restaurantSlug !== slug) {
    redirect(`/admin/${slug}/login`);
  }
  return session;
}
