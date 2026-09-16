"use client";

import { useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useSuperadminStats, useTenants, type SubscriptionStatus } from "../_lib/resources";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
};

const STATUS_BADGE_VARIANT: Record<SubscriptionStatus, "warning" | "success" | "destructive" | "outline"> = {
  trialing: "warning",
  active: "success",
  past_due: "destructive",
  canceled: "outline",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function SuperadminDashboardPage() {
  const [from, setFrom] = useState(() => DateTime.now().minus({ days: 30 }).toISODate()!);
  const [to, setTo] = useState(() => DateTime.now().toISODate()!);

  const stats = useSuperadminStats(from, to);
  const tenants = useTenants();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-display-sm text-foreground">Tenants</h1>
        <p className="text-sm text-muted-foreground">Estado de suscripción de todos los restaurantes de la plataforma.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <span className="text-sm text-muted-foreground">a</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
      </div>

      {stats.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : stats.isError ? (
        <ErrorState title="No se pudieron cargar las métricas" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="MRR" value={currencyFormatter.format(stats.data.stats.mrr)} />
          <StatCard label="Suscripciones activas" value={String(stats.data.stats.activeSubscriptions)} />
          <StatCard label="Altas en el rango" value={String(stats.data.stats.signups)} />
          <StatCard label="Cancelaciones en el rango" value={String(stats.data.stats.cancellations)} />
        </div>
      )}

      {tenants.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : tenants.isError ? (
        <ErrorState title="No se pudieron cargar los tenants" />
      ) : tenants.data.tenants.length === 0 ? (
        <EmptyState title="Todavía no hay restaurantes" />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {tenants.data.tenants.map((t) => (
            <li key={t.id}>
              <Link
                href={`/superadmin/tenants/${t.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    /r/{t.slug} · desde {DateTime.fromISO(t.createdAt).toFormat("dd/LL/yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.suspendedAt ? <Badge variant="destructive">Suspendido</Badge> : null}
                  {t.subscriptionStatus ? (
                    <Badge variant={STATUS_BADGE_VARIANT[t.subscriptionStatus]}>{STATUS_LABEL[t.subscriptionStatus]}</Badge>
                  ) : (
                    <Badge variant="outline">Sin suscripción</Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-2xl text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
