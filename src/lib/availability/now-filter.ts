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
