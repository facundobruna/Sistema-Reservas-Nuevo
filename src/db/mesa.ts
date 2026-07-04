import { and, eq } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { mesa, seatingUnit, seatingUnitMesa } from "./schema";

/** Busca la seating_unit 'single' auto-generada de una mesa (1:1). */
async function findSingleUnitId(
  trx: Parameters<Parameters<typeof dbClient.transaction>[0]>[0],
  mesaId: string,
): Promise<string | null> {
  const [row] = await trx
    .select({ id: seatingUnit.id })
    .from(seatingUnitMesa)
    .innerJoin(seatingUnit, eq(seatingUnit.id, seatingUnitMesa.seatingUnitId))
    .where(and(eq(seatingUnitMesa.mesaId, mesaId), eq(seatingUnit.kind, "single")))
    .limit(1);
  return row?.id ?? null;
}

export type CreateMesaInput = {
  restaurantId: string;
  zoneId: string;
  name: string;
  minCapacity?: number;
  maxCapacity: number;
  active?: boolean;
};

/**
 * Crea una mesa y, en la misma transacción, su seating_unit 'single' +
 * la fila de enlace en seating_unit_mesa. El motor de disponibilidad
 * opera siempre sobre seating_unit, nunca sobre mesa directamente.
 */
export async function createMesa(db: typeof dbClient, input: CreateMesaInput) {
  return db.transaction(async (trx) => {
    const [newMesa] = await trx
      .insert(mesa)
      .values({
        restaurantId: input.restaurantId,
        zoneId: input.zoneId,
        name: input.name,
        minCapacity: input.minCapacity ?? 1,
        maxCapacity: input.maxCapacity,
        active: input.active ?? true,
      })
      .returning();

    const [unit] = await trx
      .insert(seatingUnit)
      .values({
        restaurantId: newMesa.restaurantId,
        name: newMesa.name,
        kind: "single",
        minCapacity: newMesa.minCapacity,
        maxCapacity: newMesa.maxCapacity,
        active: newMesa.active,
      })
      .returning();

    await trx.insert(seatingUnitMesa).values({
      seatingUnitId: unit.id,
      mesaId: newMesa.id,
    });

    return { mesa: newMesa, seatingUnit: unit };
  });
}

export type UpdateMesaInput = {
  zoneId?: string;
  name?: string;
  minCapacity?: number;
  maxCapacity?: number;
  active?: boolean;
};

/**
 * Actualiza una mesa y mantiene su seating_unit 'single' en sincro (mismo
 * nombre/capacidad/estado) — el motor de disponibilidad depende de que la
 * unidad refleje siempre los datos actuales de la mesa.
 */
export async function updateMesa(
  db: typeof dbClient,
  restaurantId: string,
  mesaId: string,
  input: UpdateMesaInput,
) {
  return db.transaction(async (trx) => {
    const [updated] = await trx
      .update(mesa)
      .set(input)
      .where(and(eq(mesa.id, mesaId), eq(mesa.restaurantId, restaurantId)))
      .returning();

    if (!updated) return null;

    const unitId = await findSingleUnitId(trx, mesaId);
    if (unitId) {
      await trx
        .update(seatingUnit)
        .set({
          name: updated.name,
          minCapacity: updated.minCapacity,
          maxCapacity: updated.maxCapacity,
          active: updated.active,
        })
        .where(eq(seatingUnit.id, unitId));
    }

    return updated;
  });
}

/**
 * Borra una mesa. Su seating_unit 'single' se limpia sola vía trigger de DB
 * (mesa_delete_cleanup_single_unit), que cubre este camino y cualquier otro
 * borrado en cascada (ej. al borrar la zona) — no solo el que pasa por acá.
 */
export async function deleteMesa(db: typeof dbClient, restaurantId: string, mesaId: string) {
  const [deleted] = await db
    .delete(mesa)
    .where(and(eq(mesa.id, mesaId), eq(mesa.restaurantId, restaurantId)))
    .returning();

  return deleted ?? null;
}
