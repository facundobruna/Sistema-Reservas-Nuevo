import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { evaluatePanelAccess, getSubscriptionByRestaurantId } from "@/db/subscription";
import { requireStaffSession } from "@/lib/auth/require-staff";

export const dynamic = "force-dynamic";

/**
 * Datos que el layout del panel necesita para decidir si deja pasar: nombre del
 * restaurante, suscripción y el veredicto de acceso.
 *
 * Antes de separar back de front, el layout hacía estas tres consultas contra la
 * base directamente. Ahora la regla `evaluatePanelAccess` se evalúa de este lado
 * y el frontend recibe el resultado ya decidido: la regla de negocio no se
 * duplica ni viaja al cliente.
 */
export async function GET() {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const restaurant = await getRestaurantBySlug(auth.session.restaurantSlug);
  if (!restaurant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const subscription = await getSubscriptionByRestaurantId(db, restaurant.id);
  const access = evaluatePanelAccess({ suspendedAt: restaurant.suspendedAt, subscription });

  return NextResponse.json({
    restaurant: { id: restaurant.id, slug: restaurant.slug, name: restaurant.name },
    subscription,
    access,
  });
}
