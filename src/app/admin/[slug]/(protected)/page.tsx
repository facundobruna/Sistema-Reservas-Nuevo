"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { useCreateZone, useDeleteZone, useUpdateZone, useZones, type Zone } from "../_lib/resources";

export default function ZonesPage() {
  const { data, isPending, isError, refetch } = useZones();
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [name, setName] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(zone: Zone) {
    setEditing(zone);
    setName(zone.name);
    setOpen(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (editing) {
      updateZone.mutate(
        { id: editing.id, name },
        {
          onSuccess: () => {
            toast.success("Zona actualizada");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar la zona"),
        },
      );
    } else {
      createZone.mutate(
        { name, position: data?.zones.length ?? 0 },
        {
          onSuccess: () => {
            toast.success("Zona creada");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo crear la zona"),
        },
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Zonas</h1>
          <p className="text-sm text-muted-foreground">
            Áreas del salón (ej. Salón principal, Terraza). Cada mesa pertenece a una zona.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Nueva zona
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="No se pudieron cargar las zonas"
          description="Revisá tu conexión e intentá de nuevo."
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : data.zones.length === 0 ? (
        <EmptyState
          title="Todavía no hay zonas"
          description="Creá al menos una zona antes de cargar mesas."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear la primera zona
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.zones.map((zone) => (
            <li key={zone.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{zone.name}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(zone)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel={`"${zone.name}"`}
                  onConfirm={() =>
                    deleteZone.mutate(zone.id, {
                      onSuccess: () => toast.success("Zona borrada"),
                      onError: () => toast.error("No se pudo borrar (¿tiene mesas asociadas?)"),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar zona" : "Nueva zona"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-4">
              <Label htmlFor="zone-name">Nombre</Label>
              <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createZone.isPending || updateZone.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
