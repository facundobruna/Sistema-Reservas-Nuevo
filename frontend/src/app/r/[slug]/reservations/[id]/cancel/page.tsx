import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { apiGet } from "@/lib/api/server";
import type { ReservationStatus } from "@/lib/api/types";
import { CancelActionCard } from "./_components/cancel-action-card";

/**
 * Se llega acá desde el link del email, sin sesión: la credencial es el token
 * firmado del query string. Verificarlo requiere AUTH_SECRET, que vive solo en
 * el backend — así que esta pantalla no lo abre, se lo manda y el backend
 * responde 401 si no sirve.
 */
type CancelView = {
  restaurant: { name: string; timezone: string };
  reservation: { id: string; status: ReservationStatus; startsAt: string; partySize: number };
};

export default async function CancelReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug, id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const result = await apiGet<CancelView>(
    `/r/${slug}/reservations/${id}/cancel?token=${encodeURIComponent(token)}`,
  );
  if (!result.ok) notFound();

  const { restaurant, reservation } = result.data;
  const local = DateTime.fromISO(reservation.startsAt).setZone(restaurant.timezone).setLocale("es");

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
