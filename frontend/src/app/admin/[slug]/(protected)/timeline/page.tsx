"use client";

import { useState } from "react";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  useCreateMesaBlock,
  useDeleteMesaBlock,
  useMesas,
  useShifts,
  useSettings,
  useTimeline,
  useZones,
  type Mesa,
  type MesaBlock,
  type TimelineOccupied,
} from "../../_lib/resources";

const PX_PER_MINUTE = 3;
const ANY_ZONE = "__any__";

const STATUS_BLOCK_CLASS: Record<string, string> = {
  pending: "border-warning/40 bg-warning-subtle text-warning-subtle-foreground",
  confirmed: "border-accent/40 bg-accent-subtle text-accent-subtle-foreground",
  seated: "border-border bg-secondary text-secondary-foreground",
  completed: "border-success/40 bg-success-subtle text-success-subtle-foreground",
};

type Bounds = { start: DateTime; end: DateTime; totalMinutes: number };

/** Ventana horaria a graficar: de la apertura del turno más temprano al cierre del
 *  más tardío, entre los turnos que aplican ese día de semana — redondeada a la hora
 *  para que la grilla arranque/termine en un número prolijo. */
function computeBounds(shifts: { dayOfWeek: number; startTime: string; endTime: string }[], date: string, timezone: string): Bounds | null {
  const dayOfWeek = DateTime.fromISO(date, { zone: timezone }).weekday % 7;
  const todays = shifts.filter((s) => s.dayOfWeek === dayOfWeek);
  if (todays.length === 0) return null;

  let start: DateTime | null = null;
  let end: DateTime | null = null;
  for (const shift of todays) {
    const wraps = shift.endTime <= shift.startTime;
    const shiftStart = DateTime.fromISO(`${date}T${shift.startTime.slice(0, 5)}`, { zone: timezone });
    const endDate = wraps ? DateTime.fromISO(date, { zone: timezone }).plus({ days: 1 }).toISODate()! : date;
    const shiftEnd = DateTime.fromISO(`${endDate}T${shift.endTime.slice(0, 5)}`, { zone: timezone });
    if (!start || shiftStart < start) start = shiftStart;
    if (!end || shiftEnd > end) end = shiftEnd;
  }
  if (!start || !end) return null;

  const boundsStart = start.set({ minute: 0, second: 0, millisecond: 0 });
  const boundsEnd = end.minute === 0 ? end : end.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 });
  return { start: boundsStart, end: boundsEnd, totalMinutes: boundsEnd.diff(boundsStart, "minutes").minutes };
}

function pct(minutesFromStart: number, totalMinutes: number): number {
  return Math.min(100, Math.max(0, (minutesFromStart / totalMinutes) * 100));
}

export default function TimelinePage() {
  const [date, setDate] = useState(() => DateTime.now().toISODate()!);
  const [zoneId, setZoneId] = useState<string>(ANY_ZONE);
  const [blockingMesa, setBlockingMesa] = useState<Mesa | null>(null);

  const settings = useSettings();
  const zones = useZones();
  const mesas = useMesas();
  const shifts = useShifts();
  const timeline = useTimeline(date);
  const deleteBlock = useDeleteMesaBlock();

  const timezone = settings.data?.restaurant.timezone ?? "America/Argentina/Buenos_Aires";
  const zoneName = (id: string) => zones.data?.zones.find((z) => z.id === id)?.name ?? "—";

  const isPending = settings.isPending || zones.isPending || mesas.isPending || shifts.isPending || timeline.isPending;
  const isError = settings.isError || zones.isError || mesas.isError || shifts.isError || timeline.isError;

  function unblock(block: MesaBlock) {
    deleteBlock.mutate(block.id, {
      onSuccess: () => toast.success("Mesa desbloqueada"),
      onError: () => toast.error("No se pudo desbloquear"),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-foreground">Mapa de mesas</h1>
        <p className="text-sm text-muted-foreground">Quién está sentado dónde, a lo largo del día.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? ANY_ZONE)}>
          <SelectTrigger className="w-auto">
            <SelectValue>{zoneId === ANY_ZONE ? "Todas las zonas" : zoneName(zoneId)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_ZONE}>Todas las zonas</SelectItem>
            {zones.data?.zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : isError ? (
        <ErrorState title="No se pudo cargar el mapa de mesas" />
      ) : mesas.data!.mesas.length === 0 ? (
        <EmptyState title="Todavía no hay mesas" description="Cargalas en Configuración → Mesas para poder verlas acá." />
      ) : (
        <TimelineGrid
          date={date}
          timezone={timezone}
          mesas={mesas.data!.mesas.filter((m) => zoneId === ANY_ZONE || m.zoneId === zoneId)}
          shifts={shifts.data!.shifts}
          occupied={timeline.data!.occupied}
          blocks={timeline.data!.blocks}
          zoneName={zoneName}
          onBlock={setBlockingMesa}
          onUnblock={unblock}
        />
      )}

      {blockingMesa ? (
        <BlockMesaDialog
          mesa={blockingMesa}
          date={date}
          existingReservations={timeline.data?.occupied.filter((o) => o.mesaId === blockingMesa.id).length ?? 0}
          onClose={() => setBlockingMesa(null)}
        />
      ) : null}
    </div>
  );
}

function TimelineGrid({
  date,
  timezone,
  mesas,
  shifts,
  occupied,
  blocks,
  zoneName,
  onBlock,
  onUnblock,
}: {
  date: string;
  timezone: string;
  mesas: Mesa[];
  shifts: { dayOfWeek: number; startTime: string; endTime: string }[];
  occupied: TimelineOccupied[];
  blocks: MesaBlock[];
  zoneName: (id: string) => string;
  onBlock: (mesa: Mesa) => void;
  onUnblock: (block: MesaBlock) => void;
}) {
  const bounds = computeBounds(shifts, date, timezone);
  if (!bounds) {
    return <EmptyState title="Sin turnos este día" description="No hay ningún turno configurado para este día de la semana." />;
  }

  const sortedMesas = [...mesas].sort((a, b) => a.name.localeCompare(b.name));
  const trackWidth = bounds.totalMinutes * PX_PER_MINUTE;
  const hourTicks: DateTime[] = [];
  for (let t = bounds.start; t <= bounds.end; t = t.plus({ hours: 1 })) hourTicks.push(t);

  const now = DateTime.now().setZone(timezone);
  const showNowLine = DateTime.now().setZone(timezone).toISODate() === date && now >= bounds.start && now <= bounds.end;
  const nowPct = showNowLine ? pct(now.diff(bounds.start, "minutes").minutes, bounds.totalMinutes) : null;

  const gridLineStyle = {
    backgroundImage: `repeating-linear-gradient(to right, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${
      60 * PX_PER_MINUTE
    }px)`,
  };

  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      <div className="w-40 shrink-0 divide-y divide-border border-r border-border">
        <div className="h-8 bg-secondary/40" />
        {sortedMesas.map((mesa) => (
          <div key={mesa.id} className="flex h-14 flex-col justify-center px-3">
            <span className="text-sm font-medium text-foreground">{mesa.name}</span>
            <span className="text-xs text-muted-foreground">
              {zoneName(mesa.zoneId)} · {mesa.minCapacity}–{mesa.maxCapacity} pers.
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="relative divide-y divide-border" style={{ width: trackWidth }}>
          <div className="relative h-8 bg-secondary/40">
            {hourTicks.map((t, i) => {
              const tickPct = pct(t.diff(bounds.start, "minutes").minutes, bounds.totalMinutes);
              const edgeTransform = i === 0 ? "" : i === hourTicks.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span
                  key={t.toISO()}
                  className={`absolute top-1/2 -translate-y-1/2 px-1 text-xs text-muted-foreground ${edgeTransform}`}
                  style={{ left: tickPct + "%" }}
                >
                  {t.toFormat("HH:mm")}
                </span>
              );
            })}
          </div>

          {sortedMesas.map((mesa) => {
            const block = blocks.find((b) => b.mesaId === mesa.id);
            const mesaOccupied = occupied.filter((o) => o.mesaId === mesa.id);
            return (
              <div key={mesa.id} className="relative h-14" style={gridLineStyle}>
                {block ? (
                  <div
                    className="absolute inset-1 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-xs text-destructive"
                    title={block.note ?? undefined}
                  >
                    <span className="font-medium">Bloqueada</span>
                    {block.note ? <span className="truncate text-destructive/80">— {block.note}</span> : null}
                  </div>
                ) : (
                  mesaOccupied.map((r) => {
                    const start = DateTime.fromISO(r.startsAt).setZone(timezone);
                    const end = DateTime.fromISO(r.endsAt).setZone(timezone);
                    const left = pct(start.diff(bounds.start, "minutes").minutes, bounds.totalMinutes);
                    const width = pct(end.diff(start, "minutes").minutes, bounds.totalMinutes);
                    return (
                      <div
                        key={r.reservationId}
                        className={`absolute inset-y-1 overflow-hidden rounded-md border px-2 py-1 text-xs ${STATUS_BLOCK_CLASS[r.status] ?? "border-border bg-muted"}`}
                        style={{ left: left + "%", width: width + "%" }}
                        title={`${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")} · ${r.customerName ?? "Sin nombre"} · ${r.partySize} pers.`}
                      >
                        <span className="block truncate font-medium">
                          {start.toFormat("HH:mm")} {r.customerName ?? "Sin nombre"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}

          {nowPct != null ? (
            <div className="absolute top-0 bottom-0 w-px bg-destructive" style={{ left: nowPct + "%" }} />
          ) : null}
        </div>
      </div>

      <div className="w-36 shrink-0 divide-y divide-border border-l border-border">
        <div className="h-8 bg-secondary/40" />
        {sortedMesas.map((mesa) => {
          const block = blocks.find((b) => b.mesaId === mesa.id);
          return (
            <div key={mesa.id} className="flex h-14 items-center justify-center px-2">
              {block ? (
                <Button size="sm" variant="ghost" onClick={() => onUnblock(block)}>
                  Desbloquear
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onBlock(mesa)}>
                  Bloquear este día
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockMesaDialog({
  mesa,
  date,
  existingReservations,
  onClose,
}: {
  mesa: Mesa;
  date: string;
  existingReservations: number;
  onClose: () => void;
}) {
  const createBlock = useCreateMesaBlock();
  const [note, setNote] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createBlock.mutate(
      { mesaId: mesa.id, date, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`"${mesa.name}" bloqueada para el ${date}`);
          onClose();
        },
        onError: (err) => {
          const message = err instanceof Error && err.message === "already_blocked" ? "Esa mesa ya está bloqueada ese día" : "No se pudo bloquear";
          toast.error(message);
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Bloquear &quot;{mesa.name}&quot;</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            No se va a poder asignar esta mesa a ninguna reserva nueva el {date}. Se puede desbloquear en cualquier momento.
          </p>
          {existingReservations > 0 ? (
            <p className="rounded-md border border-warning bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground">
              Ya hay {existingReservations} reserva{existingReservations > 1 ? "s" : ""} activa{existingReservations > 1 ? "s" : ""} en esta
              mesa ese día — no se cancelan solas, pero no vas a poder asignar más mientras esté bloqueada.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="block-note">Motivo (opcional)</Label>
            <Textarea
              id="block-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: mesa rota, evento privado"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={createBlock.isPending}>
              Bloquear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
