import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { getReservationById, markConfirmedByDiner } from "@/db/reservation";
import { verifyReservationActionToken } from "@/lib/reservation/action-token";

type Params = { params: Promise<{ slug: string; id: string }> };

/**
 * "Confirmo que voy", ejecutado directo por GET (no destructivo, seguro aunque
 * un escáner de links de email lo pre-cargue solo) — a diferencia de cancelar,
 * que necesita un click explícito (ver la página /r/{slug}/reservations/{id}/cancel).
 */
export async function GET(request: Request, { params }: Params) {
  const { slug, id } = await params;
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  const resultUrl = (type: string) => new URL(`/r/${slug}/action-result?type=${type}`, appUrl);

  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? verifyReservationActionToken(token) : null;
  if (!payload || payload.reservationId !== id) {
    return NextResponse.redirect(resultUrl("error"));
  }

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.redirect(resultUrl("error"));

  const reservation = await getReservationById(db, restaurant.id, id);
  if (!reservation) return NextResponse.redirect(resultUrl("error"));

  if (reservation.status !== "confirmed" && reservation.status !== "pending") {
    return NextResponse.redirect(resultUrl("already"));
  }

  await markConfirmedByDiner(db, id);
  return NextResponse.redirect(resultUrl("confirmed"));
}
