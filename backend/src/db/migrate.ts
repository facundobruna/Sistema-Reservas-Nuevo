import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida (revisá tu .env)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migraciones aplicadas.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
