"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const CANCELLABLE = ["pending", "confirmed"];

export function CancelActionCard({
  slug,
  reservationId,
  token,
  status,
  dateLabel,
  timeLabel,
  partySize,
}: {
  slug: string;
  reservationId: string;
  token: string;
  status: string;
  dateLabel: string;
  timeLabel: string;
  partySize: number;
}) {
  const [cancelled, setCancelled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (cancelled) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-foreground">Listo, cancelamos tu reserva.</CardContent>
      </Card>
    );
  }

  if (!CANCELLABLE.includes(status)) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Esta reserva ya no está activa — no hace falta cancelarla.
        </CardContent>
      </Card>
    );
  }

  async function handleCancel() {
    setLoading(true);
    setError(false);
    const res = await fetch(`/api/v1/r/${slug}/reservations/${reservationId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(true);
      return;
    }
    setCancelled(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          {dateLabel} a las {timeLabel}, para {partySize} {partySize === 1 ? "persona" : "personas"}.
        </p>
        {error ? <p className="text-sm text-destructive">No se pudo cancelar. Intentá de nuevo.</p> : null}
        <Button variant="destructive" className="w-full" disabled={loading} onClick={handleCancel}>
          {loading ? "Cancelando…" : "Sí, cancelar mi reserva"}
        </Button>
      </CardContent>
    </Card>
  );
}
