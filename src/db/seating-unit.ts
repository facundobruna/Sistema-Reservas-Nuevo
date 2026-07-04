import { and, eq, inArray } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { mesa, seatingUnit, seatingUnitMesa } from "./schema";

export type CreateComboInput = {
  restaurantId: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  mesaIds: string[];
  active?: boolean;
};

async function assertMesasOwnedByRestaurant(
  trx: Parameters<Parameters<typeof dbClient.transaction>[0]>[0],
  restaurantId: string,
  mesaIds: string[],
): Promise<boolean> {
  const rows = await trx
    .select({ id: mesa.id })
    .from(mesa)
    .where(and(inArray(mesa.id, mesaIds), eq(mesa.restaurantId, restaurantId)));
  return rows.length === mesaIds.length;
}

export async function createCombo(db: typeof dbClient, input: CreateComboInput) {
  return db.transaction(async (trx) => {
    const ownsAll = await assertMesasOwnedByRestaurant(trx, input.restaurantId, input.mesaIds);
    if (!ownsAll) return { error: "invalid_mesa_ids" as const };

    const [unit] = await trx
      .insert(seatingUnit)
      .values({
        restaurantId: input.restaurantId,
        name: input.name,
        kind: "combo",
        minCapacity: input.minCapacity,
        maxCapacity: input.maxCapacity,
        active: input.active ?? true,
      })
      .returning();

    await trx.insert(seatingUnitMesa).values(
      input.mesaIds.map((mesaId) => ({ seatingUnitId: unit.id, mesaId })),
    );

    return { seatingUnit: unit };
  });
}

export type UpdateComboInput = {
  name?: string;
  minCapacity?: number;
  maxCapacity?: number;
  active?: boolean;
  mesaIds?: string[];
};

export async function updateCombo(
  db: typeof dbClient,
  restaurantId: string,
  seatingUnitId: string,
  input: UpdateComboInput,
) {
  return db.transaction(async (trx) => {
    if (input.mesaIds) {
      const ownsAll = await assertMesasOwnedByRestaurant(trx, restaurantId, input.mesaIds);
      if (!ownsAll) return { error: "invalid_mesa_ids" as const };
    }

    const { mesaIds, ...rest } = input;
    const [updated] = await trx
      .update(seatingUnit)
      .set(rest)
      .where(
        and(
          eq(seatingUnit.id, seatingUnitId),
          eq(seatingUnit.restaurantId, restaurantId),
          eq(seatingUnit.kind, "combo"),
        ),
      )
      .returning();

    if (!updated) return { error: "not_found" as const };

    if (mesaIds) {
      await trx.delete(seatingUnitMesa).where(eq(seatingUnitMesa.seatingUnitId, seatingUnitId));
      await trx.insert(seatingUnitMesa).values(mesaIds.map((mesaId) => ({ seatingUnitId, mesaId })));
    }

    return { seatingUnit: updated };
  });
}
