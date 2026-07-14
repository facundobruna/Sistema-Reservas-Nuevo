"use client";

import { useState, type FormEvent } from "react";
import { DateTime } from "luxon";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";
import { normalizeArPhone } from "@/lib/validation/phone";
import { useCreateReservation, useZones } from "../_lib/resources";

const NO_ZONE = "__any__";

function todayIn(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate()!;
}

function nowIn(timezone: string): string {
  return DateTime.now().setZone(timezone).toFormat("HH:mm");
}

export function WalkInDialog({ open, onOpenChange, timezone }: { open: boolean; onOpenChange: (v: boolean) => void; timezone: string }) {
  const zones = useZones();
  const createReservation = useCreateReservation();

  const [date, setDate] = useState(() => todayIn(timezone));
  const [time, setTime] = useState(() => nowIn(timezone));
  const [partySize, setPartySize] = useState("2");
  const [zoneId, setZoneId] = useState(NO_ZONE);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [seated, setSeated] = useState(true);

  function reset() {
    setDate(todayIn(timezone));
    setTime(nowIn(timezone));
    setPartySize("2");
    setZoneId(NO_ZONE);
    setName("");
    setPhone("");
    setSeated(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const startsAt = DateTime.fromISO(`${date}T${time}`, { zone: timezone }).toUTC().toISO();
    if (!startsAt) return;

    createReservation.mutate(
      {
        startsAt,
        partySize: Number(partySize),
        zoneId: zoneId === NO_ZONE ? undefined : zoneId,
        seated,
        customer: { phone: normalizeArPhone(phone), name },
      },
      {
        onSuccess: () => {
          toast.success("Reserva creada");
          onOpenChange(false);
          reset();
        },
        onError: (err) => {
          const message = err instanceof Error && err.message === "slot_unavailable"
            ? "No hay mesa disponible para ese horario y cantidad de personas"
            : "No se pudo crear la reserva";
          toast.error(message);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md!">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nueva reserva manual</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-date">Fecha</Label>
              <Input id="walkin-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-time">Hora</Label>
              <Input id="walkin-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="walkin-size">Personas</Label>
              <Input
                id="walkin-size"
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="walkin-zone">Zona</Label>
              <Select value={zoneId} onValueChange={(v) => setZoneId(v ?? NO_ZONE)}>
                <SelectTrigger id="walkin-zone" className="w-full">
                  <SelectValue>
                    {zoneId === NO_ZONE ? "Cualquiera" : zones.data?.zones.find((z) => z.id === zoneId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ZONE}>Cualquiera</SelectItem>
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
            <Label htmlFor="walkin-name">Nombre</Label>
            <Input id="walkin-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="walkin-phone">Teléfono</Label>
            <Input
              id="walkin-phone"
              type="tel"
              placeholder="11 2222-3333"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={(e) => setPhone(normalizeArPhone(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="walkin-seated" className="text-sm font-normal text-muted-foreground">
              Ya están sentados (walk-in)
            </Label>
            <Switch id="walkin-seated" checked={seated} onCheckedChange={setSeated} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createReservation.isPending}>
              Crear reserva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
