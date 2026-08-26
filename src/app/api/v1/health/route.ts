import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Nunca cachear: el healthcheck tiene que reflejar el estado de ahora.
export const dynamic = "force-dynamic";

/**
 * Endpoint de salud. Lo consume el healthcheck del contenedor (docker-compose)
 * y, más adelante, el pipeline de despliegue para saber si un environment quedó
 * arriba. Comprueba que el proceso responde Y que la base contesta: una app que
 * sirve HTTP pero no puede consultar la base no está sana.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
