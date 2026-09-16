"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/error-state";
import {
  useImpersonateTenant,
  useReactivateTenant,
  useSuspendTenant,
  useTenantDetail,
  useToggleFeatureFlag,
  type SubscriptionStatus,
} from "../../../_lib/resources";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Prueba",
  active: "Activa",
  past_due: "Pago vencido",
  canceled: "Cancelada",
};

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useTenantDetail(id);

  if (detail.isPending) {
    return <Skeleton className="h-96 w-full max-w-xl rounded-lg" />;
  }
  if (detail.isError) {
    return (
      <ErrorState
        title="No se pudo cargar el tenant"
        action={
          <Button size="sm" variant="outline" onClick={() => detail.refetch()}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return <TenantDetailContent id={id} data={detail.data} />;
}

function TenantDetailContent({
  id,
  data,
}: {
  id: string;
  data: NonNullable<ReturnType<typeof useTenantDetail>["data"]>;
}) {
  const router = useRouter();
  const { restaurant, subscription } = data;
  const suspendMutation = useSuspendTenant();
  const reactivateMutation = useReactivateTenant();
  const impersonateMutation = useImpersonateTenant();
  const toggleFlag = useToggleFeatureFlag(id);

  const [newFlagName, setNewFlagName] = useState("");

  function handleImpersonate() {
    impersonateMutation.mutate(id, {
      onSuccess: (result) => {
        router.push(`/admin/${result.slug}`);
      },
      onError: () => toast.error("No se pudo impersonar (¿el restaurante tiene un owner?)"),
    });
  }

  function handleAddFlag(event: FormEvent) {
    event.preventDefault();
    const flag = newFlagName.trim();
    if (!flag) return;
    toggleFlag.mutate(
      { flag, enabled: true },
      {
        onSuccess: () => setNewFlagName(""),
        onError: () => toast.error("No se pudo agregar el flag"),
      },
    );
  }

  const flags = restaurant.settings.featureFlags ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground">/r/{restaurant.slug}</p>
        </div>
        {restaurant.suspendedAt ? <Badge variant="destructive">Suspendido</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription ? (
            <div className="text-sm text-muted-foreground">
              <p>
                Estado: <span className="font-medium text-foreground">{STATUS_LABEL[subscription.status]}</span>
              </p>
              {subscription.status === "trialing" && subscription.trialEndsAt ? (
                <p>Prueba hasta el {DateTime.fromISO(subscription.trialEndsAt).toFormat("dd/LL/yyyy")}</p>
              ) : null}
              {subscription.currentPeriodEnd ? (
                <p>Próximo cobro: {DateTime.fromISO(subscription.currentPeriodEnd).toFormat("dd/LL/yyyy")}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin suscripción registrada.</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" disabled={impersonateMutation.isPending} onClick={handleImpersonate}>
              Impersonar
            </Button>

            {restaurant.suspendedAt ? (
              <Button
                size="sm"
                variant="outline"
                disabled={reactivateMutation.isPending}
                onClick={() =>
                  reactivateMutation.mutate(id, {
                    onSuccess: () => toast.success("Restaurante reactivado"),
                    onError: () => toast.error("No se pudo reactivar"),
                  })
                }
              >
                Reactivar
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>Suspender</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Suspender {restaurant.name}?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        suspendMutation.mutate(id, {
                          onSuccess: () => toast.success("Restaurante suspendido"),
                          onError: () => toast.error("No se pudo suspender"),
                        })
                      }
                    >
                      Suspender
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.keys(flags).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin flags configurados.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(flags).map(([flag, enabled]) => (
                <li key={flag} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{flag}</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleFlag.mutate({ flag, enabled: v })}
                  />
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleAddFlag} className="flex items-end gap-2 pt-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-flag">Nuevo flag</Label>
              <Input id="new-flag" value={newFlagName} onChange={(e) => setNewFlagName(e.target.value)} placeholder="nombre-del-flag" />
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={toggleFlag.isPending}>
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
