"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { getDictionary, defaultLocale } from "@/lib/i18n";
import { normalizeArPhone } from "@/lib/validation/phone";
import { ReservationItem, type MeReservation } from "./_components/reservation-item";

async function fetchMyReservations(): Promise<{ reservations: MeReservation[] }> {
  const res = await fetch("/api/v1/me/reservations");
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export default function MePage() {
  return (
    <Suspense>
      <MePageContent />
    </Suspense>
  );
}

function MePageContent() {
  const dict = getDictionary(defaultLocale);
  const searchParams = useSearchParams();
  const invalidLink = searchParams.get("error") === "invalid_link";

  const { data, isPending, isError } = useQuery({
    queryKey: ["me-reservations"],
    queryFn: fetchMyReservations,
    retry: false,
  });

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-14">
      <h1 className="mb-8 font-display text-display-sm text-foreground">{dict.me.title}</h1>

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : isError ? (
        <LoginPrompt invalidLink={invalidLink} />
      ) : data.reservations.length === 0 ? (
        <EmptyState title={dict.emptyStates.noReservations.title} description={dict.emptyStates.noReservations.description} />
      ) : (
        <ul className="space-y-3">
          {data.reservations.map((r) => (
            <li key={r.id}>
              <ReservationItem reservation={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoginPrompt({ invalidLink }: { invalidLink: boolean }) {
  const dict = getDictionary(defaultLocale);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/v1/auth/diner/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizeArPhone(phone) }),
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="space-y-1 pt-6 text-center">
          <p className="font-display text-lg text-foreground">{dict.me.linkSentTitle}</p>
          <p className="text-sm text-muted-foreground">{dict.me.linkSentDescription}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invalidLink ? <p className="text-sm text-destructive">{dict.me.invalidLink}</p> : null}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="me-phone">{dict.me.loginPrompt}</Label>
              <Input
                id="me-phone"
                type="tel"
                placeholder="11 2222-3333"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => setPhone(normalizeArPhone(e.target.value))}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? dict.me.sending : dict.me.sendLink}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
