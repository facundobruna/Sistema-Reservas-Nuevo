"use client";

import { useState, type FormEvent } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useRegenerateCalendarToken, useSettings, useUpdateSettings, type Restaurant } from "../../_lib/resources";

type RestaurantSettings = {
  reminderHoursBefore?: number;
  minAdvanceMinutes?: number;
  maxAdvanceDays?: number | null;
  maxOnlinePartySize?: number | null;
  largeGroupPhone?: string;
  autoNoShowMinutes?: number | null;
  notifyEmail?: string;
};

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
        <div className="max-w-md space-y-4">
          <SettingsForm restaurant={data.restaurant} ownerEmail={data.ownerEmail} />
          <CalendarCard calendarUrl={data.calendarUrl} />
        </div>
      )}
    </div>
  );
}

function SettingsForm({ restaurant, ownerEmail }: { restaurant: Restaurant; ownerEmail: string | null }) {
  const updateSettings = useUpdateSettings();
  const initialSettings = restaurant.settings as RestaurantSettings;

  const [name, setName] = useState(restaurant.name);
  const [timezone, setTimezone] = useState(restaurant.timezone);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(String(initialSettings.reminderHoursBefore ?? 3));
  const [minAdvanceMinutes, setMinAdvanceMinutes] = useState(String(initialSettings.minAdvanceMinutes ?? 0));
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    initialSettings.maxAdvanceDays == null ? "" : String(initialSettings.maxAdvanceDays),
  );
  const [maxOnlinePartySize, setMaxOnlinePartySize] = useState(
    initialSettings.maxOnlinePartySize == null ? "" : String(initialSettings.maxOnlinePartySize),
  );
  const [largeGroupPhone, setLargeGroupPhone] = useState(initialSettings.largeGroupPhone ?? "");
  const [autoNoShowMinutes, setAutoNoShowMinutes] = useState(
    initialSettings.autoNoShowMinutes == null ? "" : String(initialSettings.autoNoShowMinutes),
  );
  const [notifyEmail, setNotifyEmail] = useState(initialSettings.notifyEmail ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateSettings.mutate(
      {
        name,
        timezone,
        settings: {
          reminderHoursBefore: Number(reminderHoursBefore),
          minAdvanceMinutes: Number(minAdvanceMinutes),
          maxAdvanceDays: maxAdvanceDays === "" ? null : Number(maxAdvanceDays),
          maxOnlinePartySize: maxOnlinePartySize === "" ? null : Number(maxOnlinePartySize),
          largeGroupPhone,
          autoNoShowMinutes: autoNoShowMinutes === "" ? null : Number(autoNoShowMinutes),
          notifyEmail,
        },
      },
      {
        onSuccess: () => toast.success("Configuración guardada"),
        onError: () => toast.error("No se pudo guardar la configuración"),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
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
          <div className="space-y-1.5">
            <Label htmlFor="settings-auto-noshow">No-show automático — minutos después del horario (opcional)</Label>
            <Input
              id="settings-auto-noshow"
              type="number"
              min={1}
              placeholder="Desactivado"
              value={autoNoShowMinutes}
              onChange={(e) => setAutoNoShowMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-notify-email">Email para avisos de reservas nuevas/canceladas</Label>
            <Input
              id="settings-notify-email"
              type="email"
              placeholder={ownerEmail ? `Por default: ${ownerEmail}` : "owner@turestaurante.com"}
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Se manda cuando un comensal reserva o cancela por su cuenta — no en walk-ins ni reservas cargadas a
              mano desde el panel.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ventana de reserva online</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="settings-min-advance">Anticipación mínima (min)</Label>
              <Input
                id="settings-min-advance"
                type="number"
                min={0}
                value={minAdvanceMinutes}
                onChange={(e) => setMinAdvanceMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-max-advance">Anticipación máxima (días)</Label>
              <Input
                id="settings-max-advance"
                type="number"
                min={1}
                placeholder="Sin límite"
                value={maxAdvanceDays}
                onChange={(e) => setMaxAdvanceDays(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Solo afecta el autoservicio online — walk-ins y reservas manuales del panel no tienen este límite.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos grandes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="settings-max-party">Tope de personas para reservar online</Label>
            <Input
              id="settings-max-party"
              type="number"
              min={1}
              placeholder="Sin límite"
              value={maxOnlinePartySize}
              onChange={(e) => setMaxOnlinePartySize(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-large-phone">Teléfono para grupos más grandes</Label>
            <Input
              id="settings-large-phone"
              type="tel"
              placeholder="+5491122223333"
              value={largeGroupPhone}
              onChange={(e) => setLargeGroupPhone(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateSettings.isPending}>
        Guardar cambios
      </Button>
    </form>
  );
}

function CalendarCard({ calendarUrl }: { calendarUrl: string }) {
  const regenerate = useRegenerateCalendarToken();
  const [url, setUrl] = useState(calendarUrl);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Copiado al portapapeles"),
      () => toast.error("No se pudo copiar"),
    );
  }

  function handleRegenerate() {
    regenerate.mutate(undefined, {
      onSuccess: (data) => {
        setUrl(data.calendarUrl);
        toast.success("Link regenerado — el anterior dejó de funcionar");
      },
      onError: () => toast.error("No se pudo regenerar el link"),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendario</CardTitle>
        <CardDescription>
          Suscribite desde Google Calendar, Outlook o Apple Calendar para ver las reservas del restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button type="button" size="icon" variant="outline" onClick={handleCopy} aria-label="Copiar">
            <Copy className="size-4" />
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" size="sm" variant="outline" className="gap-1.5">
                <RefreshCw className="size-4" />
                Regenerar link
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Regenerar el link del calendario?</AlertDialogTitle>
              <AlertDialogDescription>
                El link anterior deja de funcionar al toque — quien esté suscripto con el viejo va a tener que
                suscribirse de nuevo con el nuevo link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRegenerate}>Regenerar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
