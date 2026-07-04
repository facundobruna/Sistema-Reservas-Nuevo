"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useSettings, useUpdateSettings, type Restaurant } from "../../_lib/resources";

export default function SettingsPage() {
  const { data, isPending, isError, refetch } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-sm text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">Datos generales del restaurante.</p>
      </div>

      {isPending ? (
        <Skeleton className="h-64 w-full max-w-md rounded-lg" />
      ) : isError ? (
        <ErrorState
          title="No se pudo cargar la configuración"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <SettingsForm restaurant={data.restaurant} />
      )}
    </div>
  );
}

function SettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const updateSettings = useUpdateSettings();
  const initialSettings = restaurant.settings as { reminderHoursBefore?: number };

  const [name, setName] = useState(restaurant.name);
  const [timezone, setTimezone] = useState(restaurant.timezone);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(
    String(initialSettings.reminderHoursBefore ?? 3),
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateSettings.mutate(
      { name, timezone, settings: { reminderHoursBefore: Number(reminderHoursBefore) } },
      {
        onSuccess: () => toast.success("Configuración guardada"),
        onError: () => toast.error("No se pudo guardar la configuración"),
      },
    );
  }

  return (
    <Card className="max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Nombre del restaurante</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-tz">Zona horaria</Label>
            <Input
              id="settings-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Argentina/Buenos_Aires"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-reminder">Recordatorio — horas antes de la reserva</Label>
            <Input
              id="settings-reminder"
              type="number"
              min={0}
              max={72}
              value={reminderHoursBefore}
              onChange={(e) => setReminderHoursBefore(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={updateSettings.isPending}>
            Guardar cambios
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
