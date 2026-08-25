import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { db } from "@/db/client";
import { getRestaurantBySlug } from "@/db/restaurant";
import { getReservationById } from "@/db/reservation";
import { verifyReservationActionToken } from "@/lib/reservation/action-token";
import { CancelActionCard } from "./_components/cancel-action-card";

export default async function CancelReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug, id } = await params;
  const { token } = await searchParams;

  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant || !token) notFound();

  const payload = verifyReservationActionToken(token);
  if (!payload || payload.reservationId !== id) notFound();

  const reservation = await getReservationById(db, restaurant.id, id);
  if (!reservation) notFound();

  const local = DateTime.fromJSDate(reservation.startsAt).setZone(restaurant.timezone).setLocale("es");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{restaurant.name}</p>
          <h1 className="font-display text-display-sm text-foreground">¿Cancelar tu reserva?</h1>
        </div>
        <CancelActionCard
          slug={slug}
          reservationId={id}
          token={token}
          status={reservation.status}
          dateLabel={local.toFormat("cccc d LLL")}
          timeLabel={local.toFormat("HH:mm")}
          partySize={reservation.partySize}
        />
      </div>
    </div>
  );
}
