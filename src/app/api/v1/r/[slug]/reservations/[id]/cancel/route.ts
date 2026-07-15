import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { cancelReservation, getReservationById } from "@/db/reservation";
import { scheduleStaffAlert } from "@/db/notification";
import { verifyReservationActionToken } from "@/lib/reservation/action-token";

type Params = { params: Promise<{ slug: string; id: string }> };

/**
 * Cancelar SÍ requiere una acción explícita (POST desde el botón de la página
 * de confirmación) — un GET de un escáner de links de email no debe poder
 * cancelar una reserva real por accidente.
 */
export async function POST(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;

  const payload = token ? verifyReservationActionToken(token) : null;
  if (!payload || payload.reservationId !== id) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const reservation = await getReservationById(db, restaurant.id, id);
  if (!reservation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (reservation.status !== "confirmed" && reservation.status !== "pending") {
    return NextResponse.json({ error: "not_cancellable" }, { status: 422 });
  }

  const cancelled = await cancelReservation(db, restaurant.id, id);
  if (cancelled) await scheduleStaffAlert(db, { reservationId: cancelled.id, type: "staff_cancelled" });
  return NextResponse.json({ reservation: cancelled });
}
