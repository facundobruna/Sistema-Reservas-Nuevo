"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary, defaultLocale } from "@/lib/i18n";

export type MeReservation = {
  id: string;
  startsAt: string;
  partySize: number;
  status: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantTimezone: string;
};

const STATUS_BADGE_VARIANT: Record<string, "warning" | "accent" | "secondary" | "success" | "destructive"> = {
  pending: "warning",
  confirmed: "accent",
  seated: "secondary",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

type Slot = { time: string; serviceId: string };

async function patchReservation(slug: string, id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/v1/r/${slug}/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? "request_failed");
  }
  return res.json();
}

async function fetchAvailability(slug: string, date: string, partySize: number): Promise<{ slots: Slot[] }> {
  const res = await fetch(`/api/v1/r/${slug}/availability?date=${date}&partySize=${partySize}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export function ReservationItem({ reservation: r }: { reservation: MeReservation }) {
  const dict = getDictionary(defaultLocale);
  const qc = useQueryClient();
  const [modifying, setModifying] = useState(false);
  const local = DateTime.fromISO(r.startsAt).setZone(r.restaurantTimezone);
  const canManage = (r.status === "confirmed" || r.status === "pending") && local > DateTime.now();

  const cancelMutation = useMutation({
    mutationFn: () => patchReservation(r.restaurantSlug, r.id, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-reservations"] }),
  });

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base text-foreground">{r.restaurantName}</p>
            <p className="text-sm text-muted-foreground">
              {local.toFormat("dd/LL/yyyy")} · {local.toFormat("HH:mm")} · {r.partySize}{" "}
              {r.partySize === 1 ? dict.booking.person : dict.booking.people}
            </p>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[r.status] ?? "outline"}>
            {dict.reservationStatus[r.status as keyof typeof dict.reservationStatus] ?? r.status}
          </Badge>
        </div>

        {canManage ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setModifying((v) => !v)}>
              {dict.me.modify}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button size="sm" variant="ghost" />}>{dict.common.cancel}</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{dict.me.cancelConfirm}</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{dict.common.back}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelMutation.mutate()}>
                    {cancelMutation.isPending ? dict.me.cancelling : dict.common.confirm}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        {modifying ? (
          <ModifyForm reservation={r} onDone={() => setModifying(false)} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ModifyForm({ reservation: r, onDone }: { reservation: MeReservation; onDone: () => void }) {
  const dict = getDictionary(defaultLocale);
  const qc = useQueryClient();
  const local = DateTime.fromISO(r.startsAt).setZone(r.restaurantTimezone);
  const [partySize, setPartySize] = useState(String(r.partySize));
  const [date, setDate] = useState(local.toISODate()!);
  const [searching, setSearching] = useState(false);

  const availability = useQuery({
    queryKey: ["me-availability", r.restaurantSlug, date, partySize],
    queryFn: () => fetchAvailability(r.restaurantSlug, date, Number(partySize)),
    enabled: searching,
  });

  const modifyMutation = useMutation({
    mutationFn: (startsAt: string) =>
      patchReservation(r.restaurantSlug, r.id, { startsAt, partySize: Number(partySize) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me-reservations"] });
      onDone();
    },
  });

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <form onSubmit={handleSearch} className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`modify-date-${r.id}`}>{dict.booking.date.question}</Label>
          <Input
            id={`modify-date-${r.id}`}
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSearching(false);
            }}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`modify-size-${r.id}`}>{dict.booking.partySize.question}</Label>
          <Input
            id={`modify-size-${r.id}`}
            type="number"
            min={1}
            value={partySize}
            onChange={(e) => {
              setPartySize(e.target.value);
              setSearching(false);
            }}
            required
          />
        </div>
        <Button type="submit" size="sm" variant="outline" className="col-span-2">
          {dict.me.chooseNewTime}
        </Button>
      </form>

      {modifyMutation.isError ? (
        <p className="text-sm text-destructive">
          {modifyMutation.error instanceof Error && modifyMutation.error.message === "slot_unavailable"
            ? dict.me.modifyError
            : dict.errorStates.generic.title}
        </p>
      ) : null}

      {searching ? (
        availability.isPending ? (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-16 rounded-full" />
            ))}
          </div>
        ) : availability.isError ? (
          <p className="text-sm text-destructive">{dict.errorStates.generic.title}</p>
        ) : availability.data.slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.me.noTimesForDate}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availability.data.slots.map((slot) => (
              <Button
                key={slot.time}
                size="sm"
                variant="outline"
                disabled={modifyMutation.isPending}
                onClick={() => modifyMutation.mutate(slot.time)}
              >
                {DateTime.fromISO(slot.time).setZone(r.restaurantTimezone).toFormat("HH:mm")}
              </Button>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
