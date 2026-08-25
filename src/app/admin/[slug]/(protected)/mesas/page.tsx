"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import {
  useCreateMesa,
  useDeleteMesa,
  useUpdateMesa,
  useMesas,
  useZones,
  type Mesa,
} from "../../_lib/resources";

const emptyForm = { zoneId: "", name: "", minCapacity: "1", maxCapacity: "2", active: true };

export default function MesasPage() {
  const mesas = useMesas();
  const zones = useZones();
  const createMesa = useCreateMesa();
  const updateMesa = useUpdateMesa();
  const deleteMesa = useDeleteMesa();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mesa | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, zoneId: zones.data?.zones[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(mesa: Mesa) {
    setEditing(mesa);
    setForm({
      zoneId: mesa.zoneId,
      name: mesa.name,
      minCapacity: String(mesa.minCapacity),
      maxCapacity: String(mesa.maxCapacity),
      active: mesa.active,
    });
    setOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      zoneId: form.zoneId,
      name: form.name,
      minCapacity: Number(form.minCapacity),
      maxCapacity: Number(form.maxCapacity),
      active: form.active,
    };

    if (editing) {
      updateMesa.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Mesa actualizada");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar la mesa"),
        },
      );
    } else {
      createMesa.mutate(payload, {
        onSuccess: () => {
          toast.success("Mesa creada");
          setOpen(false);
        },
        onError: () => toast.error("No se pudo crear la mesa"),
      });
    }
  }

  const zoneName = (zoneId: string) => zones.data?.zones.find((z) => z.id === zoneId)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            Cada mesa genera automáticamente su unidad de asiento individual.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!zones.data?.zones.length} className="gap-1.5">
          <Plus className="size-4" />
          Nueva mesa
        </Button>
      </div>

      {mesas.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : mesas.isError ? (
        <ErrorState
          title="No se pudieron cargar las mesas"
          action={
            <Button size="sm" variant="outline" onClick={() => mesas.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : !zones.data?.zones.length ? (
        <EmptyState title="Primero creá una zona" description="Las mesas necesitan pertenecer a una zona." />
      ) : mesas.data.mesas.length === 0 ? (
        <EmptyState
          title="Todavía no hay mesas"
          description="Agregá tu primera mesa para empezar a configurar la disponibilidad."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear la primera mesa
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {mesas.data.mesas.map((mesa) => (
            <li key={mesa.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{mesa.name}</span>
                <span className="text-xs text-muted-foreground">{zoneName(mesa.zoneId)}</span>
                <span className="text-xs text-muted-foreground">
                  {mesa.minCapacity}–{mesa.maxCapacity} pers.
                </span>
                {!mesa.active ? <Badge variant="outline">Inactiva</Badge> : null}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(mesa)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel={`"${mesa.name}"`}
                  onConfirm={() =>
                    deleteMesa.mutate(mesa.id, {
                      onSuccess: () => toast.success("Mesa borrada"),
                      onError: () => toast.error("No se pudo borrar la mesa"),
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar mesa" : "Nueva mesa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="mesa-name">Nombre</Label>
              <Input
                id="mesa-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mesa-zone">Zona</Label>
              <Select value={form.zoneId} onValueChange={(v) => setForm((f) => ({ ...f, zoneId: v ?? f.zoneId }))}>
                <SelectTrigger id="mesa-zone" className="w-full">
                  <SelectValue placeholder="Elegí una zona">
                    {zones.data?.zones.find((z) => z.id === form.zoneId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {zones.data?.zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mesa-min">Mín. personas</Label>
                <Input
                  id="mesa-min"
                  type="number"
                  min={1}
                  value={form.minCapacity}
                  onChange={(e) => setForm((f) => ({ ...f, minCapacity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mesa-max">Máx. personas</Label>
                <Input
                  id="mesa-max"
                  type="number"
                  min={1}
                  value={form.maxCapacity}
                  onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mesa-active" className="text-sm font-normal text-muted-foreground">
                Activa
              </Label>
              <Switch
                id="mesa-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMesa.isPending || updateMesa.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
