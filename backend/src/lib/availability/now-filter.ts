import type { AvailabilitySlot } from "./types";

/**
 * El motor genera candidatos a partir de la configuración del turno, sin
 * noción de "ahora" (es a propósito: lo mantiene puro y testeable). Filtrar
 * los horarios ya pasados es responsabilidad de quien llama, para hoy mismo.
 */
export function isPast(isoInstant: string, now: Date = new Date()): boolean {
  return new Date(isoInstant).getTime() < now.getTime();
}

export function excludePastSlots(slots: AvailabilitySlot[], now: Date = new Date()): AvailabilitySlot[] {
  return slots.filter((slot) => !isPast(slot.time, now));
}

export type BookingWindow = { minAdvanceMinutes?: number; maxAdvanceDays?: number | null };

/**
 * Ventana de reserva del flujo online del comensal — no aplica a lo que carga
 * el staff a mano (un walk-in es, por definición, "ahora mismo"; una reserva
 * telefónica puede ser para dentro de mucho). Mismo motivo que isPast: el
 * motor puro no tiene noción de "ahora", esto es responsabilidad de quien llama.
 */
export function isWithinBookingWindow(isoInstant: string, now: Date, window: BookingWindow): boolean {
  const target = new Date(isoInstant).getTime();
  const minMs = (window.minAdvanceMinutes ?? 0) * 60_000;
  if (target < now.getTime() + minMs) return false;

  if (window.maxAdvanceDays != null) {
    const maxMs = window.maxAdvanceDays * 24 * 60 * 60_000;
    if (target > now.getTime() + maxMs) return false;
  }

  return true;
}

export function filterWithinBookingWindow(
  slots: AvailabilitySlot[],
  now: Date,
  window: BookingWindow,
): AvailabilitySlot[] {
  return slots.filter((slot) => isWithinBookingWindow(slot.time, now, window));
}
