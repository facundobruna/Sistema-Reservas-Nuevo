/**
 * Política de cancelación: clasifica una cancelación según cuánto falta para
 * la reserva. Sirve para que el panel distinga las cancelaciones tardías (que
 * el local no alcanza a reponer) de las que avisan con tiempo.
 *
 *  - "free":        se canceló con al menos `freeHours` de anticipación.
 *  - "late":        se canceló con menos anticipación que esa, pero antes de la hora.
 *  - "after_start": se canceló cuando la reserva ya había empezado (o pasado).
 */
export type CancellationKind = "free" | "late" | "after_start";

const MS_PER_HOUR = 60 * 60 * 1000;

export function classifyCancellation(
  startsAt: Date,
  cancelledAt: Date,
  freeHours = 24,
): CancellationKind {
  if (freeHours < 0) {
    throw new Error("freeHours no puede ser negativo");
  }
  const msUntilStart = startsAt.getTime() - cancelledAt.getTime();
  if (msUntilStart <= 0) return "after_start";
  if (msUntilStart >= freeHours * MS_PER_HOUR) return "free";
  return "late";
}
