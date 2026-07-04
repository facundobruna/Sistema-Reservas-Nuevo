"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import { useCreateService, useDeleteService, useServices, useUpdateService, type Service } from "../../_lib/resources";

export default function ServicesPage() {
  const { data, isPending, isError, refetch } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setName(service.name);
    setOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      updateService.mutate(
        { id: editing.id, name },
        {
          onSuccess: () => {
            toast.success("Servicio actualizado");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo actualizar el servicio"),
        },
      );
    } else {
      createService.mutate(
        { name, position: data?.services.length ?? 0 },
        {
          onSuccess: () => {
            toast.success("Servicio creado");
            setOpen(false);
          },
          onError: () => toast.error("No se pudo crear el servicio"),
        },
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-display-sm text-foreground">Servicios</h1>
          <p className="text-sm text-muted-foreground">Ej. Almuerzo, Cena. Cada turno pertenece a un servicio.</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />
          Nuevo servicio
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
          title="No se pudieron cargar los servicios"
          action={
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : data.services.length === 0 ? (
        <EmptyState
          title="Todavía no hay servicios"
          description="Creá al menos un servicio (ej. Almuerzo) antes de armar los turnos."
          action={
            <Button size="sm" onClick={openCreate}>
              Crear el primer servicio
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {data.services.map((service) => (
            <li key={service.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground">{service.name}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                  Editar
                </Button>
                <ConfirmDeleteButton
                  itemLabel={`"${service.name}"`}
                  onConfirm={() =>
                    deleteService.mutate(service.id, {
                      onSuccess: () => toast.success("Servicio borrado"),
                      onError: () => toast.error("No se pudo borrar (¿tiene turnos asociados?)"),
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
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-4">
              <Label htmlFor="service-name">Nombre</Label>
              <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                {editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
