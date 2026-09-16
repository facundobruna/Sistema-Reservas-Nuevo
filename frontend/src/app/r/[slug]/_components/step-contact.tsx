"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDictionary, interpolate, type Locale } from "@/lib/i18n";
import { normalizeArPhone } from "@/lib/validation/phone";
import { StepHeader, StepProgress, StepShell } from "./step-header";

type SubmitError = { kind: "slot_unavailable"; hadZone: boolean } | { kind: "generic" };

export function StepContact({
  locale,
  slug,
  partySize,
  time,
  timeLabel,
  zoneId,
  onBack,
  onChangeZone,
  onChangeTime,
  onSuccess,
}: {
  locale: Locale;
  slug: string;
  partySize: number;
  time: string;
  timeLabel: string;
  zoneId: string | null;
  onBack: () => void;
  onChangeZone: () => void;
  onChangeTime: () => void;
  onSuccess: (reservationId: string) => void;
}) {
  const dict = getDictionary(locale);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedPhone = normalizeArPhone(phone);

    const res = await fetch(`/api/v1/r/${slug}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startsAt: time,
        partySize,
        zoneId: zoneId ?? undefined,
        specialRequests: specialRequests || undefined,
        customer: { name, phone: normalizedPhone, email: email || undefined },
      }),
    });

    setLoading(false);

    if (res.status === 409) {
      setError({ kind: "slot_unavailable", hadZone: Boolean(zoneId) });
      return;
    }
    if (!res.ok) {
      setError({ kind: "generic" });
      return;
    }

    const body = await res.json();
    onSuccess(body.reservation.id);
  }

  const subtitle = interpolate(dict.booking.contact.subtitle + " — {time}", { time: timeLabel });

  return (
    <StepShell>
      <StepProgress current={5} total={5} />
      <StepHeader title={dict.booking.contact.question} subtitle={subtitle} onBack={onBack} backLabel={dict.common.back} />

      {error?.kind === "slot_unavailable" ? (
        <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive-subtle/40 p-4">
          <p className="font-medium text-foreground">
            {error.hadZone ? dict.booking.zoneFull.title : dict.errorStates.slotUnavailable.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.hadZone ? dict.booking.zoneFull.description : dict.errorStates.slotUnavailable.description}
          </p>
          <div className="mt-3 flex gap-2">
            {error.hadZone ? (
              <Button size="sm" variant="outline" onClick={onChangeZone}>
                {dict.common.change} zona
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={onChangeTime}>
              {dict.common.change} horario
            </Button>
          </div>
        </div>
      ) : error?.kind === "generic" ? (
        <p className="mb-4 text-sm text-destructive">{dict.errorStates.generic.title}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{dict.booking.fields.name}</Label>
          <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">{dict.booking.fields.phone}</Label>
          <Input
            id="contact-phone"
            type="tel"
            placeholder="11 2222-3333"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => setPhone(normalizeArPhone(e.target.value))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{dict.booking.fields.email}</Label>
          <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-notes">{dict.booking.fields.specialRequests}</Label>
          <Textarea id="contact-notes" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? dict.booking.confirming : dict.booking.confirmReservation}
        </Button>
      </form>
    </StepShell>
  );
}
