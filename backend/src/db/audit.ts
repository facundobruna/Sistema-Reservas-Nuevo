import type { db as dbClient } from "./client";
import { auditLog } from "./schema";

export type AuditAction = "impersonate_start" | "suspend_restaurant" | "reactivate_restaurant" | "toggle_feature_flag";

/** Toda acción de superadmin pasa por acá — "acceso restringido y auditado". */
export async function logAudit(
  db: typeof dbClient,
  params: { superadminId: string; action: AuditAction; targetRestaurantId?: string; metadata?: Record<string, unknown> },
) {
  await db.insert(auditLog).values({
    superadminId: params.superadminId,
    action: params.action,
    targetRestaurantId: params.targetRestaurantId,
    metadata: params.metadata ?? {},
  });
}
