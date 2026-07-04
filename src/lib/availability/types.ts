export type SeatingMode = "rolling" | "fixed";
export type ExceptionKind = "closed" | "special_hours";

export type ShiftInput = {
  id: string;
  serviceId: string;
  /** null = aplica a todas las zonas */
  zoneId: string | null;
  /** 0=domingo .. 6=sábado */
  dayOfWeek: number;
  /** "HH:MM" o "HH:MM:SS" */
  startTime: string;
  endTime: string;
  slotIntervalMin: number;
  turnDurationMin: number;
  seatingMode: SeatingMode;
  fixedTimes: string[] | null;
  pacingCap: number | null;
};

export type SeatingUnitInput = {
  id: string;
  /** zona derivada de sus mesas (todas las mesas de una unidad comparten zona) */
  zoneId: string;
  minCapacity: number;
  maxCapacity: number;
  mesaIds: string[];
};

export type ActiveReservationInput = {
  mesaIds: string[];
  /** ISO instant (UTC) */
  startsAt: string;
  /** ISO instant (UTC) */
  endsAt: string;
  partySize: number;
};

export type ScheduleExceptionInput = {
  kind: ExceptionKind;
  startTime: string | null;
  endTime: string | null;
};

export type ComputeAvailabilityInput = {
  /** "YYYY-MM-DD", fecha local del restaurante (no UTC) */
  date: string;
  partySize: number;
  zoneId?: string;
  /** IANA timezone del restaurante */
  timezone: string;
  shifts: ShiftInput[];
  seatingUnits: SeatingUnitInput[];
  activeReservations: ActiveReservationInput[];
  exception: ScheduleExceptionInput | null;
};

export type AvailabilitySlot = {
  /** ISO instant (UTC) */
  time: string;
  serviceId: string;
};
