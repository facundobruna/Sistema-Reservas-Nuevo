import type { db as dbClient } from "./client";
import { mesa, seatingUnit, seatingUnitMesa } from "./schema";

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
