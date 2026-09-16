"use client";

import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { getDictionary, interpolate, type Locale } from "@/lib/i18n";
import { StepShell } from "./step-header";

type ReservationDetail = {
  startsAt: string;
  partySize: number;
  specialRequests: string | null;
};

async function fetchReservation(slug: string, id: string): Promise<{ reservation: ReservationDetail }> {
  const res = await fetch(`/api/v1/r/${slug}/reservations/${id}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export function StepConfirmation({
  locale,
  slug,
  reservationId,
  timezone,
}: {
  locale: Locale;
  slug: string;
  reservationId: string;
  timezone: string;
}) {
  const dict = getDictionary(locale);
  const { data, isPending, isError } = useQuery({
    queryKey: ["reservation", slug, reservationId],
    queryFn: () => fetchReservation(slug, reservationId),
  });

  return (
    <StepShell>
      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md" />
        </div>
      ) : isError ? (
        <ErrorState title={dict.errorStates.generic.title} description={dict.errorStates.generic.description} />
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-foreground">
            <CalendarCheck className="size-6" />
          </div>
          <h1 className="font-display text-display-md text-foreground">{dict.booking.confirmation.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {interpolate(dict.booking.confirmation.subtitle, {
              date: DateTime.fromISO(data.reservation.startsAt).setZone(timezone).setLocale(locale).toFormat("cccc d LLL"),
              time: DateTime.fromISO(data.reservation.startsAt).setZone(timezone).toFormat("HH:mm"),
              n: `${data.reservation.partySize} ${data.reservation.partySize === 1 ? dict.booking.person : dict.booking.people}`,
            })}
          </p>
          {data.reservation.specialRequests ? (
            <p className="mt-4 text-sm text-muted-foreground">&ldquo;{data.reservation.specialRequests}&rdquo;</p>
          ) : null}
        </div>
      )}
    </StepShell>
  );
}
