"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useStats } from "../../_lib/resources";

const STAT_LABELS: { key: "entradas" | "cumplidas" | "canceladas" | "no_show"; label: string }[] = [
  { key: "entradas", label: "Reservas entraron" },
  { key: "cumplidas", label: "Se cumplieron" },
  { key: "canceladas", label: "Canceladas" },
  { key: "no_show", label: "No-shows" },
];

export default function StatsPage() {
  const [from, setFrom] = useState(() => DateTime.now().minus({ days: 30 }).toISODate()!);
  const [to, setTo] = useState(() => DateTime.now().toISODate()!);
  const { data, isPending, isError, refetch } = useStats(from, to);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-foreground">Analíticas</h1>
        <p className="text-sm text-muted-foreground">
          Cuántas reservas entraron y cuántas se cumplieron por período. Nada de ocupación ni segmentación.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <span className="text-sm text-muted-foreground">a</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="No se pudieron cargar las analíticas"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAT_LABELS.map(({ key, label }) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <p className="font-display text-display-md text-foreground">{data.stats[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
