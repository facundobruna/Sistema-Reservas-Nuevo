import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  mesa,
  reservationStatusEnum,
  restaurant,
  scheduleException,
  seatingUnit,
  service,
  shift,
  zone,
} from "@/db/schema";
import { useCreateResource, useDeleteResource, useResourceList, useUpdateResource } from "./api";

export type Zone = typeof zone.$inferSelect;
export type Mesa = typeof mesa.$inferSelect;
export type SeatingUnit = typeof seatingUnit.$inferSelect & { mesaIds: string[] };
export type Service = typeof service.$inferSelect;
export type Shift = typeof shift.$inferSelect;
export type ScheduleException = typeof scheduleException.$inferSelect;
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];

// --- Zones -------------------------------------------------------------------

export const useZones = () => useResourceList<{ zones: Zone[] }>("zones", "/admin/zones");
export const useCreateZone = () =>
  useCreateResource<{ name: string; position?: number }, { zone: Zone }>("zones", "/admin/zones");
export const useUpdateZone = () =>
  useUpdateResource<{ id: string; name?: string; position?: number }, { zone: Zone }>(
    "zones",
    "/admin/zones",
  );
export const useDeleteZone = () => useDeleteResource("zones", "/admin/zones");

// --- Mesas -----------------------------------------------------------------

export type MesaInput = {
  zoneId: string;
  name: string;
  minCapacity?: number;
  maxCapacity: number;
  active?: boolean;
};

export const useMesas = () => useResourceList<{ mesas: Mesa[] }>("mesas", "/admin/mesas");
export const useCreateMesa = () => useCreateResource<MesaInput, { mesa: Mesa }>("mesas", "/admin/mesas");
export const useUpdateMesa = () =>
  useUpdateResource<Partial<MesaInput> & { id: string }, { mesa: Mesa }>("mesas", "/admin/mesas");
export const useDeleteMesa = () => useDeleteResource("mesas", "/admin/mesas");

// --- Seating units (combos) -------------------------------------------------

export type ComboInput = {
  name: string;
  minCapacity: number;
  maxCapacity: number;
  mesaIds: string[];
  active?: boolean;
};

export const useSeatingUnits = () =>
  useResourceList<{ seatingUnits: SeatingUnit[] }>("seating-units", "/admin/seating-units");
export const useCreateCombo = () =>
  useCreateResource<ComboInput, { seatingUnit: SeatingUnit }>("seating-units", "/admin/seating-units");
export const useUpdateCombo = () =>
  useUpdateResource<Partial<ComboInput> & { id: string }, { seatingUnit: SeatingUnit }>(
    "seating-units",
    "/admin/seating-units",
  );
export const useDeleteCombo = () => useDeleteResource("seating-units", "/admin/seating-units");

async function fetchAllSeatingUnits(): Promise<{ seatingUnits: SeatingUnit[] }> {
  const res = await fetch("/api/v1/admin/seating-units?all=true");
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

/** Todas las unidades (single + combo) — para el picker de "reasignar mesa" en la agenda. */
export const useAllSeatingUnits = () =>
  useQuery({ queryKey: ["seating-units", "all"], queryFn: fetchAllSeatingUnits });

// --- Services ----------------------------------------------------------------

export const useServices = () => useResourceList<{ services: Service[] }>("services", "/admin/services");
export const useCreateService = () =>
  useCreateResource<{ name: string; position?: number }, { service: Service }>(
    "services",
    "/admin/services",
  );
export const useUpdateService = () =>
  useUpdateResource<{ id: string; name?: string; position?: number }, { service: Service }>(
    "services",
    "/admin/services",
  );
export const useDeleteService = () => useDeleteResource("services", "/admin/services");

// --- Shifts ------------------------------------------------------------------

export type ShiftInput = {
  serviceId: string;
  zoneId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMin?: number;
  turnDurationMin?: number;
  seatingMode?: "rolling" | "fixed";
  fixedTimes?: string[];
  pacingCap?: number | null;
  bufferMin?: number;
  overbookingPercent?: number;
};

export const useShifts = () => useResourceList<{ shifts: Shift[] }>("shifts", "/admin/shifts");
export const useCreateShift = () =>
  useCreateResource<ShiftInput, { shift: Shift }>("shifts", "/admin/shifts");
export const useUpdateShift = () =>
  useUpdateResource<Partial<ShiftInput> & { id: string }, { shift: Shift }>("shifts", "/admin/shifts");
export const useDeleteShift = () => useDeleteResource("shifts", "/admin/shifts");

// --- Exceptions --------------------------------------------------------------

export type ExceptionInput = {
  date: string;
  kind: "closed" | "special_hours";
  startTime?: string;
  endTime?: string;
  note?: string;
};

export const useExceptions = () =>
  useResourceList<{ exceptions: ScheduleException[] }>("exceptions", "/admin/exceptions");
export const useCreateException = () =>
  useCreateResource<ExceptionInput, { exception: ScheduleException }>("exceptions", "/admin/exceptions");
export const useUpdateException = () =>
  useUpdateResource<Partial<ExceptionInput> & { id: string }, { exception: ScheduleException }>(
    "exceptions",
    "/admin/exceptions",
  );
export const useDeleteException = () => useDeleteResource("exceptions", "/admin/exceptions");

// --- Settings ------------------------------------------------------------------

export type Restaurant = typeof restaurant.$inferSelect;

export type SettingsInput = {
  name?: string;
  timezone?: string;
  settings?: { reminderHoursBefore?: number; accentColor?: string };
};

async function fetchSettings(): Promise<{ restaurant: Restaurant }> {
  const res = await fetch("/api/v1/admin/settings");
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export const useSettings = () => useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettingsInput) => {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("request_failed");
      return res.json() as Promise<{ restaurant: Restaurant }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
};

// --- Reservations (agenda) -----------------------------------------------------

export type AgendaReservation = {
  id: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  status: ReservationStatus;
  specialRequests: string | null;
  source: "web" | "whatsapp" | "manual";
  zoneId: string | null;
  seatingUnitId: string | null;
  customerId: string;
  customerName: string | null;
  customerPhone: string;
};

export type ReservationFilters = { date?: string; status?: ReservationStatus; zoneId?: string };

async function fetchReservations(filters: ReservationFilters): Promise<{ reservations: AgendaReservation[] }> {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.status) params.set("status", filters.status);
  if (filters.zoneId) params.set("zoneId", filters.zoneId);
  const res = await fetch(`/api/v1/admin/reservations?${params.toString()}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export const useReservations = (filters: ReservationFilters) =>
  useQuery({ queryKey: ["reservations", filters], queryFn: () => fetchReservations(filters) });

export type ReservationCreateInput = {
  startsAt: string;
  partySize: number;
  zoneId?: string;
  specialRequests?: string;
  seated?: boolean;
  customer: { phone: string; name: string; email?: string };
};

async function postJson(path: string, method: "POST" | "PATCH", body: unknown) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? "request_failed");
  }
  return res.json();
}

export const useCreateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReservationCreateInput) => postJson("/api/v1/admin/reservations", "POST", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });
};

export type ReservationUpdateInput = {
  id: string;
  status?: ReservationStatus;
  seatingUnitId?: string;
  specialRequests?: string;
};

export const useUpdateReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ReservationUpdateInput) =>
      postJson(`/api/v1/admin/reservations/${id}`, "PATCH", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });
};

// --- Customers (mínimo) ---------------------------------------------------------

export type AgendaCustomer = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  noShowCount: number;
  visitCount: number;
};

async function fetchCustomers(search: string): Promise<{ customers: AgendaCustomer[] }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(`/api/v1/admin/customers?${params.toString()}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export const useCustomers = (search: string) =>
  useQuery({ queryKey: ["customers", search], queryFn: () => fetchCustomers(search) });

// --- Stats mínimo ------------------------------------------------------------

export type Stats = { entradas: number; cumplidas: number; canceladas: number; no_show: number };

async function fetchStats(from: string, to: string): Promise<{ from: string; to: string; stats: Stats }> {
  const res = await fetch(`/api/v1/admin/stats?from=${from}&to=${to}`);
  if (!res.ok) throw new Error("request_failed");
  return res.json();
}

export const useStats = (from: string, to: string) =>
  useQuery({ queryKey: ["stats", from, to], queryFn: () => fetchStats(from, to) });
