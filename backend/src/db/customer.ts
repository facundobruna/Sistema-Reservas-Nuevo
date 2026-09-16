import { eq } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { customer, customerRestaurant } from "./schema";

export type FindOrCreateCustomerInput = {
  phone: string;
  name?: string;
  email?: string;
};

/**
 * El comensal es una identidad global por teléfono (E.164), compartida entre
 * restaurantes. `customer_restaurant` es la mirada de ESTE restaurante sobre
 * ese comensal (no-show/visitas) y se crea en el primer contacto.
 */
export async function findOrCreateCustomer(
  db: typeof dbClient,
  restaurantId: string,
  input: FindOrCreateCustomerInput,
) {
  return db.transaction(async (trx) => {
    const [existing] = await trx.select().from(customer).where(eq(customer.phone, input.phone)).limit(1);

    let record = existing;
    if (!record) {
      [record] = await trx
        .insert(customer)
        .values({ phone: input.phone, name: input.name, email: input.email })
        .returning();
    } else if ((!record.email && input.email) || (!record.name && input.name)) {
      // Completa datos que faltaban (ej. reservó una vez sin email y ahora sí lo dio) —
      // nunca pisa un valor que ya tenía.
      [record] = await trx
        .update(customer)
        .set({ email: record.email ?? input.email, name: record.name ?? input.name })
        .where(eq(customer.id, record.id))
        .returning();
    }

    await trx
      .insert(customerRestaurant)
      .values({ restaurantId, customerId: record.id })
      .onConflictDoNothing({ target: [customerRestaurant.restaurantId, customerRestaurant.customerId] });

    return record;
  });
}

export async function getCustomerByPhone(db: typeof dbClient, phone: string) {
  const [row] = await db.select().from(customer).where(eq(customer.phone, phone)).limit(1);
  return row ?? null;
}
