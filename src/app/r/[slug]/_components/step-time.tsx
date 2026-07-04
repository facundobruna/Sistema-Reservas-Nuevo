"use client";

import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { getDictionary, interpolate, type Locale } from "@/lib/i18n";
import { OptionChip } from "./option-chip";
import { StepHeader, StepProgress, StepShell } from "./step-header";

type Slot = { time: string; serviceId: string };
type Service = { id: string; name: string };

async function fetchAvailability(slug: string, date: string, partySize: number): Promise<{ slots: Slot[] }> {
  const res = await fetch(`/api/v1/r/${slug}/availability?date=${date}&partySize=${partySize}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export function StepTime({
  locale,
  slug,
  timezone,
  date,
  partySize,
  services,
  onSelect,
  onBack,
}: {
  locale: Locale;
  slug: string;
  timezone: string;
  date: string;
  partySize: number;
  services: Service[];
  onSelect: (time: string) => void;
  onBack: () => void;
}) {
  const dict = getDictionary(locale);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["availability", slug, date, partySize],
    queryFn: () => fetchAvailability(slug, date, partySize),
  });

  const subtitle = interpolate(dict.booking.time.subtitle, {
    n: `${partySize} ${partySize === 1 ? dict.booking.person : dict.booking.people}`,
    date: DateTime.fromISO(date).setLocale(locale).toFormat("d LLL"),
  });

  const slotsByService = new Map<string, Slot[]>();
  for (const slot of data?.slots ?? []) {
    const list = slotsByService.get(slot.serviceId) ?? [];
    list.push(slot);
    slotsByService.set(slot.serviceId, list);
  }

  return (
    <StepShell>
      <StepProgress current={3} total={5} />
      <StepHeader title={dict.booking.time.question} subtitle={subtitle} onBack={onBack} backLabel={dict.common.back} />

      {isPending ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-20 rounded-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title={dict.errorStates.generic.title}
          description={dict.errorStates.generic.description}
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              {dict.common.retry}
            </Button>
          }
        />
      ) : data.slots.length === 0 ? (
        <EmptyState title={dict.booking.noSlots.title} description={dict.booking.noSlots.description} />
      ) : (
        <div className="space-y-6">
          {[...slotsByService.entries()].map(([serviceId, slots]) => (
            <div key={serviceId}>
              {slotsByService.size > 1 ? (
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {services.find((s) => s.id === serviceId)?.name ?? ""}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <OptionChip key={slot.time} onClick={() => onSelect(slot.time)}>
                    {DateTime.fromISO(slot.time).setZone(timezone).toFormat("HH:mm")}
                  </OptionChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </StepShell>
  );
}
