"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <NoSlots locale={locale} slug={slug} date={date} partySize={partySize} />
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

async function joinWaitlist(slug: string, body: { date: string; partySize: number; customer: { phone: string; name: string; email: string } }) {
  const res = await fetch(`/api/v1/r/${slug}/waitlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("request_failed");
}

function NoSlots({
  locale,
  slug,
  date,
  partySize,
}: {
  locale: Locale;
  slug: string;
  date: string;
  partySize: number;
}) {
  const dict = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (joined) {
    return (
      <EmptyState title={dict.booking.waitlist.successTitle} description={dict.booking.waitlist.successDescription} />
    );
  }

  if (!open) {
    return (
      <EmptyState
        title={dict.booking.noSlots.title}
        description={dict.booking.noSlots.description}
        action={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            {dict.booking.waitlist.cta}
          </Button>
        }
      />
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(false);
    try {
      await joinWaitlist(slug, { date, partySize, customer: { phone, name, email } });
      setJoined(true);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  const subtitle = interpolate(dict.booking.waitlist.subtitle, {
    n: `${partySize} ${partySize === 1 ? dict.booking.person : dict.booking.people}`,
    date: DateTime.fromISO(date).setLocale(locale).toFormat("d LLL"),
  });

  return (
    <div className="rounded-xl border border-border p-5">
      <p className="font-display text-base text-foreground">{dict.booking.waitlist.question}</p>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{subtitle}</p>
      {error ? <p className="mb-3 text-sm text-destructive">{dict.errorStates.generic.title}</p> : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="waitlist-name">{dict.booking.fields.name}</Label>
          <Input id="waitlist-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="waitlist-phone">{dict.booking.fields.phone}</Label>
          <Input
            id="waitlist-phone"
            type="tel"
            placeholder="+5491122223333"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="waitlist-email">{dict.booking.waitlist.emailLabel}</Label>
          <Input
            id="waitlist-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? dict.booking.waitlist.submitting : dict.booking.waitlist.submit}
        </Button>
      </form>
    </div>
  );
}
