"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { useCustomers } from "../../_lib/resources";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isPending, isError, refetch } = useCustomers(search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Comensales</h1>
          <p className="text-sm text-muted-foreground">Contacto y contador de no-shows/visitas. Nada de notas ni tags.</p>
        </div>
        <a
          href="/api/v1/admin/customers/export"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Download className="size-4" />
          Exportar CSV
        </a>
      </div>

      <Input
        placeholder="Buscar por nombre, teléfono o email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="No se pudieron cargar los comensales"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : data.customers.length === 0 ? (
        <EmptyState
          title="Todavía no hay comensales"
          description="Van a aparecer acá a medida que entren reservas."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.customers.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name || "Sin nombre"}</p>
                <p className="text-xs text-muted-foreground">
                  {c.phone}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{c.visitCount} visitas</Badge>
                {c.noShowCount > 0 ? <Badge variant="destructive">{c.noShowCount} no-show</Badge> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
