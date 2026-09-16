import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

let instance: Database | null = null;

/**
 * Construye el cliente la primera vez que se lo usa, no cuando se importa el
 * módulo.
 *
 * El motivo es concreto: `next build` importa cada `route.ts` para recolectar
 * su configuración. Si la validación de `DATABASE_URL` vive en el cuerpo del
 * módulo, la compilación exige que la variable esté definida — y compilar no
 * debería necesitar una base de datos. Adentro de la imagen no hay `.env` (ni
 * debe haberlo: es un secreto), así que el build fallaba.
 *
 * Validar en el primer uso mantiene el mismo mensaje de error claro en tiempo
 * de ejecución, que es cuando la variable hace falta de verdad.
 */
function getDb(): Database {
  if (instance) return instance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida (revisá tu .env)");
  }

  instance = drizzle(new Pool({ connectionString }), { schema });
  return instance;
}

/**
 * Se exporta un Proxy para no tener que cambiar los ~40 lugares que ya hacen
 * `db.select(...)`: cada acceso a una propiedad dispara `getDb()`. Los métodos
 * se devuelven ligados a la instancia real para que `this` siga apuntando bien.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});
