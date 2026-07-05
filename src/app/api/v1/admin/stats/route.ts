import { and, eq, gte, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { reservation, restaurant } from "@/db/schema";
import { requireStaffSession } from "@/lib/auth/require-staff";
import { statsQuerySchema } from "@/lib/validation/admin";

export async function GET(request: Request) {
  const auth = await requireStaffSession();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = statsQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const [restaurantRow] = await db
    .select({ timezone: restaurant.timezone })
    .from(restaurant)
    .where(eq(restaurant.id, auth.session.restaurantId))
    .limit(1);
  if (!restaurantRow) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rangeStart = DateTime.fromISO(parsed.data.from, { zone: restaurantRow.timezone }).startOf("day");
  const rangeEnd = DateTime.fromISO(parsed.data.to, { zone: restaurantRow.timezone }).endOf("day");

  const rows = await db
    .select({ status: reservation.status })
    .from(reservation)
    .where(
      and(
        eq(reservation.restaurantId, auth.session.restaurantId),
        gte(reservation.startsAt, rangeStart.toJSDate()),
        lt(reservation.startsAt, rangeEnd.toJSDate()),
      ),
    );

  const stats = {
    entradas: rows.length,
    cumplidas: rows.filter((r) => r.status === "completed").length,
    canceladas: rows.filter((r) => r.status === "cancelled").length,
    no_show: rows.filter((r) => r.status === "no_show").length,
  };

  return NextResponse.json({ from: parsed.data.from, to: parsed.data.to, stats });
}
