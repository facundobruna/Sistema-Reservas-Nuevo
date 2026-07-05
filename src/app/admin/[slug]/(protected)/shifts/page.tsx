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
  useCreateShift,
  useDeleteShift,
  useServices,
  useShifts,
  useUpdateShift,
  useZones,
  type Shift,
} from "../../_lib/resources";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const NO_ZONE = "__all__";

const emptyForm = {
  serviceId: "",
  zoneId: NO_ZONE,
  dayOfWeek: "2",
  startTime: "12:00",
  endTime: "15:30",
  slotIntervalMin: "15",
  turnDurationMin: "90",
  seatingMode: "rolling" as "rolling" | "fixed",
  fixedTimes: "",
  pacingCap: "",
};

export default function ShiftsPage() {
  const shifts = useShifts();
  const services = useServices();
  const zones = useZones();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, serviceId: services.data?.services[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditing(shift);
    setForm({
      serviceId: shift.serviceId,
      zoneId: shift.zoneId ?? NO_ZONE,
      dayOfWeek: String(shift.dayOfWeek),
      startTime: shift.startTime.slice(0, 5),
      endTime: shift.endTime.slice(0, 5),
      slotIntervalMin: String(shift.slotIntervalMin),
      turnDurationMin: String(shift.turnDurationMin),
      seatingMode: shift.seatingMode,
      fixedTimes: (shift.fixedTimes ?? []).map((t) => t.slice(0, 5)).join(", "),
      pacingCap: shift.pacingCap === null ? "" : String(shift.pacingCap),
    });
    setOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      serviceId: form.serviceId,
      zoneId: form.zoneId === NO_ZONE ? null : form.zoneId,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      slotIntervalMin: Number(form.slotIntervalMin),
      turnDurationMin: Number(form.turnDurationMin),
      seatingMode: form.seatingMode,
      fixedTimes:
        form.seatingMode === "fixed"
          ? form.fixedTimes
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      pacingCap: form.pacingCap === "" ? null : Number(form.pacingCap),
    };

    if (editing) {
      updateShift.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Turno actualizado");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar el turno"),
        },
      );
    } else {
      createShift.mutate(payload, {
        onSuccess: () => {
          toast.success("Turno creado");
          setOpen(false);
        },
        onError: () => toast.error("No se pudo crear el turno"),
      });
    }
  }

  const serviceName = (id: string) => services.data?.services.find((s) => s.id === id)?.name ?? "?";
  const zoneName = (id: string | null) =>
    id ? zones.data?.zones.find((z) => z.id === id)?.name ?? "?" : "Todas las zonas";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Turnos</h1>
          <p className="text-sm text-muted-foreground">
            Definen cuándo se puede reservar: día, horario, ritmo de slots y cupo.
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!services.data?.services.length} className="gap-1.5">
          <Plus className="size-4" />
          Nuevo turno
        </Button>
      </div>

      {shifts.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : shifts.isError ? (
        <ErrorState
          title="No se pudieron cargar los turnos"
          action={
            <Button size="sm" variant="outline" onClick={() => shifts.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : !services.data?.services.length ? (
        <EmptyState title="Primero creá un servicio" description="Los turnos necesitan pertenecer a un servicio." />
      ) : shifts.data.shifts.length === 0 ? (
        <EmptyState
          title="Todavía no hay turnos"
          description="Sin turnos, el motor de disponibilidad no tiene horarios para ofrecer."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear el primer turno
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {shifts.data.shifts.map((shift) => (
            <li key={shift.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{serviceName(shift.serviceId)}</span>
                  <Badge variant="outline">{DAY_LABELS[shift.dayOfWeek]}</Badge>
                  <Badge variant="accent">{shift.seatingMode === "rolling" ? "Rolling" : "Fixed"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)} · {zoneName(shift.zoneId)} · turno de{" "}
                  {shift.turnDurationMin} min
                  {shift.pacingCap !== null ? ` · tope ${shift.pacingCap} cubiertos` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(shift)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel="este turno"
                  onConfirm={() =>
                    deleteShift.mutate(shift.id, {
                      onSuccess: () => toast.success("Turno borrado"),
                      onError: () => toast.error("No se pudo borrar el turno"),
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md!">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar turno" : "Nuevo turno"}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-service">Servicio</Label>
                <Select value={form.serviceId} onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v ?? f.serviceId }))}>
                  <SelectTrigger id="shift-service" className="w-full">
                    <SelectValue placeholder="Servicio">
                      {services.data?.services.find((s) => s.id === form.serviceId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.data?.services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift-zone">Zona</Label>
                <Select value={form.zoneId} onValueChange={(v) => setForm((f) => ({ ...f, zoneId: v ?? f.zoneId }))}>
                  <SelectTrigger id="shift-zone" className="w-full">
                    <SelectValue placeholder="Zona">
                      {form.zoneId === NO_ZONE ? "Todas las zonas" : zones.data?.zones.find((z) => z.id === form.zoneId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_ZONE}>Todas las zonas</SelectItem>
                    {zones.data?.zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-day">Día de la semana</Label>
              <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v ?? f.dayOfWeek }))}>
                <SelectTrigger id="shift-day" className="w-full">
                  <SelectValue placeholder="Día">{DAY_LABELS[Number(form.dayOfWeek)]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, i) => (
                    <SelectItem key={label} value={String(i)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-start">Desde</Label>
                <Input
                  id="shift-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift-end">Hasta</Label>
                <Input
                  id="shift-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shift-mode">Modo</Label>
              <Select
                value={form.seatingMode}
                onValueChange={(v) => setForm((f) => ({ ...f, seatingMode: (v as "rolling" | "fixed") ?? f.seatingMode }))}
              >
                <SelectTrigger id="shift-mode" className="w-full">
                  <SelectValue>
                    {form.seatingMode === "rolling" ? "Rolling — horarios cada X minutos" : "Fixed — horarios fijos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rolling">Rolling — horarios cada X minutos</SelectItem>
                  <SelectItem value="fixed">Fixed — horarios fijos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.seatingMode === "rolling" ? (
              <div className="space-y-1.5">
                <Label htmlFor="shift-interval">Cada cuántos minutos</Label>
                <Input
                  id="shift-interval"
                  type="number"
                  min={5}
                  value={form.slotIntervalMin}
                  onChange={(e) => setForm((f) => ({ ...f, slotIntervalMin: e.target.value }))}
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="shift-fixed">Horarios fijos (separados por coma)</Label>
                <Input
                  id="shift-fixed"
                  placeholder="20:00, 20:30, 21:00"
                  value={form.fixedTimes}
                  onChange={(e) => setForm((f) => ({ ...f, fixedTimes: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="shift-duration">Duración del turno (min)</Label>
                <Input
                  id="shift-duration"
                  type="number"
                  min={15}
                  value={form.turnDurationMin}
                  onChange={(e) => setForm((f) => ({ ...f, turnDurationMin: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shift-cap">Tope de cubiertos (opcional)</Label>
                <Input
                  id="shift-cap"
                  type="number"
                  min={0}
                  placeholder="Sin tope"
                  value={form.pacingCap}
                  onChange={(e) => setForm((f) => ({ ...f, pacingCap: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createShift.isPending || updateShift.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
