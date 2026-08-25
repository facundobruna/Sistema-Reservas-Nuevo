import { and, eq } from "drizzle-orm";
import type { db as dbClient } from "./client";
import { mesa, mesaBlock } from "./schema";

const UNIQUE_VIOLATION = "23505";

function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const candidate = err as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return pgErrorCode(candidate.cause);
}

export type CreateMesaBlockResult =
  | { ok: true; block: typeof mesaBlock.$inferSelect }
  | { ok: false; error: "invalid_mesa" | "already_blocked" };

export async function createMesaBlock(
  db: typeof dbClient,
  restaurantId: string,
  input: { mesaId: string; date: string; note?: string },
): Promise<CreateMesaBlockResult> {
  const [mesaRow] = await db
    .select({ id: mesa.id })
    .from(mesa)
    .where(and(eq(mesa.id, input.mesaId), eq(mesa.restaurantId, restaurantId)))
    .limit(1);
  if (!mesaRow) return { ok: false, error: "invalid_mesa" };

  try {
    const [block] = await db
      .insert(mesaBlock)
      .values({ restaurantId, mesaId: input.mesaId, date: input.date, note: input.note })
      .returning();
    return { ok: true, block };
  } catch (err) {
    if (pgErrorCode(err) === UNIQUE_VIOLATION) return { ok: false, error: "already_blocked" };
    throw err;
  }
}

export async function deleteMesaBlock(db: typeof dbClient, restaurantId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(mesaBlock)
    .where(and(eq(mesaBlock.id, id), eq(mesaBlock.restaurantId, restaurantId)))
    .returning({ id: mesaBlock.id });
  return deleted.length > 0;
}
