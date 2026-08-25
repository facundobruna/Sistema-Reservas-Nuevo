"use client";

import { useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Subscription } from "@/db/subscription";

type Access = "ok" | "trial_expired" | "payment_required" | "suspended";

async function startCheckout(): Promise<string> {
  const res = await fetch("/api/v1/admin/billing/subscribe", { method: "POST" });
  if (!res.ok) throw new Error("checkout_failed");
  const body = (await res.json()) as { initPoint: string };
  return body.initPoint;
}

export function BillingContent({
  slug,
  restaurantName,
  subscription,
  access,
}: {
  slug: string;
  restaurantName: string;
  subscription: Subscription | null;
  access: Access;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    setError(false);
    try {
      const initPoint = await startCheckout();
      window.location.href = initPoint;
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-4 pt-6 text-center">
        <div>
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Facturación</p>
          <h1 className="font-display text-display-sm text-foreground">{restaurantName}</h1>
        </div>

        <StatusBlock access={access} subscription={subscription} />

        {error ? (
          <p className="text-sm text-destructive">No se pudo iniciar el pago. Intentá de nuevo en un momento.</p>
        ) : null}

        {access !== "suspended" ? (
          <Button onClick={handleSubscribe} disabled={loading} className="w-full">
            {loading ? "Redirigiendo…" : access === "ok" ? "Actualizar método de pago" : "Suscribirme con Mercado Pago"}
          </Button>
        ) : null}

        {access === "ok" ? (
          <Link href={`/admin/${slug}`} className="block text-sm text-muted-foreground underline underline-offset-2">
            Volver al panel
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBlock({ access, subscription }: { access: Access; subscription: Subscription | null }) {
  if (access === "suspended") {
    return (
      <p className="text-sm text-muted-foreground">
        Esta cuenta está suspendida. Escribinos si creés que es un error.
      </p>
    );
  }

  if (access === "trial_expired") {
    return (
      <p className="text-sm text-muted-foreground">
        Tu período de prueba terminó. Suscribite para seguir operando el panel — el link de reserva de tus
        clientes sigue funcionando siempre, esto no lo afecta.
      </p>
    );
  }

  if (access === "payment_required") {
    return (
      <p className="text-sm text-muted-foreground">
        Hay un problema con tu pago. Regularizalo para volver a acceder al panel.
      </p>
    );
  }

  // access === "ok"
  if (subscription?.status === "trialing" && subscription.trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil(DateTime.fromJSDate(subscription.trialEndsAt).diffNow("days").days));
    return (
      <p className="text-sm text-muted-foreground">
        Estás en período de prueba — quedan {daysLeft} día{daysLeft === 1 ? "" : "s"}.
      </p>
    );
  }

  return <p className="text-sm text-success">Suscripción activa.</p>;
}
