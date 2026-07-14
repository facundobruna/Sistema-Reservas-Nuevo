import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";
import { hashPassword } from "../lib/auth/password";

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
}

async function main() {
  const email = readArg("email");
  const password = readArg("password");
  const name = readArg("name");

  if (!email || !password || !name) {
    console.error(
      'Uso: pnpm superadmin:create -- --email=vos@ejemplo.com --password=algo-seguro --name="Tu nombre"',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña necesita al menos 8 caracteres.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida (revisá tu .env)");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const [existing] = await db
    .select({ id: schema.superadminUser.id })
    .from(schema.superadminUser)
    .where(eq(schema.superadminUser.email, email))
    .limit(1);
  if (existing) {
    console.error(`Ya existe un superadmin con el email ${email}.`);
    await pool.end();
    process.exit(1);
  }

  await db.insert(schema.superadminUser).values({ email, name, passwordHash: hashPassword(password) });

  console.log(`Superadmin creado: ${email}`);
  console.log("Login en /superadmin/login");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
