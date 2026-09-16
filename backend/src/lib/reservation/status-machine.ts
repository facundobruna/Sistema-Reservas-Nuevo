export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * pending → confirmed → seated → completed. cancelled se puede pedir desde
 * cualquier estado activo; no_show solo antes de sentarse (una vez seated,
 * ya sabemos que vinieron). completed/cancelled/no_show son terminales.
 */
const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "seated", "cancelled", "no_show"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
