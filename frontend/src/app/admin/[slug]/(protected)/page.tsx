"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DateTime } from "luxon";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { WalkInDialog } from "../_components/walk-in-dialog";
import {
  useAllSeatingUnits,
  useMesas,
  useReservations,
  useSettings,
  useUpdateReservation,
  useZones,
  type AgendaReservation,
  type ReservationStatus,
} from "../_lib/resources";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  seated: "Sentados",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No se presentó",
};

const STATUS_BADGE_VARIANT: Record<ReservationStatus, "warning" | "accent" | "secondary" | "success" | "destructive"> = {
  pending: "warning",
  confirmed: "accent",
  seated: "secondary",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
};

const NEXT_ACTIONS: Record<ReservationStatus, { label: string; to: ReservationStatus }[]> = {
  pending: [
    { label: "Confirmar", to: "confirmed" },
    { label: "Sentar", to: "seated" },
    { label: "Cancelar", to: "cancelled" },
    { label: "No show", to: "no_show" },
  ],
  confirmed: [
    { label: "Sentar", to: "seated" },
    { label: "Cancelar", to: "cancelled" },
    { label: "No show", to: "no_show" },
  ],
  seated: [
    { label: "Completar", to: "completed" },
    { label: "Cancelar", to: "cancelled" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

const ALL_STATUS = "__all__";
const ANY_ZONE = "__any__";

export default function AgendaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [date, setDate] = useState(() => DateTime.now().toISODate()!);
  const [status, setStatus] = useState<string>(ALL_STATUS);
  const [zoneId, setZoneId] = useState<string>(ANY_ZONE);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [reassigning, setReassigning] = useState<AgendaReservation | null>(null);

  const settings = useSettings();
  const zones = useZones();
  const mesas = useMesas();
  const reservations = useReservations({
    date,
    status: status === ALL_STATUS ? undefined : (status as ReservationStatus),
    zoneId: zoneId === ANY_ZONE ? undefined : zoneId,
  });
  const updateReservation = useUpdateReservation();

  const timezone = settings.data?.restaurant.timezone ?? "America/Argentina/Buenos_Aires";
  const zoneName = (id: string | null) => (id ? zones.data?.zones.find((z) => z.id === id)?.name ?? "—" : "—");

  function changeStatus(id: string, to: ReservationStatus) {
    updateReservation.mutate(
      { id, status: to },
      {
        onSuccess: () => toast.success(`Reserva actualizada a "${STATUS_LABEL[to]}"`),
        onError: () => toast.error("No se pudo cambiar el estado"),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">Reservas del día, con su estado y su mesa.</p>
        </div>
        <Button size="sm" onClick={() => setWalkInOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Nueva reserva
        </Button>
      </div>

      {mesas.data && mesas.data.mesas.length === 0 ? (
        <div className="rounded-lg border border-warning bg-warning-subtle px-4 py-3 text-sm text-warning-subtle-foreground">
          Todavía no cargaste mesas — sin mesas no hay horarios para ofrecer.{" "}
          <Link href={`/admin/${slug}/mesas`} className="font-medium underline underline-offset-2">
            Agregalas en Configuración → Mesas
          </Link>
          .
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Select value={status} onValueChange={(v) => setStatus(v ?? ALL_STATUS)}>
          <SelectTrigger className="w-auto">
            <SelectValue>{status === ALL_STATUS ? "Todos los estados" : STATUS_LABEL[status as ReservationStatus]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS}>Todos los estados</SelectItem>
            {(Object.keys(STATUS_LABEL) as ReservationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {reservations.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : reservations.isError ? (
        <ErrorState
          title="No se pudieron cargar las reservas"
          action={
            <Button size="sm" variant="outline" onClick={() => reservations.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : reservations.data.reservations.length === 0 ? (
        <EmptyState
          title="No hay reservas para este día"
          description="Cuando alguien reserve, o cargues una manual, va a aparecer acá."
          action={
            <Button size="sm" onClick={() => setWalkInOpen(true)}>
              Cargar una reserva
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {reservations.data.reservations.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {DateTime.fromISO(r.startsAt).setZone(timezone).toFormat("HH:mm")}
                  </span>
                  <span className="text-sm text-foreground">{r.customerName || "Sin nombre"}</span>
                  <Badge variant={STATUS_BADGE_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  {r.confirmedByDinerAt ? (
                    <Badge variant="success" title="El comensal reconfirmó que viene">
                      Reconfirmó
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.customerPhone} · {r.partySize} personas · {zoneName(r.zoneId)}
                  {r.specialRequests ? ` · "${r.specialRequests}"` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {NEXT_ACTIONS[r.status].map((action) => (
                  <Button
                    key={action.to}
                    size="sm"
                    variant="outline"
                    onClick={() => changeStatus(r.id, action.to)}
                    disabled={updateReservation.isPending}
                  >
                    {action.label}
                  </Button>
                ))}
                {r.status !== "completed" && r.status !== "cancelled" && r.status !== "no_show" ? (
                  <Button size="sm" variant="ghost" onClick={() => setReassigning(r)}>
                    Cambiar mesa
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <WalkInDialog open={walkInOpen} onOpenChange={setWalkInOpen} timezone={timezone} />
      {reassigning ? (
        <ReassignDialog reservation={reassigning} onClose={() => setReassigning(null)} />
      ) : null}
    </div>
  );
}

function ReassignDialog({ reservation, onClose }: { reservation: AgendaReservation; onClose: () => void }) {
  const units = useAllSeatingUnits();
  const updateReservation = useUpdateReservation();
  const [selected, setSelected] = useState(reservation.seatingUnitId ?? "");

  const eligible = units.data?.seatingUnits.filter((u) => reservation.partySize >= u.minCapacity && reservation.partySize <= u.maxCapacity) ?? [];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateReservation.mutate(
      { id: reservation.id, seatingUnitId: selected },
      {
        onSuccess: () => {
          toast.success("Mesa reasignada");
          onClose();
        },
        onError: (err) => {
          const message =
            err instanceof Error && err.message === "conflict"
              ? "Esa mesa ya está ocupada en ese horario"
              : "No se pudo reasignar";
          toast.error(message);
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Cambiar mesa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí una mesa o combo" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.minCapacity}-{u.maxCapacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!selected || updateReservation.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
