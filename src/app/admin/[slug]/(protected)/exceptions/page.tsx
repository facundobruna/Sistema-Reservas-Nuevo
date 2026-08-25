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
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import {
  useCreateException,
  useDeleteException,
  useExceptions,
  useUpdateException,
  type ScheduleException,
} from "../../_lib/resources";

const emptyForm = {
  date: "",
  kind: "closed" as "closed" | "special_hours",
  startTime: "",
  endTime: "",
  note: "",
};

export default function ExceptionsPage() {
  const { data, isPending, isError, refetch } = useExceptions();
  const createException = useCreateException();
  const updateException = useUpdateException();
  const deleteException = useDeleteException();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleException | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(exception: ScheduleException) {
    setEditing(exception);
    setForm({
      date: exception.date,
      kind: exception.kind,
      startTime: exception.startTime?.slice(0, 5) ?? "",
      endTime: exception.endTime?.slice(0, 5) ?? "",
      note: exception.note ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      date: form.date,
      kind: form.kind,
      startTime: form.kind === "special_hours" ? form.startTime : undefined,
      endTime: form.kind === "special_hours" ? form.endTime : undefined,
      note: form.note || undefined,
    };

    if (editing) {
      updateException.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Excepción actualizada");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar la excepción"),
        },
      );
    } else {
      createException.mutate(payload, {
        onSuccess: () => {
          toast.success("Excepción creada");
          setOpen(false);
        },
        onError: () => toast.error("No se pudo crear la excepción"),
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Excepciones</h1>
          <p className="text-sm text-muted-foreground">
            Cierres puntuales u horarios especiales para una fecha concreta.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Nueva excepción
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="No se pudieron cargar las excepciones"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : data.exceptions.length === 0 ? (
        <EmptyState
          title="Todavía no hay excepciones"
          description="Usalas para feriados, cierres por evento o horarios especiales."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear la primera excepción
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.exceptions.map((exception) => (
            <li key={exception.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{exception.date}</span>
                  <Badge variant={exception.kind === "closed" ? "destructive" : "warning"}>
                    {exception.kind === "closed" ? "Cerrado" : "Horario especial"}
                  </Badge>
                </div>
                {exception.kind === "special_hours" ? (
                  <p className="text-xs text-muted-foreground">
                    {exception.startTime?.slice(0, 5)}–{exception.endTime?.slice(0, 5)}
                  </p>
                ) : null}
                {exception.note ? <p className="text-xs text-muted-foreground">{exception.note}</p> : null}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(exception)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel={`la excepción del ${exception.date}`}
                  onConfirm={() =>
                    deleteException.mutate(exception.id, {
                      onSuccess: () => toast.success("Excepción borrada"),
                      onError: () => toast.error("No se pudo borrar la excepción"),
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
              <DialogTitle>{editing ? "Editar excepción" : "Nueva excepción"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="exc-date">Fecha</Label>
              <Input
                id="exc-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exc-kind">Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: (v as typeof f.kind) ?? f.kind }))}>
                <SelectTrigger id="exc-kind" className="w-full">
                  <SelectValue>{form.kind === "closed" ? "Cerrado todo el día" : "Horario especial"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Cerrado todo el día</SelectItem>
                  <SelectItem value="special_hours">Horario especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === "special_hours" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exc-start">Desde</Label>
                  <Input
                    id="exc-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exc-end">Hasta</Label>
                  <Input
                    id="exc-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="exc-note">Nota (opcional)</Label>
              <Input
                id="exc-note"
                placeholder="Ej. Evento privado"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createException.isPending || updateException.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
