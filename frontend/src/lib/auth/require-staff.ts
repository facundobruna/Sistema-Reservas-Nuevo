import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api/server";
import type { StaffSession } from "@/lib/api/types";

/**
 * Guarda de las pantallas del panel.
 *
 * Antes abría la cookie firmada acá mismo. Ahora se la manda al backend: el
 * secreto de firma no está en este contenedor, y no debería. El frontend solo
 * decide qué hacer con la respuesta (dejar pasar o mandar al login).
 */
export async function requireStaffPage(slug: string): Promise<StaffSession> {
  const result = await apiGet<{ session: StaffSession }>("/auth/staff/me");

  if (!result.ok || result.data.session.restaurantSlug !== slug) {
    redirect(`/admin/${slug}/login`);
  }

  return result.data.session;
}
