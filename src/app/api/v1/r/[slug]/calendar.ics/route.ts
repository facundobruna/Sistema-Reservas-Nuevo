import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getCalendarFeed } from "@/db/calendar";
import { getRestaurantBySlug } from "@/db/restaurant";
import { buildCalendarFeedIcs } from "@/lib/reservation/ics";
import { verifyCalendarToken } from "@/lib/reservation/calendar-token";

type Params = { params: Promise<{ slug: string }> };

/**
 * Feed de calendario del restaurante — pensado para suscribirse desde Google
 * Calendar/Outlook/Apple Calendar, así que lo consultan directo los servidores
 * de esos servicios sin sesión: se autentica con el token de la URL, como los
 * links de confirmar/cancelar por email.
 */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const payload = token ? verifyCalendarToken(token) : null;
  const settings = restaurant.settings as { calendarTokenVersion?: number };
  if (!payload || payload.restaurantId !== restaurant.id || payload.v !== (settings.calendarTokenVersion ?? 0)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const reservations = await getCalendarFeed(db, restaurant.id);
  const ics = buildCalendarFeedIcs(reservations);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="reservas.ics"',
    },
  });
}

