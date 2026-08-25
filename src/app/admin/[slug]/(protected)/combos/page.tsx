"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import {
  useCreateCombo,
  useDeleteCombo,
  useMesas,
  useSeatingUnits,
  useUpdateCombo,
  type SeatingUnit,
} from "../../_lib/resources";

const emptyForm = { name: "", minCapacity: "", maxCapacity: "", mesaIds: [] as string[] };

export default function CombosPage() {
  const combos = useSeatingUnits();
  const mesas = useMesas();
  const createCombo = useCreateCombo();
  const updateCombo = useUpdateCombo();
  const deleteCombo = useDeleteCombo();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SeatingUnit | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(combo: SeatingUnit) {
    setEditing(combo);
    setForm({
      name: combo.name,
      minCapacity: String(combo.minCapacity),
      maxCapacity: String(combo.maxCapacity),
      mesaIds: combo.mesaIds,
    });
    setOpen(true);
  }

  function toggleMesa(mesaId: string) {
    setForm((f) => ({
      ...f,
      mesaIds: f.mesaIds.includes(mesaId) ? f.mesaIds.filter((id) => id !== mesaId) : [...f.mesaIds, mesaId],
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      minCapacity: Number(form.minCapacity),
      maxCapacity: Number(form.maxCapacity),
      mesaIds: form.mesaIds,
    };

    if (editing) {
      updateCombo.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Combo actualizado");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar el combo"),
        },
      );
    } else {
      createCombo.mutate(payload, {
        onSuccess: () => {
          toast.success("Combo creado");
          setOpen(false);
        },
        onError: () => toast.error("No se pudo crear el combo"),
      });
    }
  }

  const mesaName = (id: string) => mesas.data?.mesas.find((m) => m.id === id)?.name ?? "?";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Combos</h1>
          <p className="text-sm text-muted-foreground">
            Enlazá varias mesas como una sola unidad para grupos grandes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          disabled={(mesas.data?.mesas.length ?? 0) < 2}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Nuevo combo
        </Button>
      </div>

      {combos.isPending ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : combos.isError ? (
        <ErrorState
          title="No se pudieron cargar los combos"
          action={
            <Button size="sm" variant="outline" onClick={() => combos.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (mesas.data?.mesas.length ?? 0) < 2 ? (
        <EmptyState title="Necesitás al menos 2 mesas" description="Un combo enlaza dos o más mesas existentes." />
      ) : combos.data.seatingUnits.length === 0 ? (
        <EmptyState
          title="Todavía no hay combos"
          description="Los combos son opcionales — solo hacen falta para grupos que superan una mesa sola."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear el primer combo
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {combos.data.seatingUnits.map((combo) => (
            <li key={combo.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{combo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {combo.mesaIds.map(mesaName).join(" + ")} · {combo.minCapacity}–{combo.maxCapacity} pers.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(combo)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel={`"${combo.name}"`}
                  onConfirm={() =>
                    deleteCombo.mutate(combo.id, {
                      onSuccess: () => toast.success("Combo borrado"),
                      onError: () => toast.error("No se pudo borrar el combo"),
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
              <DialogTitle>{editing ? "Editar combo" : "Nuevo combo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="combo-name">Nombre</Label>
              <Input
                id="combo-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="combo-min">Mín. personas</Label>
                <Input
                  id="combo-min"
                  type="number"
                  min={1}
                  value={form.minCapacity}
                  onChange={(e) => setForm((f) => ({ ...f, minCapacity: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="combo-max">Máx. personas</Label>
                <Input
                  id="combo-max"
                  type="number"
                  min={1}
                  value={form.maxCapacity}
                  onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mesas que forman el combo</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {mesas.data?.mesas.map((mesa) => (
                  <label key={mesa.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox
                      checked={form.mesaIds.includes(mesa.id)}
                      onCheckedChange={() => toggleMesa(mesa.id)}
                    />
                    {mesa.name}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.mesaIds.length < 2 || createCombo.isPending || updateCombo.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
