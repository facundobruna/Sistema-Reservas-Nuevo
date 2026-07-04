import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";
import { createMesa } from "./mesa";
import { hashPassword } from "../lib/auth/password";

const DEMO_SLUG = "demo";
const DEMO_OWNER_PASSWORD = "demo1234";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida (revisá tu .env)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log(`Sembrando datos de demo (slug="${DEMO_SLUG}")...`);

  // Idempotente: si ya existe el restaurante demo, lo borramos (cascada)
  // y lo recreamos desde cero.
  await db.delete(schema.restaurant).where(eq(schema.restaurant.slug, DEMO_SLUG));

  const [restaurant] = await db
    .insert(schema.restaurant)
    .values({
      slug: DEMO_SLUG,
      name: "Fuego Norte",
      timezone: "America/Argentina/Buenos_Aires",
      settings: { reminderHoursBefore: 3 },
    })
    .returning();

  const [salon, terraza] = await db
    .insert(schema.zone)
    .values([
      { restaurantId: restaurant.id, name: "Salón principal", position: 0 },
      { restaurantId: restaurant.id, name: "Terraza", position: 1 },
    ])
    .returning();

  const mesasInput = [
    { zone: salon, name: "S1", min: 2, max: 2 },
    { zone: salon, name: "S2", min: 2, max: 2 },
    { zone: salon, name: "S3", min: 2, max: 4 },
    { zone: salon, name: "S4", min: 2, max: 4 },
    { zone: salon, name: "S5", min: 4, max: 6 },
    { zone: terraza, name: "T1", min: 2, max: 2 },
    { zone: terraza, name: "T2", min: 2, max: 4 },
    { zone: terraza, name: "T3", min: 4, max: 8 },
  ];

  const mesas: Record<string, Awaited<ReturnType<typeof createMesa>>> = {};
  for (const m of mesasInput) {
    const created = await createMesa(db, {
      restaurantId: restaurant.id,
      zoneId: m.zone.id,
      name: m.name,
      minCapacity: m.min,
      maxCapacity: m.max,
    });
    mesas[m.name] = created;
  }

  // Combos: enlazan mesas contiguas para grupos grandes.
  const [comboS3S4] = await db
    .insert(schema.seatingUnit)
    .values({
      restaurantId: restaurant.id,
      name: "S3+S4",
      kind: "combo",
      minCapacity: 6,
      maxCapacity: 8,
    })
    .returning();
  await db.insert(schema.seatingUnitMesa).values([
    { seatingUnitId: comboS3S4.id, mesaId: mesas["S3"].mesa.id },
    { seatingUnitId: comboS3S4.id, mesaId: mesas["S4"].mesa.id },
  ]);

  const [comboT2T3] = await db
    .insert(schema.seatingUnit)
    .values({
      restaurantId: restaurant.id,
      name: "T2+T3",
      kind: "combo",
      minCapacity: 8,
      maxCapacity: 12,
    })
    .returning();
  await db.insert(schema.seatingUnitMesa).values([
    { seatingUnitId: comboT2T3.id, mesaId: mesas["T2"].mesa.id },
    { seatingUnitId: comboT2T3.id, mesaId: mesas["T3"].mesa.id },
  ]);

  const [almuerzo, cena] = await db
    .insert(schema.service)
    .values([
      { restaurantId: restaurant.id, name: "Almuerzo", position: 0 },
      { restaurantId: restaurant.id, name: "Cena", position: 1 },
    ])
    .returning();

  // Abierto martes a domingo (cerrado los lunes). 0=domingo..6=sábado.
  const openDays = [0, 2, 3, 4, 5, 6];

  await db.insert(schema.shift).values(
    openDays.map((day) => ({
      restaurantId: restaurant.id,
      serviceId: almuerzo.id,
      dayOfWeek: day,
      startTime: "12:00",
      endTime: "15:30",
      slotIntervalMin: 15,
      turnDurationMin: 90,
      seatingMode: "rolling" as const,
      pacingCap: 30,
    })),
  );

  await db.insert(schema.shift).values(
    openDays.map((day) => ({
      restaurantId: restaurant.id,
      serviceId: cena.id,
      dayOfWeek: day,
      startTime: "20:00",
      endTime: "23:30",
      turnDurationMin: 120,
      seatingMode: "fixed" as const,
      fixedTimes: ["20:00", "20:30", "21:00", "21:30", "22:00", "22:30"],
      pacingCap: 40,
    })),
  );

  await db.insert(schema.scheduleException).values({
    restaurantId: restaurant.id,
    date: "2026-07-20",
    kind: "closed",
    note: "Cierre por evento privado",
  });

  await db.insert(schema.staffUser).values({
    restaurantId: restaurant.id,
    email: "owner@fuegonorte.demo",
    name: "Dueño Demo",
    role: "owner",
    passwordHash: hashPassword(DEMO_OWNER_PASSWORD),
  });

  await pool.end();

  console.log("Listo. Restaurante demo:");
  console.log(`  slug: ${restaurant.slug}`);
  console.log(`  zonas: ${salon.name}, ${terraza.name}`);
  console.log(`  mesas: ${mesasInput.length} + 2 combos`);
  console.log(`  servicios: ${almuerzo.name}, ${cena.name}`);
  console.log(`  panel: /admin/${restaurant.slug}/login`);
  console.log(`  login: owner@fuegonorte.demo / ${DEMO_OWNER_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
