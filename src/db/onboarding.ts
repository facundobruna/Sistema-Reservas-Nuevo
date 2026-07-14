import type { db as dbClient } from "./client";
import { restaurant, service, shift, staffUser, zone } from "./schema";
import { createTrialSubscription } from "./subscription";
import { hashPassword } from "../lib/auth/password";
import type { OnboardingInput } from "../lib/validation/onboarding";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Alta self-serve: restaurante + zona + turnos típicos + owner, todo en una
 * transacción. Deliberadamente NO crea mesas (el alta tiene que ser rápida);
 * sin mesas el motor no ofrece horarios reales hasta que el dueño las cargue.
 */
export async function createRestaurantOnboarding(db: typeof dbClient, input: OnboardingInput) {
  return db.transaction(async (trx) => {
    const [newRestaurant] = await trx
      .insert(restaurant)
      .values({ slug: input.slug, name: input.restaurantName, timezone: input.timezone })
      .returning();

    await trx.insert(zone).values({ restaurantId: newRestaurant.id, name: "Salón principal", position: 0 });
    await createTrialSubscription(trx, newRestaurant.id);

    const presets: { key: "lunch" | "dinner"; name: string; position: number }[] = [
      { key: "lunch", name: "Almuerzo", position: 0 },
      { key: "dinner", name: "Cena", position: 1 },
    ];

    for (const preset of presets) {
      const config = input.shifts[preset.key];
      if (!config.enabled) continue;

      const [createdService] = await trx
        .insert(service)
        .values({ restaurantId: newRestaurant.id, name: preset.name, position: preset.position })
        .returning();

      await trx.insert(shift).values(
        ALL_DAYS.map((day) => ({
          restaurantId: newRestaurant.id,
          serviceId: createdService.id,
          dayOfWeek: day,
          startTime: config.startTime,
          endTime: config.endTime,
          slotIntervalMin: 15,
          turnDurationMin: 90,
          seatingMode: "rolling" as const,
        })),
      );
    }

    const [owner] = await trx
      .insert(staffUser)
      .values({
        restaurantId: newRestaurant.id,
        email: input.ownerEmail,
        name: input.ownerName,
        role: "owner",
        passwordHash: hashPassword(input.password),
      })
      .returning();

    return { restaurant: newRestaurant, owner };
  });
}
